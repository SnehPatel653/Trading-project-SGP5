import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function Backtests() {
  const [backtests, setBacktests] = useState([]);
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRunForm, setShowRunForm] = useState(false);
  const [formData, setFormData] = useState({
    strategyId: '',
    name: '',
    commission: '0.001',
    slippage: '0.0005',
    initialCapital: '10000',
  });
  const [file, setFile] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [backtestsRes, strategiesRes] = await Promise.all([
        axios.get('/api/backtests'),
        axios.get('/api/strategies'),
      ]);
      setBacktests(backtestsRes.data.backtests);
      setStrategies(strategiesRes.data.strategies);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleRunBacktest = async (e) => {
    e.preventDefault();
    if (!formData.strategyId || !formData.name || !file) {
      toast.error('Please fill all fields and select a CSV file');
      return;
    }

    setRunning(true);
    const formDataToSend = new FormData();
    formDataToSend.append('strategyId', formData.strategyId);
    formDataToSend.append('name', formData.name);
    formDataToSend.append('commission', formData.commission);
    formDataToSend.append('slippage', formData.slippage);
    formDataToSend.append('initialCapital', formData.initialCapital);
    formDataToSend.append('dataFile', file);

    try {
      const response = await axios.post('/api/backtests/run', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Backtest completed');
      setShowRunForm(false);
      fetchData();
      // Navigate to backtest detail
      window.location.href = `/backtests/${response.data.backtest.id}`;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Backtest failed');
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this backtest?')) {
      return;
    }

    try {
      await axios.delete(`/api/backtests/${id}`);
      toast.success('Backtest deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete backtest');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Backtests</h1>
        <button
          onClick={() => setShowRunForm(!showRunForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {showRunForm ? 'Cancel' : 'Run New Backtest'}
        </button>
      </div>

      {showRunForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Run Backtest</h2>
          <form onSubmit={handleRunBacktest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Strategy *
              </label>
              <select
                required
                value={formData.strategyId}
                onChange={(e) => setFormData({ ...formData, strategyId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a strategy</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backtest Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="My Backtest"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Commission (0.001 = 0.1%)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.commission}
                  onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Slippage (0.0005 = 0.05%)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.slippage}
                  onChange={(e) => setFormData({ ...formData, slippage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Capital
                </label>
                <input
                  type="number"
                  value={formData.initialCapital}
                  onChange={(e) => setFormData({ ...formData, initialCapital: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OHLCV CSV File *
              </label>
              <input
                type="file"
                accept=".csv"
                required
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                CSV format: timestamp,open,high,low,close,volume
              </p>
            </div>

            <button
              type="submit"
              disabled={running}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {running ? 'Running...' : 'Run Backtest'}
            </button>
          </form>
        </div>
      )}

      {backtests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 mb-4">No backtests yet</p>
          <button
            onClick={() => setShowRunForm(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            Run your first backtest
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {backtests.map((backtest) => {
            const rawResults = backtest.results;
            const results = rawResults
              ? typeof rawResults === 'string'
                ? JSON.parse(rawResults)
                : rawResults
              : null;
            const metrics = results?.metrics || {};

            return (
              <div key={backtest.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900">{backtest.name}</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      Created: {new Date(backtest.createdAt || backtest.created_at).toLocaleDateString()}
                    </p>
                    {metrics.totalTrades !== undefined && (
                      <div className="mt-4 grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Total Trades</p>
                          <p className="text-lg font-semibold">{metrics.totalTrades}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Win Rate</p>
                          <p className="text-lg font-semibold">{metrics.winRate}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Net P&L</p>
                          <p className={`text-lg font-semibold ${metrics.netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ${metrics.netPnL?.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">ROI</p>
                          <p className={`text-lg font-semibold ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {metrics.roi?.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      to={`/backtests/${backtest.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={() => handleDelete(backtest.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Backtests;

