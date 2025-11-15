import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function Strategies() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await axios.get('/api/strategies');
      setStrategies(response.data.strategies);
    } catch (error) {
      toast.error('Failed to load strategies');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this strategy?')) {
      return;
    }

    try {
      await axios.delete(`/api/strategies/${id}`);
      toast.success('Strategy deleted');
      fetchStrategies();
    } catch (error) {
      toast.error('Failed to delete strategy');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Trading Strategies</h1>
            <p className="mt-2 text-indigo-100">Create and manage your automated trading strategies</p>
          </div>
          <Link
            to="/strategies/new"
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 shadow-lg"
          >
            + New Strategy
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {strategies.length === 0 ? (
          <div className="bg-gray-800 rounded-lg shadow-lg p-12 text-center border border-gray-700">
            <p className="text-gray-300 mb-4 text-lg">No strategies yet</p>
            <Link
              to="/strategies/new"
              className="text-indigo-400 hover:text-indigo-300 font-semibold"
            >
              Create your first strategy
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700 hover:border-indigo-500 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white">{strategy.name}</h3>
                    {strategy.description && (
                      <p className="text-gray-400 mt-2">{strategy.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-4">
                      Created: {new Date(strategy.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Link
                      to={`/strategies/${strategy.id}/edit`}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(strategy.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Strategies;

