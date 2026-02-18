import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../config/api.config';

export default function PreferencesModal({ isOpen, onClose, token }) {
  const [activeTab, setActiveTab] = useState('brand');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [brandInfo, setBrandInfo] = useState([{
    brandName: '',
    targetAudience: '',
    niche: '',
    brandVoice: '',
    colors: '',
    tagline: ''
  }]);

  const [organizationInfo, setOrganizationInfo] = useState({
    companyName: '',
    industry: '',
    size: '',
    website: '',
    description: ''
  });

  const [userInfo, setUserInfo] = useState({
    fullName: '',
    role: '',
    goals: '',
    favoriteEmailTypes: ''
  });

  // Load existing preferences when modal opens
  useEffect(() => {
    if (isOpen && token) {
      loadPreferences();
    }
  }, [isOpen, token]);

  const loadPreferences = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.exists && response.data.data) {
        const prefs = response.data.data;
        if (prefs.brandInfo && prefs.brandInfo.length > 0) {
          setBrandInfo(prefs.brandInfo);
        }
        if (prefs.organizationInfo) {
          setOrganizationInfo(prefs.organizationInfo);
        }
        if (prefs.userInfo) {
          setUserInfo(prefs.userInfo);
        }
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setError('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(
        `${API}/api/preferences`,
        {
          brandInfo,
          organizationInfo,
          userInfo
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSuccess('Preferences saved successfully! 🎉');
      setTimeout(() => {
        setSuccess('');
        onClose(true); // Pass true to indicate preferences were updated
      }, 1500);
    } catch (err) {
      console.error('Error saving preferences:', err);
      setError(err.response?.data?.details || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const addBrand = () => {
    setBrandInfo([...brandInfo, {
      brandName: '',
      targetAudience: '',
      niche: '',
      brandVoice: '',
      colors: '',
      tagline: ''
    }]);
  };

  const removeBrand = (index) => {
    if (brandInfo.length > 1) {
      const newBrands = brandInfo.filter((_, i) => i !== index);
      setBrandInfo(newBrands);
    }
  };

  const updateBrand = (index, field, value) => {
    const newBrands = [...brandInfo];
    newBrands[index][field] = value;
    setBrandInfo(newBrands);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && onClose()}>
      <div className="preferences-modal">
        <div className="modal-header">
          <h2>⚙️ Your Preferences</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="modal-loading">
            <div className="spinner"></div>
            <p>Loading preferences...</p>
          </div>
        ) : (
          <>
            <div className="modal-tabs">
              <button
                className={`tab ${activeTab === 'brand' ? 'active' : ''}`}
                onClick={() => setActiveTab('brand')}
              >
                🏷️ Brand
              </button>
              <button
                className={`tab ${activeTab === 'organization' ? 'active' : ''}`}
                onClick={() => setActiveTab('organization')}
              >
                🏢 Organization
              </button>
              <button
                className={`tab ${activeTab === 'user' ? 'active' : ''}`}
                onClick={() => setActiveTab('user')}
              >
                👤 Personal
              </button>
            </div>

            <div className="modal-content">
              {/* Brand Info Tab */}
              {activeTab === 'brand' && (
                <div className="tab-content">
                  <p className="tab-description">
                    Add your brand information to personalize email generation. You can have multiple brands!
                  </p>
                  
                  {brandInfo.map((brand, index) => (
                    <div key={index} className="brand-card">
                      <div className="brand-card-header">
                        <h3>Brand {brandInfo.length > 1 ? `#${index + 1}` : ''}</h3>
                        {brandInfo.length > 1 && (
                          <button
                            className="btn-remove-brand"
                            onClick={() => removeBrand(index)}
                            title="Remove brand"
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                      <div className="form-group">
                        <label>Brand Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Nike, Apple, Your Company"
                          value={brand.brandName}
                          onChange={(e) => updateBrand(index, 'brandName', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Niche / Industry</label>
                        <input
                          type="text"
                          placeholder="e.g., Sports Apparel, Technology, E-commerce"
                          value={brand.niche}
                          onChange={(e) => updateBrand(index, 'niche', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Target Audience</label>
                        <input
                          type="text"
                          placeholder="e.g., Athletes, Tech enthusiasts, Young professionals"
                          value={brand.targetAudience}
                          onChange={(e) => updateBrand(index, 'targetAudience', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Brand Voice</label>
                        <input
                          type="text"
                          placeholder="e.g., Energetic, Professional, Friendly"
                          value={brand.brandVoice}
                          onChange={(e) => updateBrand(index, 'brandVoice', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Brand Colors</label>
                        <input
                          type="text"
                          placeholder="e.g., Blue and Orange, #FF5733"
                          value={brand.colors}
                          onChange={(e) => updateBrand(index, 'colors', e.target.value)}
                        />
                      </div>

                      <div className="form-group">
                        <label>Tagline</label>
                        <input
                          type="text"
                          placeholder="e.g., Just Do It, Think Different"
                          value={brand.tagline}
                          onChange={(e) => updateBrand(index, 'tagline', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}

                  <button className="btn-add-brand" onClick={addBrand}>
                    ➕ Add Another Brand
                  </button>
                </div>
              )}

              {/* Organization Info Tab */}
              {activeTab === 'organization' && (
                <div className="tab-content">
                  <p className="tab-description">
                    Tell us about your organization to generate more relevant emails.
                  </p>

                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      type="text"
                      placeholder="Your company name"
                      value={organizationInfo.companyName}
                      onChange={(e) => setOrganizationInfo({ ...organizationInfo, companyName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Industry</label>
                    <input
                      type="text"
                      placeholder="e.g., SaaS, E-commerce, Retail"
                      value={organizationInfo.industry}
                      onChange={(e) => setOrganizationInfo({ ...organizationInfo, industry: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Company Size</label>
                    <select
                      value={organizationInfo.size}
                      onChange={(e) => setOrganizationInfo({ ...organizationInfo, size: e.target.value })}
                    >
                      <option value="">Select size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-1000">201-1000 employees</option>
                      <option value="1000+">1000+ employees</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={organizationInfo.website}
                      onChange={(e) => setOrganizationInfo({ ...organizationInfo, website: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      rows={4}
                      placeholder="Brief description of what your company does..."
                      value={organizationInfo.description}
                      onChange={(e) => setOrganizationInfo({ ...organizationInfo, description: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* User Info Tab */}
              {activeTab === 'user' && (
                <div className="tab-content">
                  <p className="tab-description">
                    Personal preferences to help us understand your email marketing goals.
                  </p>

                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      placeholder="Your full name"
                      value={userInfo.fullName}
                      onChange={(e) => setUserInfo({ ...userInfo, fullName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Your Role</label>
                    <input
                      type="text"
                      placeholder="e.g., Marketing Manager, CEO, Founder"
                      value={userInfo.role}
                      onChange={(e) => setUserInfo({ ...userInfo, role: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Email Marketing Goals</label>
                    <textarea
                      rows={4}
                      placeholder="What do you want to achieve with email marketing? e.g., Increase sales, Build brand awareness, Nurture leads..."
                      value={userInfo.goals}
                      onChange={(e) => setUserInfo({ ...userInfo, goals: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Favorite Email Types</label>
                    <input
                      type="text"
                      placeholder="e.g., Newsletters, Product launches, Promotions"
                      value={userInfo.favoriteEmailTypes}
                      onChange={(e) => setUserInfo({ ...userInfo, favoriteEmailTypes: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="modal-error">
                ❌ {error}
              </div>
            )}

            {success && (
              <div className="modal-success">
                ✅ {success}
              </div>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner"></span> Saving...
                  </>
                ) : (
                  '💾 Save Preferences'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

