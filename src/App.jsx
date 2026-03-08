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
  ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
  const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
  const [testResponse, setTestResponse] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [showTester, setShowTester] = useState(false);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/data/sales_data.csv');
        const reader = response.body.getReader();
        const result = await reader.read();
        const decoder = new TextDecoder('utf-8');
        const csv = decoder.decode(result.value);
        
        Papa.parse(csv, {
          header: true,
          dynamicTyping: true,
          complete: (results) => {
            const parsedData = results.data.filter(row => row.date); // Filter empty rows
            setData(parsedData);
            
            const totalRevenue = parsedData.reduce((sum, row) => sum + (row.revenue || 0), 0);
            const totalOrders = parsedData.reduce((sum, row) => sum + (row.orders || 0), 0);
            const totalCost = parsedData.reduce((sum, row) => sum + (row.cost || 0), 0);
            
            setStats({
              revenue: totalRevenue,
              orders: totalOrders,
              profit: totalRevenue - totalCost,
              aov: totalOrders > 0 ? totalRevenue / totalOrders : 0
            });
            setLoading(false);
          }
        });
      } catch (error) {
        console.error('Error fetching CSV:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
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
          {/* KPI Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <StatCard 
              label="Total Revenue" 
              value={formatCurrency(stats.revenue)} 
              icon={<DollarSign className="text-blue-600" size={20} />} 
              trend="+12.5%" 
              trendType="up"
              color="bg-blue-50"
            />
            <StatCard 
              label="Total Orders" 
              value={formatNumber(stats.orders)} 
              icon={<ShoppingCart className="text-purple-600" size={20} />} 
              trend="+8.2%" 
              trendType="up"
              color="bg-purple-50"
            />
            <StatCard 
              label="Gross Profit" 
              value={formatCurrency(stats.profit)} 
              icon={<TrendingUp className="text-emerald-600" size={20} />} 
              trend="+14.1%" 
              trendType="up"
              color="bg-emerald-50"
            />
            <StatCard 
              label="Avg. Order Value" 
              value={formatCurrency(stats.aov)} 
              icon={<Users className="text-orange-600" size={20} />} 
              trend="-2.4%" 
              trendType="down"
              color="bg-orange-50"
            />
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-10">
            <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                Sales Transactions
                <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">{data.length} entries</span>
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

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">Date</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">Product</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">Channel</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 text-right">Orders</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 text-right">Revenue</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.map((row, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      key={i} 
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-6 py-4 text-sm text-gray-600 font-medium">{row.date}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{row.product}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          {row.channel}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 font-semibold text-right">{row.orders}</td>
                      <td className="px-6 py-4 text-sm text-blue-600 font-bold text-right">{formatCurrency(row.revenue)}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          Success
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
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
