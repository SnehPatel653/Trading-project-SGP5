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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">Trading Dashboard</h1>
          <p className="mt-2 text-indigo-100">Welcome to AutoTradeX - Manage your automated trading</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Strategies</p>
                <p className="text-4xl font-bold mt-2">{stats.strategies}</p>
              </div>
              <div className="text-blue-200 text-4xl">📊</div>
            </div>
            <Link to="/strategies" className="mt-4 inline-block text-blue-100 hover:text-white text-sm font-medium">
              View all →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Backtests Run</p>
                <p className="text-4xl font-bold mt-2">{stats.backtests}</p>
              </div>
              <div className="text-purple-200 text-4xl">📈</div>
            </div>
            <Link to="/backtests" className="mt-4 inline-block text-purple-100 hover:text-white text-sm font-medium">
              View all →
            </Link>
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Live Trades</p>
                <p className="text-4xl font-bold mt-2">{stats.liveTrades}</p>
              </div>
              <div className="text-green-200 text-4xl">🎯</div>
            </div>
            <Link to="/trading" className="mt-4 inline-block text-green-100 hover:text-white text-sm font-medium">
              View all →
            </Link>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-900 border-l-4 border-amber-400 p-4 mb-8 rounded-lg">
          <div className="flex">
            <div className="text-amber-400 text-2xl mr-4">⚠️</div>
            <div>
              <p className="text-sm text-amber-100">
                <strong>Risk Disclaimer:</strong> Trading involves substantial risk of loss. Past performance is not indicative of future results. 
                This platform defaults to paper trading mode. Live trading should only be enabled after thorough testing and understanding of risks.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/strategies/new"
              className="block p-6 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg hover:from-indigo-500 hover:to-indigo-600 transition text-white"
            >
              <h3 className="font-bold text-lg">+ Create Strategy</h3>
              <p className="text-sm text-indigo-100 mt-2">Write and test a new trading strategy</p>
            </Link>
            <Link
              to="/backtests"
              className="block p-6 bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg hover:from-purple-500 hover:to-purple-600 transition text-white"
            >
              <h3 className="font-bold text-lg">📊 Run Backtest</h3>
              <p className="text-sm text-purple-100 mt-2">Test strategies on historical data</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

