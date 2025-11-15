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
    timeframes: ['1m','15m','1h'],
  });
  const [files, setFiles] = useState([]);
  const [running, setRunning] = useState(false);
  const availableTimeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];

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
    if (!formData.strategyId || !formData.name) {
      toast.error('Please fill all required fields');
      return;
    }

    const selectedTfs = formData.timeframes || [];
    if (selectedTfs.length === 0) {
      toast.error('Please select at least one timeframe');
      return;
    }

    if (!files || files.length === 0) {
      toast.error('Please select CSV files for the selected timeframes');
      return;
    }

    if (files.length !== selectedTfs.length) {
      toast.error(`Selected ${selectedTfs.length} timeframe(s) but uploaded ${files.length} file(s). Please upload one CSV per timeframe.`);
      return;
    }

    setRunning(true);
    const formDataToSend = new FormData();
    formDataToSend.append('strategyId', formData.strategyId);
    formDataToSend.append('name', formData.name);
    formDataToSend.append('commission', formData.commission);
    formDataToSend.append('slippage', formData.slippage);
    formDataToSend.append('initialCapital', formData.initialCapital);
    // Send timeframes as JSON string (ordered)
    formDataToSend.append('timeframes', JSON.stringify(formData.timeframes || []));

    // Append files in the same order as timeframes
    for (let i = 0; i < files.length; i++) {
      formDataToSend.append('dataFiles', files[i]);
    }

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Backtests</h1>
            <p className="mt-2 text-purple-100">Test your strategies with historical data</p>
          </div>
          <button
            onClick={() => setShowRunForm(!showRunForm)}
            className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 shadow-lg"
          >
            {showRunForm ? '✕ Cancel' : '+ Run Backtest'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showRunForm && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">Run New Backtest</h2>
            <form onSubmit={handleRunBacktest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Strategy *</label>
                  <select
                    required
                    value={formData.strategyId}
                    onChange={(e) => setFormData({ ...formData, strategyId: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a strategy</option>
                    {strategies.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Backtest Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="My Backtest"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Commission</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.commission}
                    onChange={(e) => setFormData({ ...formData, commission: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Slippage</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.slippage}
                    onChange={(e) => setFormData({ ...formData, slippage: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Initial Capital</label>
                  <input
                    type="number"
                    value={formData.initialCapital}
                    onChange={(e) => setFormData({ ...formData, initialCapital: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">OHLCV CSV File(s) *</label>
                  <input
                    type="file"
                    accept=".csv"
                    required
                    multiple
                    onChange={(e) => setFiles(Array.from(e.target.files))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Upload one CSV per selected timeframe. Files will be mapped in the order you uploaded them.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Timeframes</label>
                  <div className="grid grid-cols-3 gap-2">
                    {availableTimeframes.map((tf) => (
                      <label key={tf} className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={(formData.timeframes || []).includes(tf)}
                          onChange={(e) => {
                            const next = new Set(formData.timeframes || []);
                            if (e.target.checked) next.add(tf); else next.delete(tf);
                            setFormData({ ...formData, timeframes: Array.from(next) });
                          }}
                          className="mr-2"
                        />
                        <span className="text-gray-300 text-sm">{tf}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={running}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-500 hover:to-pink-500 font-semibold disabled:opacity-60"
              >
                {running ? '⏳ Running...' : '▶ Run Backtest'}
              </button>
            </form>
          </div>
        )}

        {backtests.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-700">
            <p className="text-gray-300 mb-4 text-lg">No backtests yet</p>
            <button
              onClick={() => setShowRunForm(true)}
              className="text-purple-400 hover:text-purple-300 font-semibold"
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
                <div key={backtest.id} className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-purple-500 transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-white">{backtest.name}</h3>
                      <p className="text-sm text-gray-400 mt-2">
                        Created: {new Date(backtest.createdAt || backtest.created_at).toLocaleDateString()}
                      </p>
                      {metrics.totalTrades !== undefined && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-700 rounded p-3">
                            <p className="text-xs text-gray-400">Total Trades</p>
                            <p className="text-lg font-bold text-white">{metrics.totalTrades}</p>
                          </div>
                          <div className="bg-gray-700 rounded p-3">
                            <p className="text-xs text-gray-400">Win Rate</p>
                            <p className="text-lg font-bold text-white">{metrics.winRate}%</p>
                          </div>
                          <div className="bg-gray-700 rounded p-3">
                            <p className="text-xs text-gray-400">Net P&L</p>
                            <p className={`text-lg font-bold ${metrics.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              ${metrics.netPnL?.toFixed(2)}
                            </p>
                          </div>
                          <div className="bg-gray-700 rounded p-3">
                            <p className="text-xs text-gray-400">ROI</p>
                            <p className={`text-lg font-bold ${metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {metrics.roi?.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <Link
                        to={`/backtests/${backtest.id}`}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium"
                      >
                        View Details
                      </Link>
                      <button
                        onClick={() => handleDelete(backtest.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
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
    </div>
  );
}

export default Backtests;

