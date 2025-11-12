import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

function LiveTrading() {
  const [status, setStatus] = useState(null);
  const [strategies, setStrategies] = useState([]);
  const [trades, setTrades] = useState([]);
  const [formData, setFormData] = useState({
    strategyId: '',
    symbol: 'BTC/USD',
    brokerType: 'paper',
  });
  const [loading, setLoading] = useState(true);
  const [tradingActive, setTradingActive] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statusRes, strategiesRes, tradesRes] = await Promise.all([
        axios.get('/api/trading/status'),
        axios.get('/api/strategies'),
        axios.get('/api/trading/trades'),
      ]);
      setStatus(statusRes.data);
      setStrategies(strategiesRes.data.strategies);
      setTrades(tradesRes.data.trades);
    } catch (error) {
      toast.error('Failed to load trading data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrading = async () => {
    if (!formData.strategyId || !formData.symbol) {
      toast.error('Please select a strategy and enter a symbol');
      return;
    }

    try {
      const response = await axios.post('/api/trading/start', formData);
      toast.success('Live trading started');
      setTradingActive(true);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to start trading');
    }
  };

  const handleStopTrading = async () => {
    try {
      await axios.post('/api/trading/stop');
      toast.success('Live trading stopped');
      setTradingActive(false);
    } catch (error) {
      toast.error('Failed to stop trading');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Live Trading</h1>

      {/* Disclaimer */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
        <div className="flex">
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              <strong>⚠️ Important Disclaimer:</strong> Trading involves substantial risk of loss. 
              Past performance is not indicative of future results. This platform defaults to paper trading mode. 
              Live trading with real money should only be enabled after thorough testing, understanding of risks, 
              and proper broker configuration. Always start with paper trading.
            </p>
          </div>
        </div>
      </div>

      {/* Trading Status */}
      {status && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Trading Status</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Paper Trading</p>
              <p className={`text-lg font-semibold ${status.paperTradingEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {status.paperTradingEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Live Trading</p>
              <p className={`text-lg font-semibold ${status.liveTradingEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {status.liveTradingEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-4">{status.disclaimer}</p>
        </div>
      )}

      {/* Trading Control */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Trading Control</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Strategy
            </label>
            <select
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
              Symbol
            </label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="BTC/USD"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Broker Type
            </label>
            <select
              value={formData.brokerType}
              onChange={(e) => setFormData({ ...formData, brokerType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="paper">Paper Trading (Mock)</option>
              <option value="live" disabled>Live Trading (Not Implemented)</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Paper trading uses a mock broker for safe testing
            </p>
          </div>

          <div className="flex space-x-4">
            {!tradingActive ? (
              <button
                onClick={handleStartTrading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Start Trading
              </button>
            ) : (
              <button
                onClick={handleStopTrading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Stop Trading
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Trades */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Live Trades</h2>
        {trades.length === 0 ? (
          <p className="text-gray-500">No live trades yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Side
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Broker
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade) => (
                  <tr key={trade.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(trade.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.side}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${trade.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        trade.status === 'filled' ? 'bg-green-100 text-green-800' :
                        trade.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {trade.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {trade.broker_type}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTrading;

