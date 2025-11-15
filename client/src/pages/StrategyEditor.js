import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const DEFAULT_STRATEGY_CODE = `module.exports = async function strategy(ctx) {
  // ctx.candles - array of all candles up to current index
  // ctx.index - current candle index
  // ctx.params - strategy parameters
  // ctx.state - persistent state object (shared across calls)
  
  const currentCandle = ctx.candles[ctx.index];
  const prevCandle = ctx.candles[ctx.index - 1];
  
  // Initialize state if needed
  if (!ctx.state.initialized) {
    ctx.state.initialized = true;
    // Add your initialization logic here
  }
  
  // Example: Simple 2-candle retracement buy strategy
  if (ctx.index < 1) {
    return { signal: 'HOLD' };
  }
  
  // Check for retracement pattern
  if (prevCandle && currentCandle) {
    // If previous candle was bullish and current is a pullback
    if (prevCandle.close > prevCandle.open && 
        currentCandle.close < prevCandle.close &&
        currentCandle.close > prevCandle.open) {
      return { 
        signal: 'BUY',
        size: 1.0,
        meta: { reason: '2-candle retracement' }
      };
    }
  }
  
  // Check for exit conditions (simplified - close on opposite signal)
  if (ctx.index > 0 && currentCandle.close < prevCandle.close) {
    return { signal: 'SELL' };
  }
  
  return { signal: 'HOLD' };
};`;

function StrategyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState(DEFAULT_STRATEGY_CODE);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);

  useEffect(() => {
    if (id) {
      fetchStrategy();
    }
  }, [id]);

  const fetchStrategy = async () => {
    try {
      const response = await axios.get(`/api/strategies/${id}`);
      const strategy = response.data.strategy;
      setName(strategy.name);
      setDescription(strategy.description || '');
      setCode(strategy.code);
    } catch (error) {
      toast.error('Failed to load strategy');
      navigate('/strategies');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (id) {
        await axios.put(`/api/strategies/${id}`, { name, description, code });
        toast.success('Strategy updated');
      } else {
        await axios.post('/api/strategies', { name, description, code });
        toast.success('Strategy created');
      }
      navigate('/strategies');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save strategy');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">
            {id ? '✏️ Edit Strategy' : '➕ New Strategy'}
          </h1>
          <p className="mt-2 text-indigo-100">Write and test your trading algorithm</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-2">
                Strategy Name *
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="My Trading Strategy"
              />
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Describe your strategy..."
              />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <label htmlFor="code" className="block text-sm font-medium text-gray-200 mb-2">
              Strategy Code *
            </label>
            <p className="text-sm text-gray-400 mb-4">
              Must export an async function with signature: <code className="bg-gray-900 px-2 py-1 rounded">async function strategy(ctx)</code>
            </p>
            <div className="border border-gray-600 rounded-md overflow-hidden mb-4">
              <textarea
                id="code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                rows={25}
                className="w-full px-4 py-3 font-mono text-sm bg-gray-900 text-gray-200 focus:outline-none resize-y"
                style={{ fontFamily: 'monospace' }}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 mb-2">📝 Code Preview:</p>
              <div className="border border-gray-600 rounded-md overflow-hidden">
                <SyntaxHighlighter
                  language="javascript"
                  style={vscDarkPlus}
                  customStyle={{ margin: 0, borderRadius: '0.375rem' }}
                >
                  {code}
                </SyntaxHighlighter>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/strategies')}
              className="px-4 py-2 border border-gray-600 rounded-md text-gray-200 hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-md hover:from-indigo-500 hover:to-blue-500 font-semibold disabled:opacity-60"
            >
              {loading ? '⏳ Saving...' : id ? '💾 Update Strategy' : '✅ Create Strategy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StrategyEditor;

