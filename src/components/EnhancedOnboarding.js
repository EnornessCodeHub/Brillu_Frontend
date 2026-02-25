import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, Upload, X, ArrowLeft } from 'lucide-react';
import API from '../config/api.config';

const STEPS = [
  'Brand Basics',
  'Brand Voice & Colors',
  'Summary'
];

// Preset tone options for dropdown
const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional', description: 'Formal, business-focused communication' },
  { value: 'friendly', label: 'Friendly', description: 'Warm, approachable, conversational' },
  { value: 'casual', label: 'Casual', description: 'Relaxed, informal tone' },
  { value: 'authoritative', label: 'Authoritative', description: 'Expert, confident, trustworthy' },
  { value: 'playful', label: 'Playful', description: 'Fun, energetic, lighthearted' },
  { value: 'inspirational', label: 'Inspirational', description: 'Motivating, uplifting, empowering' },
  { value: 'custom', label: 'Custom', description: 'Define your own tone' }
];

export default function EnhancedOnboarding({ token, onComplete, onBackToLanding }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1: Brand Basics
  const [brandName, setBrandName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const [brandType, setBrandType] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productServiceDescription, setProductServiceDescription] = useState('');

  // Step 2: Brand Voice & Colors
  const [brandPersonality, setBrandPersonality] = useState('');
  const [valueProposition, setValueProposition] = useState([]);
  const [valuePropositionInput, setValuePropositionInput] = useState('');
  const [selectedTone, setSelectedTone] = useState('');
  const [customToneName, setCustomToneName] = useState('');
  const [toneIntensity, setToneIntensity] = useState(3);
  const [negativeKeywords, setNegativeKeywords] = useState([]);
  const [negativeKeywordInput, setNegativeKeywordInput] = useState('');
  
  // Email Colors
  const [emailColors, setEmailColors] = useState({
    content_area_background: '#FFFFFF',
    background_color: '#F5F5F5',
    cta_color: '#000000',
    header_color: '#333333',
    footer_color: '#666666'
  });

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      // Convert tone to object format (single tone with intensity)
      const toneName = selectedTone === 'custom' ? customToneName : selectedTone;
      const toneOfVoiceSliders = toneName ? { [toneName]: toneIntensity } : {};

      // Build brand info with new simplified structure
      const brandInfo = {
        brandIdentity: {
          brand_name: brandName,
          brand_logo: logoUrl ? {
            url: logoUrl,
            width: 200,
            height: 80
          } : undefined,
          brand_type: brandType,
          target_audience: targetAudience,
          product_service_description: productServiceDescription,
          brand_personality: brandPersonality,
          value_proposition: valueProposition,
          tone_of_voice_sliders: toneOfVoiceSliders,
          negative_keywords: negativeKeywords,
          email_colors: emailColors,
        },
        ...(heroImageUrl && { heroImage: { url: heroImageUrl } }),
        visualDesign: {
          // Keep some defaults for visual design
          email_width: '600px',
          spacing_rules: 'medium',
          button_style: 'rounded',
          font: 'Arial, sans-serif'
        },
        copyMessaging: {
          writing_style: 'professional',
          headline_tone: 'engaging',
          headline_preferred_length: 'medium',
          body_tone: 'conversational',
          body_preferred_length: 'medium'
        },
        structureComponents: {
          email_structure_preference: ['Header', 'Hero', 'Content', 'CTA', 'Footer'],
          include_navigation: false,
          include_testimonials: false,
          include_final_cta_section: true,
          include_footer_social_icons: true
        }
      };

      // Save to backend
      await axios.post(`${API}/api/preferences`, {
        brandInfo: [brandInfo]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Trigger welcome email generation
      try {
        // Check for hero prompt from landing page
        const heroPrompt = sessionStorage.getItem('hero_prompt');

        const welcomeResponse = await axios.post(
          `${API}/api/ai/generate-welcome-email`,
          {
            customPrompt: heroPrompt || null  // Pass hero prompt if exists
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Clear hero prompt after use
        if (heroPrompt) {
          sessionStorage.removeItem('hero_prompt');
        }

        // Pass the welcome campaign ID to onComplete
        if (onComplete) {
          onComplete(welcomeResponse.data?.campaignId);
        }
      } catch (welcomeError) {
        console.error('Welcome email generation failed:', welcomeError);
        // Still complete onboarding even if welcome email fails
        if (onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('brandIndex', '0');

    try {
      const response = await axios.post(`${API}/api/media/upload-logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      const logoUrlToSet = response.data.logoUrl || response.data.logo?.url || response.data.asset?.url;
      if (logoUrlToSet) {
        const fullUrl = logoUrlToSet.startsWith('http') 
          ? logoUrlToSet 
          : `${API}${logoUrlToSet}`;
        setLogoUrl(fullUrl);
      }
      e.target.value = '';
    } catch (error) {
      console.error('Logo upload error:', error);
      alert(`Upload failed: ${error.response?.data?.error || error.message || 'Failed to upload logo'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHeroImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingHeroImage(true);
    const formData = new FormData();
    formData.append('heroImage', file);
    formData.append('brandIndex', '0');

    try {
      const response = await axios.post(`${API}/api/media/upload-hero-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const url = response.data.heroImageUrl || response.data.asset?.url;
      if (url) {
        const fullUrl = url.startsWith('http') ? url : `${API}${url}`;
        setHeroImageUrl(fullUrl);
      }
      e.target.value = '';
    } catch (error) {
      console.error('Hero image upload error:', error);
      alert(`Upload failed: ${error.response?.data?.error || error.message || 'Failed to upload hero image'}`);
    } finally {
      setUploadingHeroImage(false);
    }
  };

  const addTag = (array, setArray, input, setInput) => {
    if (input.trim() && !array.includes(input.trim())) {
      setArray([...array, input.trim()]);
      setInput('');
    }
  };

  const removeTag = (array, setArray, index) => {
    setArray(array.filter((_, i) => i !== index));
  };

  const handleColorChange = (key, value) => {
    setEmailColors(prev => ({ ...prev, [key]: value }));
  };

  const handleBackToLanding = () => {
    // Clear token and redirect to landing page
    localStorage.removeItem('token');
    localStorage.removeItem('onboarding_completed');
    if (onBackToLanding) {
      onBackToLanding();
    } else {
      // Fallback: reload page to go to landing
      window.location.href = '/';
    }
  };

  return (
    <div className="onboarding-wizard">
      {/* Back Button - Top Left */}
      <button
        onClick={handleBackToLanding}
        className="fixed top-3 left-3 sm:top-5 sm:left-5 z-50 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back to Sign in</span>
        <span className="sm:hidden">Back</span>
      </button>

      <div className="wizard-container">
        {/* Progress Bar */}
        <div className="wizard-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="progress-steps">
            {STEPS.map((step, index) => (
              <div
                key={index}
                className={`progress-step ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
              >
                <div className="step-number">{index < currentStep ? '✓' : index + 1}</div>
                <div className="step-label">{step}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="wizard-content">
          {/* Step 1: Brand Basics */}
          {currentStep === 0 && (
            <div className="step-card">
              <h2>Brand Basics</h2>
              <p>Tell us about your brand</p>

              <div className="form-group">
                <label>Brand Name *</label>
                <input
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="e.g., Acme Corp"
                />
              </div>

              <div className="form-group">
                <label>Brand Logo (optional)</label>
                <div className="logo-upload-area">
                  {logoUrl ? (
                    <div className="logo-preview">
                      <img src={logoUrl} alt="Brand logo" />
                      <button 
                        className="remove-logo" 
                        onClick={() => setLogoUrl('')}
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-trigger">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        hidden
                      />
                      {uploadingLogo ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6" />
                          <span>Click to upload</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Hero / Banner Image <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span></label>
                <p className="form-help">Used in your welcome email hero section</p>
                <div className="logo-upload-area">
                  {heroImageUrl ? (
                    <div className="logo-preview">
                      <img src={heroImageUrl} alt="Hero banner" style={{ maxWidth: '100%', maxHeight: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                      <button
                        className="remove-logo"
                        onClick={() => setHeroImageUrl('')}
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="upload-trigger">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleHeroImageUpload}
                        disabled={uploadingHeroImage}
                        hidden
                      />
                      {uploadingHeroImage ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6" />
                          <span>Click to upload hero image</span>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Brand Type *</label>
                <input
                  type="text"
                  value={brandType}
                  onChange={(e) => setBrandType(e.target.value)}
                  placeholder="e.g., SaaS, E-commerce, Agency, Healthcare, Education"
                />
                <p className="form-help">What type of business is your brand?</p>
              </div>

              <div className="form-group">
                <label>Target Audience *</label>
                <textarea
                  rows={2}
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g., Tech-savvy professionals aged 25-40 who value productivity"
                />
              </div>

              <div className="form-group">
                <label>Product/Service Description *</label>
                <textarea
                  rows={3}
                  value={productServiceDescription}
                  onChange={(e) => setProductServiceDescription(e.target.value)}
                  placeholder="Describe what your brand offers..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Brand Voice & Colors */}
          {currentStep === 1 && (
            <div className="step-card">
              <h2>Brand Voice & Colors</h2>
              <p>Define how your brand communicates</p>

              <div className="form-group">
                <label>Brand Personality</label>
                <input
                  type="text"
                  value={brandPersonality}
                  onChange={(e) => setBrandPersonality(e.target.value)}
                  placeholder="e.g., Professional yet approachable, innovative, trustworthy"
                />
                <p className="form-help">Describe your brand's personality in a sentence</p>
              </div>

              <div className="form-group">
                <label>Value Proposition</label>
                <div className="tag-list">
                  {valueProposition.map((item, index) => (
                    <span key={index} className="tag">
                      {item}
                      <button onClick={() => removeTag(valueProposition, setValueProposition, index)} className="tag-remove">×</button>
                    </span>
                  ))}
                </div>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={valuePropositionInput}
                    onChange={(e) => setValuePropositionInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag(valueProposition, setValueProposition, valuePropositionInput, setValuePropositionInput)}
                    placeholder="e.g., Save time, Reduce costs, Premium quality"
                  />
                  <button onClick={() => addTag(valueProposition, setValueProposition, valuePropositionInput, setValuePropositionInput)} className="btn btn-secondary">Add</button>
                </div>
              </div>

              <div className="form-group">
                <label>Tone of Voice *</label>
                <select
                  value={selectedTone}
                  onChange={(e) => setSelectedTone(e.target.value)}
                  className="tone-select"
                >
                  <option value="">Select a tone...</option>
                  {TONE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                
                {selectedTone === 'custom' && (
                  <div className="custom-tone-input">
                    <input
                      type="text"
                      value={customToneName}
                      onChange={(e) => setCustomToneName(e.target.value)}
                      placeholder="Enter your custom tone name"
                    />
                  </div>
                )}
                
                {selectedTone && (
                  <div className="tone-intensity">
                    <label>Intensity Level</label>
                    <div className="slider-container">
                      <span className="slider-min">1</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={toneIntensity}
                        onChange={(e) => setToneIntensity(parseInt(e.target.value))}
                        className="tone-slider"
                      />
                      <span className="slider-max">5</span>
                      <span className="slider-value">{toneIntensity}</span>
                    </div>
                    <p className="form-help">1 = Subtle, 5 = Very Strong</p>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Negative Keywords (words to avoid)</label>
                <div className="tag-list negative">
                  {negativeKeywords.map((item, index) => (
                    <span key={index} className="tag negative">
                      {item}
                      <button onClick={() => removeTag(negativeKeywords, setNegativeKeywords, index)} className="tag-remove">×</button>
                    </span>
                  ))}
                </div>
                <div className="input-with-button">
                  <input
                    type="text"
                    value={negativeKeywordInput}
                    onChange={(e) => setNegativeKeywordInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag(negativeKeywords, setNegativeKeywords, negativeKeywordInput, setNegativeKeywordInput)}
                    placeholder="e.g., cheap, limited time, hurry"
                  />
                  <button onClick={() => addTag(negativeKeywords, setNegativeKeywords, negativeKeywordInput, setNegativeKeywordInput)} className="btn btn-secondary">Add</button>
                </div>
              </div>

              <div className="form-group">
                <label>Email Colors</label>
                <div className="color-grid">
                  <div className="color-item">
                    <label>Content Area Background</label>
                    <div className="color-input-row">
                      <input
                        type="color"
                        value={emailColors.content_area_background}
                        onChange={(e) => handleColorChange('content_area_background', e.target.value)}
                      />
                      <input
                        type="text"
                        value={emailColors.content_area_background}
                        onChange={(e) => handleColorChange('content_area_background', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="color-item">
                    <label>Background Color</label>
                    <div className="color-input-row">
                      <input
                        type="color"
                        value={emailColors.background_color}
                        onChange={(e) => handleColorChange('background_color', e.target.value)}
                      />
                      <input
                        type="text"
                        value={emailColors.background_color}
                        onChange={(e) => handleColorChange('background_color', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="color-item">
                    <label>CTA Button Color</label>
                    <div className="color-input-row">
                      <input
                        type="color"
                        value={emailColors.cta_color}
                        onChange={(e) => handleColorChange('cta_color', e.target.value)}
                      />
                      <input
                        type="text"
                        value={emailColors.cta_color}
                        onChange={(e) => handleColorChange('cta_color', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="color-item">
                    <label>Header Color</label>
                    <div className="color-input-row">
                      <input
                        type="color"
                        value={emailColors.header_color}
                        onChange={(e) => handleColorChange('header_color', e.target.value)}
                      />
                      <input
                        type="text"
                        value={emailColors.header_color}
                        onChange={(e) => handleColorChange('header_color', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="color-item">
                    <label>Footer Color</label>
                    <div className="color-input-row">
                      <input
                        type="color"
                        value={emailColors.footer_color}
                        onChange={(e) => handleColorChange('footer_color', e.target.value)}
                      />
                      <input
                        type="text"
                        value={emailColors.footer_color}
                        onChange={(e) => handleColorChange('footer_color', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {currentStep === 2 && (
            <div className="step-card">
              <h2>Summary</h2>
              <p>Review your brand settings before completing setup</p>

              <div className="summary-section">
                <h3>Brand Basics</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <strong>Brand Name:</strong>
                    <span>{brandName || 'Not set'}</span>
                  </div>
                  <div className="summary-item">
                    <strong>Brand Type:</strong>
                    <span>{brandType || 'Not set'}</span>
                  </div>
                  <div className="summary-item">
                    <strong>Target Audience:</strong>
                    <span>{targetAudience || 'Not set'}</span>
                  </div>
                  <div className="summary-item full-width">
                    <strong>Product/Service:</strong>
                    <span>{productServiceDescription || 'Not set'}</span>
                  </div>
                  {logoUrl && (
                    <div className="summary-item">
                      <strong>Logo:</strong>
                      <img src={logoUrl} alt="Logo" className="summary-logo" />
                    </div>
                  )}
                  {heroImageUrl && (
                    <div className="summary-item full-width">
                      <strong>Hero Image:</strong>
                      <img src={heroImageUrl} alt="Hero" style={{ maxWidth: '100%', maxHeight: '80px', objectFit: 'cover', borderRadius: '4px', marginTop: '4px' }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="summary-section">
                <h3>Brand Voice</h3>
                <div className="summary-grid">
                  <div className="summary-item full-width">
                    <strong>Personality:</strong>
                    <span>{brandPersonality || 'Not set'}</span>
                  </div>
                  <div className="summary-item full-width">
                    <strong>Value Proposition:</strong>
                    <span>{valueProposition.length > 0 ? valueProposition.join(', ') : 'Not set'}</span>
                  </div>
                  <div className="summary-item full-width">
                    <strong>Tone of Voice:</strong>
                    <span>
                      {selectedTone ? (
                        <>
                          {selectedTone === 'custom' ? customToneName : TONE_OPTIONS.find(t => t.value === selectedTone)?.label}
                          {' '}(Intensity: {toneIntensity}/5)
                        </>
                      ) : 'Not set'}
                    </span>
                  </div>
                  {negativeKeywords.length > 0 && (
                    <div className="summary-item full-width">
                      <strong>Avoid Words:</strong>
                      <span className="negative-keywords">{negativeKeywords.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="summary-section">
                <h3>Email Colors</h3>
                <div className="color-preview-grid">
                  {Object.entries(emailColors).map(([key, value]) => (
                    <div key={key} className="color-preview-item">
                      <div className="color-swatch" style={{ backgroundColor: value }} />
                      <span>{key.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="welcome-email-notice">
                <p>After completing setup, we'll generate a welcome email using your brand settings to help you get started!</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="wizard-navigation">
          {currentStep > 0 && (
            <button onClick={handleBack} className="btn btn-secondary" disabled={loading}>
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            className="btn btn-primary"
            disabled={loading || 
              (currentStep === 0 && (!brandName || !brandType || !targetAudience || !productServiceDescription)) ||
              (currentStep === 1 && (!selectedTone || (selectedTone === 'custom' && !customToneName)))
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : currentStep === STEPS.length - 1 ? (
              'Complete Setup'
            ) : (
              'Next'
            )}
          </button>
        </div>
      </div>

      <style>{`
        .logo-upload-area {
          border: 2px dashed #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
        }
        .upload-trigger {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: #6b7280;
        }
        .upload-trigger:hover {
          color: #000000;
        }
        .logo-preview {
          position: relative;
          display: inline-block;
        }
        .logo-preview img {
          max-width: 200px;
          max-height: 80px;
        }
        .remove-logo {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .tone-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          font-size: 14px;
          background: white;
        }
        .tone-select:focus {
          outline: none;
          border-color: #000000;
        }
        .custom-tone-input {
          margin-top: 12px;
        }
        .custom-tone-input input {
          width: 100%;
        }
        .tone-intensity {
          margin-top: 16px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
        }
        .tone-intensity > label {
          display: block;
          font-weight: 500;
          font-size: 14px;
          margin-bottom: 12px;
        }
        .slider-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .slider-min, .slider-max {
          font-size: 12px;
          color: #9ca3af;
          width: 16px;
          text-align: center;
        }
        .tone-slider {
          flex: 1;
          -webkit-appearance: none;
          height: 6px;
          border-radius: 3px;
          background: #e5e7eb;
        }
        .tone-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #000000;
          cursor: pointer;
        }
        .slider-value {
          width: 24px;
          text-align: center;
          font-weight: 600;
          color: #000000;
        }
        .tag.negative {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        .color-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .color-item label {
          display: block;
          font-size: 13px;
          margin-bottom: 6px;
          color: #4b5563;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .summary-item.full-width {
          grid-column: 1 / -1;
        }
        .summary-item strong {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
        }
        .summary-item span {
          font-size: 14px;
        }
        .summary-logo {
          max-width: 120px;
          max-height: 60px;
        }
        .negative-keywords {
          color: #dc2626;
        }
        .color-preview-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
        }
        .color-preview-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .color-swatch {
          width: 24px;
          height: 24px;
          border-radius: 4px;
          border: 1px solid #e5e7eb;
        }
        .color-preview-item span {
          font-size: 12px;
          text-transform: capitalize;
        }
        .welcome-email-notice {
          margin-top: 24px;
          padding: 16px;
          background: linear-gradient(135deg, #00000015, #33333315);
          border-radius: 8px;
          border-left: 4px solid #000000;
        }
        .welcome-email-notice p {
          margin: 0;
          font-size: 14px;
          color: #4b5563;
        }
        .wizard-navigation {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          margin-top: 24px;
        }
        @media (max-width: 480px) {
          .color-grid {
            grid-template-columns: 1fr;
          }
          .summary-grid {
            grid-template-columns: 1fr;
          }
          .wizard-navigation {
            flex-direction: column;
            gap: 8px;
          }
          .wizard-navigation .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
