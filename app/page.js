'use client';

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

export default function Dashboard() {
  const [data, setData] = useState([]);
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

  const generateAiInsights = async () => {
    setIsGeneratingInsights(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setAiInsights({ error: 'API Key missing. Please set NEXT_PUBLIC_GEMINI_API_KEY.' });
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
        setLoading(false);
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
      acc[row.date] = (acc[row.date] || 0) + (row.revenue || 0);
      return acc;
    }, {});
    return Object.entries(groups).map(([date, revenue]) => ({ date, revenue })).sort((a,b) => a.date.localeCompare(b.date));
  }, [filteredData]);

  // Chart data: Channel
  const channelData = React.useMemo(() => {
    const groups = filteredData.reduce((acc, row) => {
      acc[row.channel] = (acc[row.channel] || 0) + (row.revenue || 0);
      return acc;
    }, {});
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  // Chart data: Products
  const productData = React.useMemo(() => {
    const groups = filteredData.reduce((acc, row) => {
      acc[row.product] = (acc[row.product] || 0) + (row.revenue || 0);
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
    const bestChan = [...channelData].sort((a,b) => b.value - a.value)[0];
    
    // Peak Day
    const peakDay = [...trendData].sort((a,b) => b.revenue - a.revenue)[0];
    
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
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
              </select>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 group">
              <Calendar size={18} className="text-gray-400" />
              <input 
                type="date" 
                value={filters.dateStart}
                onChange={(e) => setFilters(prev => ({ ...prev, dateStart: e.target.value }))}
                className="text-sm font-medium focus:outline-none bg-transparent"
              />
              <span className="text-gray-300">to</span>
              <input 
                type="date" 
                value={filters.dateEnd}
                onChange={(e) => setFilters(prev => ({ ...prev, dateEnd: e.target.value }))}
                className="text-sm font-medium focus:outline-none bg-transparent"
              />
            </div>
            
            <select 
              value={filters.product}
              onChange={(e) => setFilters(prev => ({ ...prev, product: e.target.value }))}
              className="text-sm font-medium bg-transparent border border-gray-100 rounded-lg p-1"
            >
              {uniqueProducts.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select 
              value={filters.channel}
              onChange={(e) => setFilters(prev => ({ ...prev, channel: e.target.value }))}
              className="text-sm font-medium bg-transparent border border-gray-100 rounded-lg p-1"
            >
              {uniqueChannels.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button 
              onClick={() => setFilters({ dateStart: '', dateEnd: '', product: 'All Products', channel: 'All Channels' })}
              className="ml-auto text-xs font-semibold text-blue-600 uppercase tracking-tight"
            >
              Reset
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {highlights.map((h, i) => (
              <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", h.bg, h.color)}>{h.icon}</div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">{h.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate max-w-[120px]">{h.value || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>

          {/* AI Panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent">
              <div className="flex items-center gap-3">
                <Brain className="text-blue-600" />
                <h3 className="font-bold text-gray-900">AI Business Insights</h3>
              </div>
              <button 
                onClick={generateAiInsights}
                disabled={isGeneratingInsights}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {isGeneratingInsights ? "Analyzing..." : "Generate Insights"}
              </button>
            </div>
            <div className="p-6">
              {aiInsights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <InsightList title="Alerts" items={aiInsights.alerts} icon={<AlertCircle size={16} className="text-red-500" />} bg="bg-red-50/50" />
                  <InsightList title="Opportunities" items={aiInsights.opportunities} icon={<TrendingUp size={16} className="text-emerald-500" />} bg="bg-emerald-50/50" />
                  <InsightList title="Suggestions" items={aiInsights.suggestions} icon={<Lightbulb size={16} className="text-blue-500" />} bg="bg-blue-50/50" />
                </div>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard label="Total Revenue" value={formatCurrency(currentStats.revenue)} icon={<DollarSign size={20} />} color="bg-blue-50 text-blue-600" />
            <StatCard label="Total Orders" value={formatNumber(currentStats.orders)} icon={<ShoppingCart size={20} />} color="bg-purple-50 text-purple-600" />
            <StatCard label="Gross Profit" value={formatCurrency(currentStats.profit)} icon={<TrendingUp size={20} />} color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Avg Order Value" value={formatCurrency(currentStats.aov)} icon={<Users size={20} />} color="bg-orange-50 text-orange-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
              <h3 className="font-bold text-gray-900 mb-6">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="revenue" stroke="#3B82F6" fill="#3B82F610" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-[400px]">
              <h3 className="font-bold text-gray-900 mb-6">By Channel</h3>
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie data={channelData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {channelData.map((e, i) => <Cell key={i} fill={['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B'][i % 4]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavItem({ icon, label, active = false }) {
  return (
    <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer font-medium text-sm", active ? "bg-blue-50 text-blue-600" : "text-gray-500 hover:bg-gray-50")}>
      {icon} {label}
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center mb-4", color)}>{icon}</div>
      <p className="text-gray-500 text-sm mb-1">{label}</p>
      <h4 className="text-2xl font-bold text-gray-900">{value}</h4>
    </div>
  );
}

function InsightList({ title, items, icon, bg }) {
  return (
    <div className={cn("rounded-xl p-4 border border-gray-100", bg)}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items?.map((item, i) => (
          <li key={i} className="text-xs text-gray-700 list-disc ml-4">{item}</li>
        ))}
      </ul>
    </div>
  );
}
