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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">🎯 Live Trading</h1>
          <p className="mt-2 text-green-100">Execute real-time trades with your automated strategies</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Disclaimer */}
        <div className="bg-amber-900 border-l-4 border-amber-400 p-6 mb-8 rounded-lg">
          <div className="flex">
            <div className="text-amber-400 text-3xl mr-4">⚠️</div>
            <div>
              <p className="text-sm text-amber-100 font-semibold mb-2">Risk Disclaimer</p>
              <p className="text-sm text-amber-100 leading-relaxed">
                Trading involves substantial risk of loss. Past performance is not indicative of future results. 
                This platform defaults to paper trading mode. Live trading with real money should only be enabled 
                after thorough testing, understanding of risks, and proper broker configuration. Always start with paper trading.
              </p>
            </div>
          </div>
        </div>

        {/* Trading Status */}
        {status && (
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-4">📊 Trading Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded p-4">
                <p className="text-sm text-gray-400 uppercase">Paper Trading</p>
                <p className={`text-lg font-semibold mt-2 ${status.paperTradingEnabled ? 'text-green-400' : 'text-red-400'}`}>
                  {status.paperTradingEnabled ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
              <div className="bg-gray-700 rounded p-4">
                <p className="text-sm text-gray-400 uppercase">Live Trading</p>
                <p className={`text-lg font-semibold mt-2 ${status.liveTradingEnabled ? 'text-green-400' : 'text-red-400'}`}>
                  {status.liveTradingEnabled ? '✓ Enabled' : '✗ Disabled'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trading Control */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">⚙️ Trading Control</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Select Strategy</label>
              <select
                value={formData.strategyId}
                onChange={(e) => setFormData({ ...formData, strategyId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select a strategy</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Symbol</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="BTC/USD"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">Broker Type</label>
              <select
                value={formData.brokerType}
                onChange={(e) => setFormData({ ...formData, brokerType: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="paper">📄 Paper Trading (Mock - Safe Testing)</option>
                <option value="live" disabled>🔴 Live Trading (Not Implemented)</option>
              </select>
              <p className="text-sm text-gray-400 mt-2">
                Paper trading uses a mock broker for safe, risk-free testing
              </p>
            </div>

            <div className="flex space-x-4">
              {!tradingActive ? (
                <button
                  onClick={handleStartTrading}
                  className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-md font-semibold transition"
                >
                  ▶ Start Trading
                </button>
              ) : (
                <button
                  onClick={handleStopTrading}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white rounded-md font-semibold transition"
                >
                  ⏹ Stop Trading
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Trades */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-bold text-white mb-4">💼 Live Trades</h2>
          {trades.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No live trades yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Side</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Broker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-700 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(trade.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-semibold">{trade.symbol}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.side}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.size}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${trade.price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          trade.status === 'filled' ? 'bg-green-900 text-green-200' :
                          trade.status === 'pending' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-red-900 text-red-200'
                        }`}>
                          {trade.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{trade.broker_type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiveTrading;

