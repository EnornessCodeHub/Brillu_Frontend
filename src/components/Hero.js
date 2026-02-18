import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Sparkles, ArrowRight } from 'lucide-react';

const prompts = [
  "Create a summer sale email for active users featuring promo code 'SUMMER20' for additional 20% discount",
  "Create a black friday sale launch email",
  "Create a thank you email for new sign ups featuring customer reviews and top selling products",
];

export default function Hero({ onGetStarted, isAuthenticated, onSignUpRequired, onNavigateToDashboard, onNavigateToOnboarding }) {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [userPrompt, setUserPrompt] = useState(""); // For actual user input
  const [isInputActive, setIsInputActive] = useState(false); // Track if user is typing

  useEffect(() => {
    if (isInputActive) return; // Don't animate if user is typing
    
    const currentPrompt = prompts[currentPromptIndex];
    
    if (isTyping) {
      if (displayedText.length < currentPrompt.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentPrompt.slice(0, displayedText.length + 1));
        }, 50);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => {
          setIsTyping(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      const timeout = setTimeout(() => {
        setDisplayedText("");
        setCurrentPromptIndex((prev) => (prev + 1) % prompts.length);
        setIsTyping(true);
      }, 500);
      return () => clearTimeout(timeout);
    }
  }, [displayedText, isTyping, currentPromptIndex, isInputActive]);

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      onSignUpRequired();
      return;
    }

    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (hasCompletedOnboarding === 'true') {
      onNavigateToDashboard();
    } else {
      onNavigateToOnboarding();
    }
  };

  const handlePromptClick = () => {
    setIsInputActive(true);
  };

  const handlePromptChange = (e) => {
    setUserPrompt(e.target.value);
  };

  const handlePromptBlur = () => {
    if (!userPrompt.trim()) {
      setIsInputActive(false);
    }
  };

  const handleGenerateFromHero = () => {
    if (!userPrompt.trim()) return;
    
    if (!isAuthenticated) {
      onSignUpRequired();
      return;
    }

    // Store the prompt and navigate to dashboard
    sessionStorage.setItem('hero_prompt', userPrompt);
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    if (hasCompletedOnboarding === 'true') {
      onNavigateToDashboard();
    } else {
      onNavigateToOnboarding();
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-transparent to-gray-50" />
      <div className="absolute top-20 right-20 w-96 h-96 bg-gray-200 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 left-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
      
      <div className="w-full max-w-7xl mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left column - Text content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-sunny-soft to-sunny-glow/30 border border-sunny-glow/50 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-spark animate-pulse" />
              <span className="text-sm font-semibold bg-gradient-to-r from-spark to-spark-hover bg-clip-text text-transparent">
                AI-Powered Email Creation
              </span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
              Generate brilliant emails{" "}
              <span className="bg-gradient-to-r from-spark via-spark-hover to-spark-active bg-clip-text text-transparent">
                in seconds
              </span>{" "}
              with AI
            </h1>

            {/* Subheading */}
            <p className="text-xl text-muted-foreground leading-relaxed">
              Generate stunning HTML email templates with product feeds, custom
              images, and seamless ESP integration. No coding required.
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="gap-2 text-base px-8 py-6 shadow-lg shadow-spark/30 hover:shadow-xl hover:shadow-spark/40 transition-shadow"
                onClick={handleGetStarted}
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8 py-6 backdrop-blur-sm"
              >
                Learn More
              </Button>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-4">
              <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border">
                <div className="text-3xl font-bold bg-gradient-to-r from-spark to-spark-hover bg-clip-text text-transparent">10,000+</div>
                <div className="text-sm text-muted-foreground">Emails Created</div>
              </div>
              <div className="p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border">
                <div className="text-3xl font-bold bg-gradient-to-r from-spark to-spark-hover bg-clip-text text-transparent">98%</div>
                <div className="text-sm text-muted-foreground">Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Right column - Animated prompt showcase */}
          <div className="relative h-[500px] lg:h-[600px]">
            {/* Animated background blurs */}
            <div className="absolute -inset-8 bg-gradient-to-r from-gray-300 to-gray-200 rounded-3xl blur-3xl animate-pulse" />

            <div className="relative h-full">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gray-300 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-gray-200 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full blur-2xl"
                  style={{ animation: 'spin 20s linear infinite' }}
                />
              </div>

              {/* Prompt showcase card */}
              <div className="relative h-full flex items-center justify-center p-8 lg:p-12">
                <div className="w-full max-w-2xl">
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        What kind of email do you want to create?
                      </label>
                      {!isInputActive ? (
                        <div
                          className="min-h-[120px] p-4 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-lg cursor-text hover:border-gray-400 transition-colors"
                          onClick={handlePromptClick}
                        >
                          <p className="text-foreground leading-relaxed">
                            {displayedText}
                            <span className="inline-block w-0.5 h-5 bg-spark ml-1 animate-pulse" />
                          </p>
                        </div>
                      ) : (
                        <textarea
                          className="min-h-[120px] w-full p-4 bg-white/80 backdrop-blur-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-spark focus:border-transparent text-foreground leading-relaxed resize-none"
                          placeholder="Type your email prompt here..."
                          value={userPrompt}
                          onChange={handlePromptChange}
                          onBlur={handlePromptBlur}
                          autoFocus
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      {/* <div className="flex gap-2 flex-1">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-sunny-soft/50 border border-sunny-glow/30 rounded-lg text-sm">
                          <div className="w-2 h-2 rounded-full bg-spark" />
                          Hero Image
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-sunny-soft/50 border border-sunny-glow/30 rounded-lg text-sm">
                          <div className="w-2 h-2 rounded-full bg-spark-hover" />
                          Products
                        </div>
                      </div> */}
                      <button
                        className="px-6 py-2 bg-gradient-to-r from-spark to-spark-hover text-white rounded-lg font-medium shadow-lg shadow-spark/30 hover:shadow-xl hover:shadow-spark/40 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleGenerateFromHero}
                        disabled={isInputActive && !userPrompt.trim()}
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
