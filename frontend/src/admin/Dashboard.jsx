import React, { useEffect, useState } from 'react';
import { TrendingUp, Users, ShoppingBag, DollarSign, Package, Clock } from 'lucide-react';
import API from "../services/api";
import toast from "react-hot-toast";

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{title}</p>
        <h3 className="text-2xl font-black">{value}</h3>
      </div>
      <div className={`p-4 rounded-2xl ${color} shadow-lg`}>
        <Icon className="text-white" size={24} />
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await API.get("admin-stats/");
        setData(res.data);
      } catch (err) {
        console.error("Dashboard error:", err);
        toast.error("Failed to load dashboard statistics.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        <span className="ml-3 font-bold uppercase tracking-widest text-xs">Syncing Data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">
            System Overview<span className="text-orange-600">.</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            Real-time performance metrics
          </p>
        </div>
      </div>
      
      {/* Dynamic Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`QAR ${data?.stats?.total_revenue?.toLocaleString() || 0}`} 
          icon={DollarSign} 
          color="bg-black" 
        />
        <StatCard 
          title="Total Orders" 
          value={data?.stats?.total_orders || 0} 
          icon={ShoppingBag} 
          color="bg-orange-600" 
        />
        <StatCard 
          title="Pending Orders" 
          value={data?.stats?.pending_orders || 0} 
          icon={Clock} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Out of Stock" 
          value={data?.stats?.out_of_stock || 0} 
          icon={Package} 
          color="bg-red-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Registered Users Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black uppercase text-sm tracking-widest text-black">New Members</h3>
            <Users size={16} className="text-orange-600" />
          </div>
          
          <div className="space-y-4">
            {data?.recent_users?.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-white border border-transparent hover:border-gray-100 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold uppercase">
                    {user.first_name?.[0] || user.username?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-black">{user.username}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{user.email}</p>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase text-gray-400">
                  {new Date(user.date_joined).toLocaleDateString()}
                </span>
              </div>
            ))}
            {(!data?.recent_users || data.recent_users.length === 0) && (
              <p className="text-gray-400 italic text-center py-4 text-xs font-bold uppercase tracking-widest">No recent members found</p>
            )}
          </div>
        </div>

        {/* Growth/Activity Placeholder */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4">
            <TrendingUp className="text-orange-600" size={32} />
          </div>
          <h3 className="font-black uppercase text-sm mb-2">Sales Analytics</h3>
          <p className="text-gray-400 text-xs font-bold max-w-[200px] leading-relaxed uppercase tracking-widest">
            Detailed charts and growth data will appear here as orders increase.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;