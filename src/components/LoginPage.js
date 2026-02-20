import React, { useState } from 'react';
import axios from 'axios';
import API from '../config/api.config';
import { Button } from './ui/button';
import SignUpModal from './SignUpModal';

/**
 * Simple standalone login page.
 * User logs in here, then is routed to onboarding (if new) or dashboard.
 */
export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API}/api/auth/login`, { email, password });
      const token = response.data.token;
      onLogin(token, false);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSuccess = (token, isNewUser) => {
    setShowSignUp(false);
    onLogin(token, isNewUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="bg-background border border-border rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold text-center mb-2">Sign in</h1>
          <p className="text-muted-foreground text-center text-sm mb-6">
            Sign in to start creating emails
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{' '}
            <button
              type="button"
              onClick={() => setShowSignUp(true)}
              className="text-primary font-medium hover:underline"
            >
              Create account
            </button>
          </p> */}
        </div>
      </div>

      <SignUpModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSuccess={handleSignUpSuccess}
        initialMode="signup"
      />
    </div>
  );
}
