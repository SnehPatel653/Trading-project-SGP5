import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const equityCurve = results?.equityCurve || [];

  // Format equity curve for chart
  const chartData = equityCurve.map((point) => ({
    time: new Date(point.timestamp).toLocaleDateString(),
    equity: parseFloat(Number(point.equity).toFixed(2)),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/backtests" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Backtests
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-4">{backtest.name}</h1>
        <p className="text-sm text-gray-500 mt-2">
          Created: {new Date(backtest.createdAt || backtest.created_at).toLocaleString()}
        </p>
      </div>

      {/* Metrics */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-sm text-gray-500">Total Trades</p>
            <p className="text-2xl font-bold">{metrics.totalTrades || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Wins</p>
            <p className="text-2xl font-bold text-green-600">{metrics.wins || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Losses</p>
            <p className="text-2xl font-bold text-red-600">{metrics.losses || 0}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Win Rate</p>
            <p className="text-2xl font-bold">{metrics.winRate?.toFixed(2) || 0}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Accuracy</p>
            <p className="text-2xl font-bold">{metrics.accuracy?.toFixed(2) || 0}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Net P&L</p>
            <p className={`text-2xl font-bold ${metrics.netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${metrics.netPnL?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ROI</p>
            <p className={`text-2xl font-bold ${metrics.roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics.roi?.toFixed(2) || 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Max Drawdown</p>
            <p className="text-2xl font-bold text-red-600">
              ${metrics.maxDrawdown?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Max DD %</p>
            <p className="text-2xl font-bold text-red-600">
              {metrics.maxDrawdownPercent?.toFixed(2) || 0}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Expectancy</p>
            <p className={`text-2xl font-bold ${metrics.expectancy >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${metrics.expectancy?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg Win</p>
            <p className="text-2xl font-bold text-green-600">
              ${metrics.averageWin?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Avg Loss</p>
            <p className="text-2xl font-bold text-red-600">
              ${metrics.averageLoss?.toFixed(2) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Profit Factor</p>
            <p className="text-2xl font-bold">{metrics.profitFactor?.toFixed(2) || '0.00'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Sharpe Ratio</p>
            <p className="text-2xl font-bold">{metrics.sharpeRatio?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Equity Curve</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="equity"
              stroke="#3b82f6"
              strokeWidth={2}
              name="Equity"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Trades</h2>
          <button
            onClick={handleDownloadTrades}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Download CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Side
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                    No trades executed
                  </td>
                </tr>
              ) : (
                trades.map((trade, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trade.entryTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trade.exitTime).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.side}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.entryPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.exitPrice.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${trade.pnl.toFixed(2)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${trade.pnlPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
  );
}

export default BacktestDetail;

