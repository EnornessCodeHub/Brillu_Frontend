import React, { useState, useEffect } from 'react';
import axios from 'axios';

import API from '../../config/api.config';

export function HeaderSettings({ token }) {
  const [header, setHeader] = useState({
    logoPosition: 'center', // left, center, right
    showLogo: true,
    showNavigation: false,
    navigationLinks: [],
    padding: 'medium' // small, medium, large
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

  // Load current header preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await axios.get(`${API}/api/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.exists && response.data.data.emailHeader) {
          setHeader(response.data.data.emailHeader);
        }
      } catch (error) {
        console.error('Error loading header preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Auto-add pending nav link before saving (only if both label and URL are filled)
      let flushHeader = { ...header };
      if (newLinkLabel.trim() && newLinkUrl.trim()) {
        flushHeader.navigationLinks = [...flushHeader.navigationLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }];
        setNewLinkLabel('');
        setNewLinkUrl('');
        setHeader(flushHeader);
      }

      // Fetch existing preferences
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const existingData = response.data.data || {};

      // Save with updated header — exclude mediaAssets to prevent stale overwrite
      const { mediaAssets, lastUpdated, ...safeData } = existingData;
      await axios.put(`${API}/api/preferences`, {
        ...safeData,
        emailHeader: flushHeader
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Email header saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save header preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addNavigationLink = () => {
    if (newLinkLabel.trim() && newLinkUrl.trim()) {
      setHeader({
        ...header,
        navigationLinks: [...header.navigationLinks, { label: newLinkLabel.trim(), url: newLinkUrl.trim() }]
      });
      setNewLinkLabel('');
      setNewLinkUrl('');
    }
  };

  const removeNavigationLink = (index) => {
    setHeader({
      ...header,
      navigationLinks: header.navigationLinks.filter((_, i) => i !== index)
    });
  };

  if (loading) {
    return (
      <div className="section-card">
        <h2>Email Header Settings</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="section-card">
      <h2>Email Header Settings</h2>

      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <input
          type="checkbox"
          id="showLogo"
          checked={header.showLogo}
          onChange={(e) => setHeader({ ...header, showLogo: e.target.checked })}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="showLogo" style={{ margin: 0, cursor: 'pointer' }}>Show Logo in Header</label>
      </div>

      {header.showLogo && (
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px' }}>Logo Position</label>
          <select
            value={header.logoPosition}
            onChange={(e) => setHeader({ ...header, logoPosition: e.target.value })}
            style={{ width: '100%', maxWidth: '200px' }}
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </div>
      )}

      <div className="form-group" style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '6px' }}>Header Padding</label>
        <select
          value={header.padding}
          onChange={(e) => setHeader({ ...header, padding: e.target.value })}
          style={{ width: '100%', maxWidth: '200px' }}
        >
          <option value="small">Small (10px)</option>
          <option value="medium">Medium (20px)</option>
          <option value="large">Large (30px)</option>
        </select>
      </div>

      <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <input
          type="checkbox"
          id="showNavigation"
          checked={header.showNavigation}
          onChange={(e) => setHeader({ ...header, showNavigation: e.target.checked })}
          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
        />
        <label htmlFor="showNavigation" style={{ margin: 0, cursor: 'pointer' }}>Show Navigation Links</label>
      </div>

      {header.showNavigation && (
        <div className="form-group">
          <label>Navigation Links</label>
          <div style={{ marginBottom: '10px' }}>
            {header.navigationLinks.map((link, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
                <span>{link.label}</span>
                <span style={{ color: '#888' }}>→</span>
                <span style={{ color: '#666', fontSize: '0.9em' }}>{link.url}</span>
                <button
                  type="button"
                  onClick={() => removeNavigationLink(index)}
                  style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              value={newLinkLabel}
              onChange={(e) => setNewLinkLabel(e.target.value)}
              placeholder="Link Label"
              style={{ flex: 1 }}
            />
            <input
              type="url"
              value={newLinkUrl}
              onChange={(e) => setNewLinkUrl(e.target.value)}
              placeholder="https://..."
              style={{ flex: 2 }}
            />
            <button type="button" className="btn btn-secondary" onClick={addNavigationLink}>
              Add
            </button>
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Header'}
      </button>
    </div>
  );
}

export function FooterEditor({ token }) {
  const [footer, setFooter] = useState({
    companyAddress: '',
    contactEmail: '',
    phone: '',
    unsubscribeText: 'Unsubscribe from our emails',
    legalText: '',
    showSocialLinks: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load current footer preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await axios.get(`${API}/api/preferences`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.exists && response.data.data.emailFooter) {
          setFooter(response.data.data.emailFooter);
        }
      } catch (error) {
        console.error('Error loading footer preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, [token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Fetch existing preferences
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const existingData = response.data.data || {};

      // Save with updated footer — exclude mediaAssets to prevent stale overwrite
      const { mediaAssets: _ma, lastUpdated: _lu, ...safeFooterData } = existingData;
      await axios.put(`${API}/api/preferences`, {
        ...safeFooterData,
        emailFooter: footer
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Email footer saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save footer preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="section-card">
        <h2>Email Footer Editor</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="section-card">
      <h2>Email Footer Editor</h2>

      <div className="form-group">
        <label>Company Address</label>
        <input
          type="text"
          value={footer.companyAddress}
          onChange={(e) => setFooter({ ...footer, companyAddress: e.target.value })}
          placeholder="123 Main St, City, State 12345"
        />
      </div>

      <div className="form-group">
        <label>Contact Email</label>
        <input
          type="email"
          value={footer.contactEmail}
          onChange={(e) => setFooter({ ...footer, contactEmail: e.target.value })}
          placeholder="contact@company.com"
        />
      </div>

      <div className="form-group">
        <label>Phone</label>
        <input
          type="tel"
          value={footer.phone}
          onChange={(e) => setFooter({ ...footer, phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
        />
      </div>

      <div className="form-group">
        <label>Unsubscribe Text</label>
        <input
          type="text"
          value={footer.unsubscribeText}
          onChange={(e) => setFooter({ ...footer, unsubscribeText: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>Unsubscribe URL</label>
        <input
          type="url"
          value={footer.unsubscribeUrl || ''}
          onChange={(e) => setFooter({ ...footer, unsubscribeUrl: e.target.value })}
          placeholder="https://yoursite.com/unsubscribe"
        />
        <small style={{ color: '#6b7280', fontSize: '12px' }}>
          If provided, the unsubscribe text will become a clickable link
        </small>
      </div>

      <div className="form-group">
        <label>Legal Text / Copyright</label>
        <textarea
          value={footer.legalText}
          onChange={(e) => setFooter({ ...footer, legalText: e.target.value })}
          placeholder="© 2024 Company Name. All rights reserved."
          rows={2}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', marginBottom: '16px' }}>
        <input
          type="checkbox"
          id="showSocialLinks"
          checked={footer.showSocialLinks}
          onChange={(e) => setFooter({ ...footer, showSocialLinks: e.target.checked })}
          style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
        />
        <label htmlFor="showSocialLinks" style={{ margin: 0, cursor: 'pointer', fontSize: '14px' }}>
          Show social media links in footer
        </label>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Footer'}
      </button>
    </div>
  );
}

