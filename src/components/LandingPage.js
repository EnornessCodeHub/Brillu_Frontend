import React, { useState, useEffect } from 'react';
import { Mail } from 'lucide-react';
import { Button } from './ui/button';
import Hero from './Hero';
import Features from './Features';
import Pricing from './Pricing';
import Footer from './Footer';
import SignUpModal from './SignUpModal';

export default function LandingPage({ onLogin, isAuthenticated: authProp, onNavigateToDashboard }) {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(authProp || false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signup'); // 'signup' or 'login'
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsAuthenticated(authProp || !!token);
  }, [authProp, token]);

  const handleGetStarted = () => {
    const playgroundSection = document.getElementById('playground');
    if (playgroundSection) {
      playgroundSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignUpRequired = () => {
    setShowSignUpModal(true);
  };

  const handleAuthSuccess = (newToken, isNewUser = true) => {
    setToken(newToken);
    localStorage.setItem('token', newToken);
    setIsAuthenticated(true);
    setShowSignUpModal(false);
    if (onLogin) {
      onLogin(newToken, isNewUser);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setIsAuthenticated(false);
  };

  const handleDashboardClick = () => {
    if (onNavigateToDashboard) {
      onNavigateToDashboard();
    }
  };

  const handleNavigateToOnboarding = () => {
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    
    if (!hasCompletedOnboarding || hasCompletedOnboarding === 'false') {
      if (onLogin) {
        onLogin(token, true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-spark to-spark-hover flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Brillu</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Features
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                Pricing
              </a>
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={handleDashboardClick}>
                    Dashboard
                  </Button>
                  <Button variant="outline" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" onClick={() => { setAuthModalMode('login'); setShowSignUpModal(true); }}>
                    Sign In
                  </Button>
                  <Button onClick={() => { setAuthModalMode('signup'); setShowSignUpModal(true); }}>
                    Sign Up
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-accent/10 transition-colors flex items-center justify-center"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-t border-border shadow-lg">
            <div className="container mx-auto px-6 py-4 flex flex-col gap-3">
              <a href="#features" className="text-sm font-medium py-2 border-b border-border hover:text-primary transition-colors"
                 onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#pricing" className="text-sm font-medium py-2 border-b border-border hover:text-primary transition-colors"
                 onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              {isAuthenticated ? (
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="ghost" className="justify-start"
                    onClick={() => { handleDashboardClick(); setMobileMenuOpen(false); }}>Dashboard</Button>
                  <Button variant="outline" className="justify-start"
                    onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Logout</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 pt-2">
                  <Button variant="ghost" className="justify-start"
                    onClick={() => { setAuthModalMode('login'); setShowSignUpModal(true); setMobileMenuOpen(false); }}>Sign In</Button>
                  <Button className="justify-start"
                    onClick={() => { setAuthModalMode('signup'); setShowSignUpModal(true); setMobileMenuOpen(false); }}>Sign Up</Button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Add padding-top to account for fixed navbar */}
      <div className="pt-16">
        {/* Main Content */}
        <Hero 
          onGetStarted={handleGetStarted} 
          isAuthenticated={isAuthenticated}
          token={token}
          onSignUpRequired={handleSignUpRequired}
          onNavigateToDashboard={handleDashboardClick}
          onNavigateToOnboarding={handleNavigateToOnboarding}
        />
        
        <Features />
        
        <Pricing onSignUp={() => setShowSignUpModal(true)} />
        
        <Footer />

        {/* Sign Up Modal */}
        <SignUpModal
          isOpen={showSignUpModal}
          onClose={() => setShowSignUpModal(false)}
          onSuccess={handleAuthSuccess}
          initialMode={authModalMode}
        />
      </div>
    </div>
  );
}
