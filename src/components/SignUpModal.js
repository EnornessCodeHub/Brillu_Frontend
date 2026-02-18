import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../config/api.config';

export default function SignUpModal({ isOpen, onClose, onSuccess, initialMode = 'signup' }) {
  const [mode, setMode] = useState(initialMode); // 'signup' or 'login'
  
  // Reset mode when modal opens with new initialMode
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    tenantName: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        if (!formData.email || !formData.password || !formData.tenantName) {
          setError('All fields are required');
          setLoading(false);
          return;
        }
        const response = await axios.post(`${API}/api/auth/register`, formData);
        localStorage.setItem('token', response.data.token);
        onSuccess(response.data.token, true); // true = new user
      } else {
        if (!formData.email || !formData.password) {
          setError('Email and password are required');
          setLoading(false);
          return;
        }
        const response = await axios.post(`${API}/api/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        localStorage.setItem('token', response.data.token);
        onSuccess(response.data.token, false); // false = existing user
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        
        <div className="modal-header">
          <h2>{mode === 'signup' ? '🚀 Create Your Account' : '👋 Welcome Back'}</h2>
          <p>
            {mode === 'signup' 
              ? 'Get unlimited access to AI email generation' 
              : 'Sign in to continue creating amazing emails'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label htmlFor="tenantName">Company/Tenant Name</label>
              <input
                type="text"
                id="tenantName"
                name="tenantName"
                value={formData.tenantName}
                onChange={handleChange}
                placeholder="My Company"
                required
                disabled={loading}
              />
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-large btn-block"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Processing...
              </>
            ) : mode === 'signup' ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="modal-footer">
          {mode === 'signup' ? (
            <p>
              Already have an account?{' '}
              <button className="link-button" onClick={() => setMode('login')}>
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button className="link-button" onClick={() => setMode('signup')}>
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

