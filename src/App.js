import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginPage from './components/LoginPage';
import DashboardLayout from './components/Dashboard/DashboardLayout';
import EnhancedOnboarding from './components/EnhancedOnboarding';
import API from './config/api.config';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'onboarding', or 'dashboard'
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [welcomeCampaignId, setWelcomeCampaignId] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        try {
          // Check onboarding status from backend
          const response = await axios.get(`${API}/api/auth/me`, {
            headers: { Authorization: `Bearer ${storedToken}` }
          });
          
          const user = response.data.user;
          const onboardingCompleted = user?.onboardingCompleted ?? false;
          
          setToken(storedToken);
          setIsAuthenticated(true);
          
          // Sync localStorage for backward compatibility
          if (onboardingCompleted) {
            localStorage.setItem('onboarding_completed', 'true');
          } else {
            localStorage.removeItem('onboarding_completed');
          }
          
          // Route based on onboarding status
          if (onboardingCompleted) {
            setView('dashboard');
          } else {
            setView('onboarding');
            setShowOnboarding(true);
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Token invalid, clear it
          localStorage.removeItem('token');
          localStorage.removeItem('onboarding_completed');
          setView('login');
        }
      } else {
        // No token, show login page
        setView('login');
      }
      
      setCheckingAuth(false);
    };
    
    checkAuthStatus();
  }, []);

  const handleLogin = async (newToken, isNewUser = false) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    
    try {
      // Check onboarding status from backend
      const response = await axios.get(`${API}/api/auth/me`, {
        headers: { Authorization: `Bearer ${newToken}` }
      });
      
      const user = response.data.user;
      const onboardingCompleted = user?.onboardingCompleted ?? false;
      
      // Sync localStorage for backward compatibility
      if (onboardingCompleted) {
        localStorage.setItem('onboarding_completed', 'true');
      } else {
        localStorage.removeItem('onboarding_completed');
      }
      
      // Route based on onboarding status
      if (onboardingCompleted) {
        setView('dashboard');
        setShowOnboarding(false);
      } else {
        setView('onboarding');
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Failed to check onboarding status:', error);
      // Default to onboarding for new users, dashboard for existing
      if (isNewUser) {
        setView('onboarding');
        setShowOnboarding(true);
      } else {
        // For existing users, check localStorage as fallback
        const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
        setView(hasCompletedOnboarding ? 'dashboard' : 'onboarding');
        setShowOnboarding(!hasCompletedOnboarding);
      }
    }
  };

  const handleOnboardingComplete = (campaignId) => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
    // If a welcome campaign was generated, pass it to dashboard
    if (campaignId) {
      setWelcomeCampaignId(campaignId);
    }
    setView('dashboard');
  };

  const handleSkipOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setShowOnboarding(false);
    setView('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('onboarding_completed');
    setToken(null);
    setIsAuthenticated(false);
    setView('login');
  };

  // Show loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding
  if (view === 'onboarding' && isAuthenticated && showOnboarding) {
    return (
      <EnhancedOnboarding 
        token={token} 
        onComplete={handleOnboardingComplete}
        onSkip={handleSkipOnboarding}
        onBackToLanding={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('onboarding_completed');
          setToken(null);
          setIsAuthenticated(false);
          setView('login');
        }}
      />
    );
  }

  // Show dashboard
  if (view === 'dashboard' && isAuthenticated) {
    return (
      <DashboardLayout 
        token={token} 
        onLogout={handleLogout}
        welcomeCampaignId={welcomeCampaignId}
        onWelcomeCampaignHandled={() => setWelcomeCampaignId(null)}
      />
    );
  }

  // Show login page
  return <LoginPage onLogin={handleLogin} />;
}
