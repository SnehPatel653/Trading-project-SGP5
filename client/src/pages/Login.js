import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-6xl w-full mx-4 md:mx-8 lg:mx-16 bg-white rounded-lg shadow-lg overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left promo panel */}
        <div className="hidden md:flex flex-col p-10 bg-gradient-to-br from-blue-600 to-indigo-700 text-white gap-6">
          <div>
            <h1 className="text-4xl font-extrabold">AutoTradeX</h1>
            <p className="mt-2 text-lg opacity-90">Automated Trading with AI Intelligence</p>
          </div>

          <ul className="mt-6 space-y-4">
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">⚙️</span>
              <div>
                <div className="font-semibold">Automated Execution</div>
                <div className="text-sm opacity-90">Execute trades 24/7 with intelligent algorithms.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">📊</span>
              <div>
                <div className="font-semibold">Backtesting Engine</div>
                <div className="text-sm opacity-90">Test strategies with historical market data.</div>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">🔐</span>
              <div>
                <div className="font-semibold">Enterprise Security</div>
                <div className="text-sm opacity-90">Bank-grade encryption for all broker credentials.</div>
              </div>
            </li>
          </ul>

          <div className="mt-auto text-sm opacity-90">"AutoTradeX automated my trading and increased returns" — Sneh Patel</div>
        </div>

        {/* Right form panel */}
        <div className="flex items-center justify-center p-8 bg-gray-900 text-gray-100">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Welcome Back</h2>
              <p className="text-sm opacity-80">Sign in to access your trading dashboard</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300">Email Address</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="you@example.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="form-checkbox h-4 w-4 text-indigo-500 bg-gray-800 border-gray-600 rounded" />
                  <span className="text-gray-300">Remember me</span>
                </label>
                <Link to="#" className="text-indigo-400 hover:underline">Forgot password?</Link>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white font-medium disabled:opacity-60"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>

              <div className="text-center text-sm mt-6">
                <Link to="/register" className="text-indigo-400 hover:underline">Don't have an account? Sign up</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

