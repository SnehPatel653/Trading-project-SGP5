import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Strategies from './pages/Strategies';
import StrategyEditor from './pages/StrategyEditor';
import Backtests from './pages/Backtests';
import BacktestDetail from './pages/BacktestDetail';
import LiveTrading from './pages/LiveTrading';
import Navbar from './components/Navbar';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/strategies"
        element={
          <PrivateRoute>
            <Strategies />
          </PrivateRoute>
        }
      />
      <Route
        path="/strategies/new"
        element={
          <PrivateRoute>
            <StrategyEditor />
          </PrivateRoute>
        }
      />
      <Route
        path="/strategies/:id/edit"
        element={
          <PrivateRoute>
            <StrategyEditor />
          </PrivateRoute>
        }
      />
      <Route
        path="/backtests"
        element={
          <PrivateRoute>
            <Backtests />
          </PrivateRoute>
        }
      />
      <Route
        path="/backtests/:id"
        element={
          <PrivateRoute>
            <BacktestDetail />
          </PrivateRoute>
        }
      />
      <Route
        path="/trading"
        element={
          <PrivateRoute>
            <LiveTrading />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <AppRoutes />
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

