import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function Dashboard() {
  const [stats, setStats] = useState({
    strategies: 0,
    backtests: 0,
    liveTrades: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [strategiesRes, backtestsRes, tradesRes] = await Promise.all([
        axios.get('/api/strategies'),
        axios.get('/api/backtests'),
        axios.get('/api/trading/trades'),
      ]);

      setStats({
        strategies: strategiesRes.data.strategies?.length || 0,
        backtests: backtestsRes.data.backtests?.length || 0,
        liveTrades: tradesRes.data.trades?.length || 0,
      });
    } catch (error) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-500">Strategies</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.strategies}</p>
          <Link to="/strategies" className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block">
            View all →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-500">Backtests</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.backtests}</p>
          <Link to="/backtests" className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block">
            View all →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-500">Live Trades</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.liveTrades}</p>
          <Link to="/trading" className="text-blue-600 hover:text-blue-800 text-sm mt-4 inline-block">
            View all →
          </Link>
        </div>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>Disclaimer:</strong> Trading involves substantial risk of loss. Past performance is not indicative of future results. 
              This platform defaults to paper trading mode. Live trading should only be enabled after thorough testing and understanding of risks.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/strategies/new"
            className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <h3 className="font-medium text-gray-900">Create New Strategy</h3>
            <p className="text-sm text-gray-500 mt-1">Write and test a new trading strategy</p>
          </Link>
          <Link
            to="/backtests"
            className="block p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <h3 className="font-medium text-gray-900">Run Backtest</h3>
            <p className="text-sm text-gray-500 mt-1">Test your strategy on historical data</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

