import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Users, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Download,
  Calendar,
  LayoutDashboard,
  Search,
  MoreVertical,
  Brain,
  Sparkles,
  ChevronDown,
  Zap,
  Lightbulb,
  AlertCircle,
  TrendingDown,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from 'recharts';

// Helper for tailwind class merging
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
const formatNumber = (val) => new Intl.NumberFormat('en-US').format(val);

const App = () => {
  const [data, setData] = useState([]);
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    profit: 0,
    aov: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showTester, setShowTester] = useState(false);
  
  // AI Insights state
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    dateStart: '',
    dateEnd: '',
    product: 'All Products',
    channel: 'All Channels'
  });

  const testGemini = async () => {
    setIsTesting(true);
    setTestResponse('Thinking...');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setTestResponse('Error: VITE_GEMINI_API_KEY not found in .env');
        return;
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: "This is a test to verify the Gemini API connection. Respond with 'API Connection Successful!' and a one-sentence compliment for the developer." }]
          }]
        })
      });
      
      const result = await response.json();
      if (result.error) {
        setTestResponse(`API Error: ${result.error.message}`);
      } else {
        setTestResponse(result.candidates?.[0]?.content?.parts?.[0]?.text || "No response from model");
      }
    } catch (error) {
      setTestResponse("Fetch Error: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const generateAiInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setAiInsights({ error: 'API Key missing. Please add VITE_GEMINI_API_KEY to your .env file.' });
        return;
      }

      const summary = {
        totalRevenue: currentStats.revenue,
        totalOrders: currentStats.orders,
        aov: currentStats.aov,
        topProduct: productData[0]?.name,
        topChannel: channelData[0]?.name,
        period: `${filters.dateStart || 'start'} to ${filters.dateEnd || 'today'}`
      };

      const prompt = `As a business analyst, analyze these metrics: ${JSON.stringify(summary)}. 
      Return structured insights in JSON format with exactly three arrays: "alerts", "opportunities", and "suggestions". 
      Each insight should be a short, clear sentence. Keep it professional but simple. 
      Format: {"alerts": [], "opportunities": [], "suggestions": []}`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { response_mime_type: "application/json" }
        })
      });

      const result = await response.json();
      const content = JSON.parse(result.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
      setAiInsights(content);
    } catch (error) {
      setAiInsights({ error: 'Failed to generate insights. Check your connection.' });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  useEffect(() => {
    const fetchFromApi = async () => {
      try {
        const response = await fetch('/api/sales');
        if (!response.ok) throw new Error('API request failed');
        const parsedData = await response.json();
        setData(parsedData.filter(row => row.date)); // Filter empty rows
        setLoading(false);
      } catch (error) {
        console.error('Error fetching from API:', error);
        // Fallback to CSV if API fails (useful for local static testing)
        try {
          const response = await fetch('/data/sales_data.csv');
          const reader = response.body.getReader();
          const result = await reader.read();
          const decoder = new TextDecoder('utf-8');
          const csvText = decoder.decode(result.value);
          
          Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            complete: (results) => {
              const parsedData = results.data.filter(row => row.date);
              setData(parsedData);
              setLoading(false);
            }
          });
        } catch (csvError) {
          console.error('Fatal error fetching data:', csvError);
          setLoading(false);
        }
      }
    };

    fetchFromApi();
  }, []);

  // Filtered data logic
  const filteredData = React.useMemo(() => {
    return data.filter(row => {
      const matchDate = (!filters.dateStart || row.date >= filters.dateStart) && 
                        (!filters.dateEnd || row.date <= filters.dateEnd);
      const matchProduct = filters.product === 'All Products' || row.product === filters.product;
      const matchChannel = filters.channel === 'All Channels' || row.channel === filters.channel;
      return matchDate && matchProduct && matchChannel;
    });
  }, [data, filters]);

  // Derived stats
  const currentStats = React.useMemo(() => {
    const revenue = filteredData.reduce((sum, row) => sum + (row.revenue || 0), 0);
    const orders = filteredData.reduce((sum, row) => sum + (row.orders || 0), 0);
    const cost = filteredData.reduce((sum, row) => sum + (row.cost || 0), 0);
    return {
      revenue,
      orders,
      profit: revenue - cost,
      aov: orders > 0 ? revenue / orders : 0
    };
  }, [filteredData]);

  // Chart data: Trend
  const trendData = React.useMemo(() => {
    const groups = filteredData.reduce((acc, row) => {
      acc[row.date] = (acc[row.date] || 0) + row.revenue;
      return acc;
    }, {});
    return Object.entries(groups).map(([date, revenue]) => ({ date, revenue })).sort((a,b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Chart data: Channel
  const channelData = React.useMemo(() => {
    const groups = filteredData.reduce((acc, row) => {
      acc[row.channel] = (acc[row.channel] || 0) + row.revenue;
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Chart data: Products
  const productData = React.useMemo(() => {
    const groups = filteredData.reduce((acc, row) => {
      acc[row.product] = (acc[row.product] || 0) + row.revenue;
      return acc;
    }, {});
    return Object.entries(groups)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a,b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredData]);

  const uniqueProducts = React.useMemo(() => ['All Products', ...new Set(data.map(d => d.product))], [data]);
  const uniqueChannels = React.useMemo(() => ['All Channels', ...new Set(data.map(d => d.channel))], [data]);

  // Insights data
  const highlights = React.useMemo(() => {
    if (!filteredData.length) return [];
    
    // Best Product
    const bestProd = productData[0];
    
    // Best Channel
    const bestChan = channelData.sort((a,b) => b.value - a.value)[0];
    
    // Peak Day
    const peakDay = trendData.sort((a,b) => b.revenue - a.revenue)[0];
    
    // Highest Conv Rate
    const convGroups = filteredData.reduce((acc, row) => {
      if (!acc[row.channel]) acc[row.channel] = { orders: 0, visitors: 0 };
      acc[row.channel].orders += (row.orders || 0);
      acc[row.channel].visitors += (row.visitors || 0);
      return acc;
    }, {});
    
    const bestConv = Object.entries(convGroups)
      .map(([name, stats]) => ({ name, rate: stats.visitors > 0 ? (stats.orders / stats.visitors) * 100 : 0 }))
      .sort((a,b) => b.rate - a.rate)[0];

    return [
      { label: 'Best Product', value: bestProd?.name, icon: <Zap size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Top Channel', value: bestChan?.name, icon: <Activity size={16} />, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Peak Revenue', value: peakDay?.date, icon: <TrendingUp size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Highest Conv.', value: `${bestConv?.name} (${bestConv?.rate.toFixed(1)}%)`, icon: <Lightbulb size={16} />, color: 'text-orange-600', bg: 'bg-orange-50' }
    ];
  }, [filteredData, productData, channelData, trendData]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F9FAFB]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 p-6 hidden lg:flex flex-col">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <LayoutDashboard size={22} />
          </div>
          <span className="font-bold text-xl tracking-tight">VibeDash</span>
        </div>
        
        <nav className="space-y-1.5 flex-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Overview" active />
          <NavItem icon={<ShoppingCart size={20} />} label="Orders" />
          <NavItem icon={<Users size={20} />} label="Customers" />
          <NavItem icon={<TrendingUp size={20} />} label="Analytics" />
          <NavItem icon={<Calendar size={20} />} label="Reports" />
        </nav>
        
        <div className="mt-auto pt-6 border-t border-gray-100">
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">Status</p>
            <p className="text-sm text-blue-900 font-medium">System operational</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-10 px-6 lg:px-10 py-5 flex items-center justify-between border-b border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Performance Dashboard</h1>
            <p className="text-gray-500 text-sm mt-0.5">Track your sales and revenue metrics in real-time.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative group hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search report..." 
                className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all w-64"
              />
            </div>
            
            {/* AI Model Selector */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 p-1 rounded-lg">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                <Brain size={16} />
              </div>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-sm font-medium focus:outline-none pr-6 cursor-pointer"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (New!)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (New!)</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite</option>
              </select>
            </div>

            <button 
              onClick={() => {
                setShowTester(true);
                testGemini();
              }}
              disabled={isTesting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
            >
              <Sparkles size={16} className={isTesting ? "animate-pulse" : ""} />
              {isTesting ? "Testing..." : "Test AI"}
            </button>

            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              <Download size={16} />
              Export
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
              New Report
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 group">
              <Calendar size={18} className="text-gray-400 group-focus-within:text-blue-500" />
              <input 
                type="date" 
                value={filters.dateStart}
                onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                className="text-sm font-medium focus:outline-none border-b border-transparent focus:border-blue-500 bg-transparent"
              />
              <span className="text-gray-300">to</span>
              <input 
                type="date" 
                value={filters.dateEnd}
                onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                className="text-sm font-medium focus:outline-none border-b border-transparent focus:border-blue-500 bg-transparent"
              />
            </div>
            
            <div className="h-6 w-px bg-gray-100 mx-2 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-gray-400" />
              <select 
                value={filters.product}
                onChange={(e) => setFilters(prev => ({ ...prev, product: e.target.value }))}
                className="text-sm font-medium focus:outline-none cursor-pointer bg-transparent"
              >
                {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ShoppingCart size={18} className="text-gray-400" />
              <select 
                value={filters.channel}
                onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
                className="text-sm font-medium focus:outline-none cursor-pointer bg-transparent"
              >
                {uniqueChannels.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button 
              onClick={() => setFilters({ dateStart: '', dateEnd: '', product: 'All Products', channel: 'All Channels' })}
              className="ml-auto text-xs font-semibold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
            >
              Reset Filters
            </button>
          </div>

          {/* Quick Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {highlights.map((h, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3"
              >
                <div className={cn("p-2 rounded-lg", h.bg, h.color)}>
                  {h.icon}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{h.value || 'N/A'}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* AI Insights Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                  <Brain size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">AI Business Insights</h3>
                  <p className="text-xs text-gray-500">Intelligent analysis using {selectedModel}</p>
                </div>
              </div>
              <button 
                onClick={generateAiInsights}
                disabled={isGeneratingInsights}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
              >
                {isGeneratingInsights ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Insights
                  </>
                )}
              </button>
            </div>
            
            <div className="p-6">
              {!aiInsights && !isGeneratingInsights && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
                    <Activity size={24} />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">Unlock Data Intelligence</h4>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Click the button above to generate AI-powered strategies, find hidden opportunities, and identify risks in your current data.
                  </p>
                </div>
              )}

              {aiInsights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {aiInsights.error ? (
                    <div className="col-span-3 p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-100">
                      {aiInsights.error}
                    </div>
                  ) : (
                    <>
                      <InsightList 
                        title="Alerts" 
                        items={aiInsights.alerts} 
                        icon={<AlertCircle size={16} className="text-red-500" />} 
                        bg="bg-red-50/50"
                      />
                      <InsightList 
                        title="Opportunities" 
                        items={aiInsights.opportunities} 
                        icon={<TrendingUp size={16} className="text-emerald-500" />} 
                        bg="bg-emerald-50/50"
                      />
                      <InsightList 
                        title="Suggestions" 
                        items={aiInsights.suggestions} 
                        icon={<Lightbulb size={16} className="text-blue-500" />} 
                        bg="bg-blue-50/50"
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">

            <StatCard 
              label="Total Revenue" 
              value={formatCurrency(currentStats.revenue)} 
              icon={<DollarSign className="text-blue-600" size={20} />} 
              trend="+12.5%" 
              trendType="up"
              color="bg-blue-50"
            />
            <StatCard 
              label="Total Orders" 
              value={formatNumber(currentStats.orders)} 
              icon={<ShoppingCart className="text-purple-600" size={20} />} 
              trend="+8.2%" 
              trendType="up"
              color="bg-purple-50"
            />
            <StatCard 
              label="Gross Profit" 
              value={formatCurrency(currentStats.profit)} 
              icon={<TrendingUp className="text-emerald-600" size={20} />} 
              trend="+14.1%" 
              trendType="up"
              color="bg-emerald-50"
            />
            <StatCard 
              label="Avg. Order Value" 
              value={formatCurrency(currentStats.aov)} 
              icon={<Users className="text-orange-600" size={20} />} 
              trend="-2.4%" 
              trendType="down"
              color="bg-orange-50"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-900">Revenue Trend</h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  Daily Revenue
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      minTickGap={30}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#9CA3AF', fontSize: 12 }}
                      tickFormatter={(val) => `$${val/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(val) => formatCurrency(val)}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">Revenue by Channel</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={channelData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {channelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-6">Top Products</h3>
              <div className="space-y-6">
                {productData.map((item, i) => (
                  <div key={item.name} className="relative">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-gray-700">{item.name}</span>
                      <span className="text-gray-900 font-bold">{formatCurrency(item.revenue)}</span>
                    </div>
                    <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.revenue / productData[0].revenue) * 100}%` }}
                        className="h-full bg-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table Container moved inside here or kept separate */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  Sales Transactions
                  <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">{filteredData.length} entries</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                    <Filter size={18} />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                    <MoreVertical size={18} />
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="bg-gray-50/30">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">Product</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">Channel</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredData.slice(0, 50).map((row, i) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={i} 
                        className="hover:bg-blue-50/30 transition-colors group"
                      >
                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">{row.date}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{row.product}</td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">{row.channel}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-600 font-bold text-right">{formatCurrency(row.revenue)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        
        {/* AI Test Modal/Overlay */}
        {showTester && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">AI Connection Test</h3>
                    <p className="text-xs text-gray-500">Model: {selectedModel}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTester(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical size={20} />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-gray-50 rounded-xl p-4 min-h-[100px] border border-gray-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {testResponse}
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  onClick={() => setShowTester(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
                <button 
                  onClick={testGemini}
                  disabled={isTesting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  Retry Test
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active = false }) => (
  <a 
    href="#" 
    className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all font-medium text-sm group",
      active 
        ? "bg-blue-50 text-blue-600" 
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    )}
  >
    <span className={cn("transition-colors", active ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")}>
      {icon}
    </span>
    {label}
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.6)]"></div>}
  </a>
);

const StatCard = ({ label, value, icon, trend, trendType, color }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm transition-all animate-in fade-in slide-in-from-bottom-5 duration-500"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
        {icon}
      </div>
      <div className={cn(
        "flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold",
        trendType === 'up' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      )}>
        {trendType === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {trend}
      </div>
    </div>
    <p className="text-gray-500 font-medium text-sm mb-1">{label}</p>
    <h4 className="text-2xl font-bold text-gray-900 tracking-tight">{value}</h4>
  </motion.div>
);

export default App;

const InsightList = ({ title, items, icon, bg }) => (
  <div className={cn("rounded-xl p-4 border border-gray-100", bg)}>
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
    </div>
    <ul className="space-y-3">
      {items?.map((item, i) => (
        <li key={i} className="flex gap-2 text-xs text-gray-700 leading-relaxed">
          <span className="text-gray-300 pointer-events-none">•</span>
          {item}
        </li>
      ))}
      {!items?.length && <li className="text-xs text-gray-400 italic">No specific {title.toLowerCase()} found.</li>}
    </ul>
  </div>
);
