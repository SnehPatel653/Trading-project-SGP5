import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function BacktestDetail() {
  const { id } = useParams();
  const [backtest, setBacktest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBacktest();
  }, [id]);

  const fetchBacktest = async () => {
    try {
      const response = await axios.get(`/api/backtests/${id}`);
      setBacktest(response.data.backtest);
    } catch (error) {
      toast.error('Failed to load backtest');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTrades = async () => {
    try {
      const response = await axios.get(`/api/backtests/${id}/trades`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backtest_${id}_trades.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Trades CSV downloaded');
    } catch (error) {
      toast.error('Failed to download trades');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!backtest) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-gray-500">Backtest not found</p>
        <Link to="/backtests" className="text-blue-600 hover:text-blue-800">
          Back to Backtests
        </Link>
      </div>
    );
  }

  const rawResults = backtest.results;
  const results = rawResults
    ? typeof rawResults === 'string'
      ? JSON.parse(rawResults)
      : rawResults
    : null;
  const metrics = results?.metrics || {};
  const trades = results?.trades || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/backtests" className="text-purple-200 hover:text-white mb-4 inline-block text-sm font-medium">
            ← Back to Backtests
          </Link>
          <h1 className="text-4xl font-bold mt-2">{backtest.name}</h1>
          <p className="mt-2 text-purple-100">
            Created: {new Date(backtest.createdAt || backtest.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Grid */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">📊 Performance Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Total Trades</p>
              <p className="text-2xl font-bold text-white mt-1">{metrics.totalTrades || 0}</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Wins</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{metrics.wins || 0}</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Losses</p>
              <p className="text-2xl font-bold text-red-400 mt-1">{metrics.losses || 0}</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Win Rate</p>
              <p className="text-2xl font-bold text-white mt-1">{metrics.winRate?.toFixed(2) || 0}%</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Accuracy</p>
              <p className="text-2xl font-bold text-white mt-1">{metrics.accuracy?.toFixed(2) || 0}%</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Net P&L</p>
              <p className={`text-2xl font-bold mt-1 ${metrics.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${metrics.netPnL?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">ROI</p>
              <p className={`text-2xl font-bold mt-1 ${metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {metrics.roi?.toFixed(2) || 0}%
              </p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Max Drawdown</p>
              <p className="text-2xl font-bold text-red-400 mt-1">${metrics.maxDrawdown?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Sharpe Ratio</p>
              <p className="text-2xl font-bold text-white mt-1">{metrics.sharpeRatio?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-xs text-gray-400 uppercase">Profit Factor</p>
              <p className="text-2xl font-bold text-white mt-1">{metrics.profitFactor?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>

        {/* Trades Table */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">📋 Trades</h2>
            <button
              onClick={handleDownloadTrades}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium"
            >
              📥 Download CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Entry Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Exit Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Side</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Size</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Entry Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Exit Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">P&L</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">P&L %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-4 text-center text-gray-400">
                      No trades executed
                    </td>
                  </tr>
                ) : (
                  trades.map((trade, index) => (
                    <tr key={index} className="hover:bg-gray-700 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(trade.entryTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(trade.exitTime).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.side}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.size}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${trade.entryPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${trade.exitPrice.toFixed(2)}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${trade.pnl.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${trade.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.pnlPercent.toFixed(2)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BacktestDetail;

