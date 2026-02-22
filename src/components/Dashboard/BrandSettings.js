import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import API from '../../config/api.config';

// Default tone sliders
const DEFAULT_TONE_SLIDERS = {
  Formality: 3,
  Energy: 3,
  Warmth: 3,
  Technical: 3
};

export function BrandIdentity({ token }) {
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(0);
  const [brandData, setBrandData] = useState({
    brandIdentity: {
      brand_name: '',
      brand_type: '',
      product_service_description: '',
      target_audience: '',
      industry: '',
      unique_selling_proposition: '',
      brand_personality: '',
      brand_values: [],
      value_proposition: [],
      tone_of_voice_sliders: DEFAULT_TONE_SLIDERS,
      negative_keywords: [],
      email_colors: {
        content_area_background: '#FFFFFF',
        background_color: '#F5F5F5',
        cta_color: '#000000',
        header_color: '#333333',
        footer_color: '#666666'
      }
    }
  });
  const [uploading, setUploading] = useState(false);
  const [valuesInput, setValuesInput] = useState('');
  const [valuePropositionInput, setValuePropositionInput] = useState('');
  const [negativeKeywordInput, setNegativeKeywordInput] = useState('');
  const [customSliderName, setCustomSliderName] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.exists && response.data.data.brandInfo) {
        setBrands(response.data.data.brandInfo);
        if (response.data.data.brandInfo[selectedBrand]) {
          const brand = response.data.data.brandInfo[selectedBrand];
          // Map existing data or initialize new structure
          setBrandData({
            brandIdentity: {
              brand_name: brand.brandIdentity?.brand_name || brand.brandName || '',
              brand_type: brand.brandIdentity?.brand_type || '',
              product_service_description: brand.brandIdentity?.product_service_description || '',
              target_audience: brand.brandIdentity?.target_audience || brand.targetAudience || '',
              industry: brand.brandIdentity?.industry || brand.niche || '',
              unique_selling_proposition: brand.brandIdentity?.unique_selling_proposition || brand.tagline || '',
              brand_personality: brand.brandIdentity?.brand_personality || '',
              brand_values: brand.brandIdentity?.brand_values || [],
              value_proposition: brand.brandIdentity?.value_proposition || [],
              tone_of_voice_sliders: brand.brandIdentity?.tone_of_voice_sliders || DEFAULT_TONE_SLIDERS,
              negative_keywords: brand.brandIdentity?.negative_keywords || [],
              email_colors: brand.brandIdentity?.email_colors || brand.visualDesign?.email_colors || {
                content_area_background: '#FFFFFF',
                background_color: '#F5F5F5',
                cta_color: '#000000',
                header_color: '#333333',
                footer_color: '#666666'
              }
            },
            // Preserve other sections
            visualDesign: brand.visualDesign || {},
            copyMessaging: brand.copyMessaging || {},
            structureComponents: brand.structureComponents || {},
            socialMedia: brand.socialMedia || {},
            logo: (() => {
              const logo = brand.logo || brand.brandIdentity?.brand_logo || {};
              // Convert relative logo URL to full URL
              if (logo.url && !logo.url.startsWith('http')) {
                logo.url = `${API}${logo.url}`;
              }
              return logo;
            })()
          });
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('brandIndex', selectedBrand);

    try {
      const response = await axios.post(`${API}/api/media/upload-logo`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Logo upload response:', response.data);
      
      // Get logo URL from response and convert to full URL
      const logoUrlFromResponse = response.data.logoUrl || response.data.logo?.url || response.data.asset?.url;
      const fullLogoUrl = logoUrlFromResponse && !logoUrlFromResponse.startsWith('http') 
        ? `${API}${logoUrlFromResponse}` 
        : logoUrlFromResponse;
      
      // Immediately update local state with new logo
      if (fullLogoUrl) {
        setBrands(prevBrands => {
          const updatedBrands = [...prevBrands];
          if (!updatedBrands[selectedBrand]) {
            updatedBrands[selectedBrand] = { brandIdentity: {}, logo: {} };
          }
          if (!updatedBrands[selectedBrand].brandIdentity) {
            updatedBrands[selectedBrand].brandIdentity = {};
          }
          updatedBrands[selectedBrand].brandIdentity.brand_logo = {
            url: fullLogoUrl,
            width: 200,
            height: 200
          };
          updatedBrands[selectedBrand].logo = {
            url: fullLogoUrl,
            width: 200,
            height: 200
          };
          return updatedBrands;
        });
        
        // Also update brandData
        setBrandData(prev => ({
          ...prev,
          logo: {
            url: fullLogoUrl,
            width: 200,
            height: 200
          }
        }));
      }
      
      alert('Logo uploaded successfully!');
      loadPreferences(); // Reload to sync with backend
      e.target.value = ''; // Reset file input
    } catch (error) {
      console.error('Logo upload error:', error);
      console.error('Error response:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to upload logo';
      alert(`Upload failed: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Auto-add pending inputs before saving
      const flushIdentity = { ...brandData.brandIdentity };
      if (valuesInput.trim()) {
        flushIdentity.brand_values = [...(flushIdentity.brand_values || []), valuesInput.trim()];
        setValuesInput('');
      }
      if (valuePropositionInput.trim()) {
        flushIdentity.value_proposition = [...(flushIdentity.value_proposition || []), valuePropositionInput.trim()];
        setValuePropositionInput('');
      }
      if (negativeKeywordInput.trim()) {
        flushIdentity.negative_keywords = [...(flushIdentity.negative_keywords || []), negativeKeywordInput.trim()];
        setNegativeKeywordInput('');
      }

      const updatedBrands = [...brands];
      // Ensure we preserve other fields of the brand while updating identity
      updatedBrands[selectedBrand] = {
        ...updatedBrands[selectedBrand],
        brandIdentity: {
          ...updatedBrands[selectedBrand]?.brandIdentity,
          ...flushIdentity
        },
        // Also update legacy fields for backward compatibility if needed, or just rely on new structure
        brandName: flushIdentity.brand_name // Keep legacy field for now just in case
      };

      const response = await axios.post(`${API}/api/preferences`, {
        brandInfo: updatedBrands
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Save response:', response.data);
      alert('Brand identity saved successfully! ✅');
      loadPreferences();
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to save';
      alert(`Save failed: ${errorMsg}. Please check your inputs and try again.`);
    }
  };

  const updateIdentity = (field, value) => {
    setBrandData(prev => ({
      ...prev,
      brandIdentity: {
        ...prev.brandIdentity,
        [field]: value
      }
    }));
  };

  const addArrayItem = (field, input, setInput) => {
    if (input.trim()) {
      const currentItems = brandData.brandIdentity[field] || [];
      updateIdentity(field, [...currentItems, input.trim()]);
      setInput('');
    }
  };

  const removeArrayItem = (field, index) => {
    const currentItems = brandData.brandIdentity[field] || [];
    updateIdentity(field, currentItems.filter((_, i) => i !== index));
  };

  const handleSliderChange = (name, value) => {
    updateIdentity('tone_of_voice_sliders', {
      ...brandData.brandIdentity.tone_of_voice_sliders,
      [name]: value
    });
  };

  const addCustomSlider = () => {
    if (customSliderName.trim() && !brandData.brandIdentity.tone_of_voice_sliders[customSliderName.trim()]) {
      updateIdentity('tone_of_voice_sliders', {
        ...brandData.brandIdentity.tone_of_voice_sliders,
        [customSliderName.trim()]: 3
      });
      setCustomSliderName('');
    }
  };

  const removeSlider = (name) => {
    const newSliders = { ...brandData.brandIdentity.tone_of_voice_sliders };
    delete newSliders[name];
    updateIdentity('tone_of_voice_sliders', newSliders);
  };

  const handleColorChange = (key, value) => {
    updateIdentity('email_colors', {
      ...brandData.brandIdentity.email_colors,
      [key]: value
    });
  };

  return (
    <div className="section-card">
      <h2>🎨 Brand Identity</h2>

      <div className="form-group">
        <label>Brand Name *</label>
        <input
          type="text"
          value={brandData.brandIdentity.brand_name}
          onChange={(e) => updateIdentity('brand_name', e.target.value)}
          placeholder="e.g., Nike"
        />
      </div>

      <div className="form-group">
        <label>Logo</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          disabled={uploading}
        />
        {(() => {
          const logoUrl = brands[selectedBrand]?.brandIdentity?.brand_logo?.url || brands[selectedBrand]?.logo?.url || brandData?.logo?.url;
          if (!logoUrl) return null;
          const fullLogoUrl = logoUrl && !logoUrl.startsWith('http') ? `${API}${logoUrl}` : logoUrl;
          return (
            <div style={{ marginTop: '10px' }}>
              <img
                src={fullLogoUrl}
                alt="Logo"
                style={{ maxWidth: '200px', maxHeight: '200px', border: '1px solid #ddd', padding: '5px' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          );
        })()}
      </div>

      <div className="form-group">
        <label>Brand Type</label>
        <select
          value={brandData.brandIdentity.brand_type}
          onChange={(e) => updateIdentity('brand_type', e.target.value)}
        >
          <option value="">Select...</option>
          <option value="saas">SaaS</option>
          <option value="ecommerce">E-commerce</option>
          <option value="agency">Agency</option>
          <option value="media">Media</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="form-group">
        <label>Product/Service Description</label>
        <textarea
          value={brandData.brandIdentity.product_service_description}
          onChange={(e) => updateIdentity('product_service_description', e.target.value)}
          placeholder="Describe what your brand offers..."
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Tagline / USP</label>
        <input
          type="text"
          value={brandData.brandIdentity.unique_selling_proposition}
          onChange={(e) => updateIdentity('unique_selling_proposition', e.target.value)}
          placeholder="e.g., Just Do It"
        />
      </div>

      <div className="form-group">
        <label>Brand Personality</label>
        <input
          type="text"
          value={brandData.brandIdentity.brand_personality}
          onChange={(e) => updateIdentity('brand_personality', e.target.value)}
          placeholder="e.g., Professional yet approachable, innovative, trustworthy"
        />
        <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>Describe your brand's personality in a sentence</p>
      </div>

      <div className="form-group">
        <label>Value Proposition</label>
        <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
          {brandData.brandIdentity.value_proposition?.map((item, index) => (
            <span key={index} className="tag" style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              {item}
              <button onClick={() => removeArrayItem('value_proposition', index)} style={{ marginLeft: '5px', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={valuePropositionInput}
            onChange={(e) => setValuePropositionInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addArrayItem('value_proposition', valuePropositionInput, setValuePropositionInput)}
            placeholder="e.g., Save time, Reduce costs"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button className="btn btn-secondary flex-shrink-0" onClick={() => addArrayItem('value_proposition', valuePropositionInput, setValuePropositionInput)}>Add</button>
        </div>
      </div>

      <div className="form-group">
        <label>Tone of Voice Sliders</label>
        <div className="flex flex-col gap-3 mt-2">
          {Object.entries(brandData.brandIdentity.tone_of_voice_sliders || {}).map(([name, value]) => (
            <div key={name} className="bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between mb-2">
                <span style={{ fontWeight: '500', fontSize: '14px' }}>{name}</span>
                {!['Formality', 'Energy', 'Warmth', 'Technical'].includes(name) && (
                  <button onClick={() => removeSlider(name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>1</span>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={value}
                  onChange={(e) => handleSliderChange(name, parseInt(e.target.value))}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>5</span>
                <span style={{ fontWeight: '600', color: '#000000', width: '20px', textAlign: 'center' }}>{value}</span>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <input
            type="text"
            value={customSliderName}
            onChange={(e) => setCustomSliderName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCustomSlider()}
            placeholder="Custom slider name"
            style={{ flex: 1 }}
          />
          <button className="btn btn-secondary" onClick={addCustomSlider}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Brand Values</label>
        <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
          {brandData.brandIdentity.brand_values?.map((item, index) => (
            <span key={index} className="tag" style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              {item}
              <button onClick={() => removeArrayItem('brand_values', index)} style={{ marginLeft: '5px', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={valuesInput}
            onChange={(e) => setValuesInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addArrayItem('brand_values', valuesInput, setValuesInput)}
            placeholder="e.g., Innovation, Quality"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button className="btn btn-secondary flex-shrink-0" onClick={() => addArrayItem('brand_values', valuesInput, setValuesInput)}>Add</button>
        </div>
      </div>

      <div className="form-group">
        <label>Negative Keywords (words to avoid)</label>
        <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
          {brandData.brandIdentity.negative_keywords?.map((item, index) => (
            <span key={index} className="tag" style={{ background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              {item}
              <button onClick={() => removeArrayItem('negative_keywords', index)} style={{ marginLeft: '5px', border: 'none', background: 'none', cursor: 'pointer', color: '#dc2626' }}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={negativeKeywordInput}
            onChange={(e) => setNegativeKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addArrayItem('negative_keywords', negativeKeywordInput, setNegativeKeywordInput)}
            placeholder="e.g., cheap, limited time, hurry"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button className="btn btn-secondary flex-shrink-0" onClick={() => addArrayItem('negative_keywords', negativeKeywordInput, setNegativeKeywordInput)}>Add</button>
        </div>
      </div>

      <div className="form-group">
        <label>Target Audience</label>
        <textarea
          value={brandData.brandIdentity.target_audience}
          onChange={(e) => updateIdentity('target_audience', e.target.value)}
          placeholder="e.g., Athletes aged 18-35, fitness enthusiasts"
          rows={3}
        />
      </div>

      <div className="form-group">
        <label>Niche/Industry</label>
        <input
          type="text"
          value={brandData.brandIdentity.industry}
          onChange={(e) => updateIdentity('industry', e.target.value)}
          placeholder="e.g., Sports Apparel"
        />
      </div>

      <div className="form-group">
        <label>Email Colors</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          {Object.entries(brandData.brandIdentity.email_colors || {}).map(([key, value]) => (
            <div key={key}>
              <label style={{ fontSize: '13px', marginBottom: '4px', display: 'block', textTransform: 'capitalize' }}>
                {key.replace(/_/g, ' ')}
              </label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{ width: '40px', height: '32px', padding: '0', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        💾 Save Brand Identity
      </button>
    </div>
  );
}

export function VisualDesignSettings({ token }) {
  const [visualDesign, setVisualDesign] = useState({
    font: 'Arial, sans-serif',
    email_width: '600px',
    spacing_rules: 'medium',
    button_style: 'rounded',
    visual_style_keywords: [],
    email_mood: '',
    visual_complexity: ['medium'],
    cta_alignment: 'center',
    default_cta_url: ''
  });
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(0);
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.exists && response.data.data.brandInfo) {
        setBrands(response.data.data.brandInfo);
        if (response.data.data.brandInfo[selectedBrand]) {
          const brand = response.data.data.brandInfo[selectedBrand];
          setVisualDesign({
            font: brand.visualDesign?.font || brand.typography?.headingFont || 'Arial, sans-serif',
            email_width: brand.visualDesign?.email_width || '600px',
            spacing_rules: brand.visualDesign?.spacing_rules || 'medium',
            button_style: brand.visualDesign?.button_style || 'rounded',
            visual_style_keywords: brand.visualDesign?.visual_style_keywords || [],
            email_mood: brand.visualDesign?.email_mood || '',
            visual_complexity: brand.visualDesign?.visual_complexity || ['medium'],
            cta_alignment: brand.visualDesign?.cta_alignment || 'center',
            default_cta_url: brand.visualDesign?.default_cta_url || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Auto-add pending keyword before saving
      const flushDesign = { ...visualDesign };
      if (keywordInput.trim()) {
        flushDesign.visual_style_keywords = [...(flushDesign.visual_style_keywords || []), keywordInput.trim()];
        setKeywordInput('');
      }

      const updatedBrands = [...brands];
      updatedBrands[selectedBrand] = {
        ...updatedBrands[selectedBrand],
        visualDesign: {
          ...updatedBrands[selectedBrand]?.visualDesign,
          ...flushDesign
        }
      };

      const response = await axios.post(`${API}/api/preferences`, {
        brandInfo: updatedBrands
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Save response:', response.data);
      alert('Visual Design settings saved successfully! ✅');
      loadPreferences();
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to save';
      alert(`Save failed: ${errorMsg}. Please try again.`);
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim()) {
      setVisualDesign(prev => ({
        ...prev,
        visual_style_keywords: [...prev.visual_style_keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (index) => {
    setVisualDesign(prev => ({
      ...prev,
      visual_style_keywords: prev.visual_style_keywords.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="section-card">
      <h2>✏️ Visual Design</h2>

      <h3>Typography</h3>
      <div className="form-group">
        <label>Font Family</label>
        <select
          value={visualDesign.font}
          onChange={(e) => setVisualDesign({ ...visualDesign, font: e.target.value })}
        >
          <option value="Arial, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', serif">Times New Roman</option>
          <option value="'Helvetica Neue', sans-serif">Helvetica</option>
        </select>
      </div>

      <h3>Layout & Style</h3>
      <div className="form-group">
        <label>Email Width</label>
        <input
          type="text"
          value={visualDesign.email_width}
          onChange={(e) => setVisualDesign({ ...visualDesign, email_width: e.target.value })}
          placeholder="e.g., 600px"
        />
      </div>

      <div className="form-group">
        <label>Spacing Rules</label>
        <select value={visualDesign.spacing_rules} onChange={(e) => setVisualDesign({ ...visualDesign, spacing_rules: e.target.value })}>
          <option value="tight">Tight</option>
          <option value="medium">Medium</option>
          <option value="loose">Loose</option>
        </select>
      </div>

      <div className="form-group">
        <label>Button Style</label>
        <select value={visualDesign.button_style} onChange={(e) => setVisualDesign({ ...visualDesign, button_style: e.target.value })}>
          <option value="rounded">Rounded</option>
          <option value="square">Square</option>
          <option value="pill">Pill</option>
          <option value="outlined">Outlined</option>
        </select>
      </div>

      <div className="form-group">
        <label>CTA Alignment</label>
        <select value={visualDesign.cta_alignment} onChange={(e) => setVisualDesign({ ...visualDesign, cta_alignment: e.target.value })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </div>

      <div className="form-group">
        <label>Default CTA URL</label>
        <input
          type="url"
          value={visualDesign.default_cta_url}
          onChange={(e) => setVisualDesign({ ...visualDesign, default_cta_url: e.target.value })}
          placeholder="https://yoursite.com/landing"
        />
        <small style={{ color: '#6b7280', fontSize: '12px' }}>
          Applied to CTA buttons when no specific link is set
        </small>
      </div>

      <div className="form-group">
        <label>Visual Style Keywords</label>
        <div className="tag-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '5px' }}>
          {visualDesign.visual_style_keywords?.map((item, index) => (
            <span key={index} className="tag" style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}>
              {item}
              <button onClick={() => removeKeyword(index)} style={{ marginLeft: '5px', border: 'none', background: 'none', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="e.g., minimal, bold"
            style={{ flex: 1, minWidth: 0 }}
          />
          <button className="btn btn-secondary flex-shrink-0" onClick={addKeyword}>Add</button>
        </div>
      </div>

      <div className="form-group">
        <label>Email Mood</label>
        <select value={visualDesign.email_mood} onChange={(e) => setVisualDesign({ ...visualDesign, email_mood: e.target.value })}>
          <option value="">Select mood...</option>
          <option value="luxury">Luxury</option>
          <option value="bold">Bold</option>
          <option value="minimal">Minimal</option>
          <option value="clean">Clean</option>
          <option value="streetwear">Streetwear</option>
          <option value="rugged">Rugged</option>
          <option value="high-energy">High-Energy</option>
          <option value="soft">Soft</option>
        </select>
      </div>

      <div className="form-group">
        <label>Visual Complexity</label>
        <select value={visualDesign.visual_complexity[0] || 'medium'} onChange={(e) => setVisualDesign({ ...visualDesign, visual_complexity: [e.target.value] })}>
          <option value="minimal">Minimal</option>
          <option value="medium">Medium</option>
          <option value="rich">Rich</option>
          <option value="ultra-minimal">Ultra-Minimal</option>
          <option value="highly-detailed">Highly-Detailed</option>
        </select>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        💾 Save Visual Design
      </button>
    </div>
  );
}

export function WritingStyle({ token }) {
  const [saving, setSaving] = useState(false);
  const [copyMessaging, setCopyMessaging] = useState({
    writing_style: 'professional',
    headline_tone: 'engaging',
    headline_preferred_length: 'medium',
    body_tone: 'conversational',
    body_preferred_length: 'medium'
  });
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(0);

  useEffect(() => {
    loadPreferences();
  }, [token]);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.exists && response.data.data.brandInfo) {
        setBrands(response.data.data.brandInfo);
        if (response.data.data.brandInfo[selectedBrand]) {
          const brand = response.data.data.brandInfo[selectedBrand];
          setCopyMessaging({
            writing_style: brand.copyMessaging?.writing_style || brand.writingStyle?.tone || 'professional',
            headline_tone: brand.copyMessaging?.headline_tone || 'engaging',
            headline_preferred_length: brand.copyMessaging?.headline_preferred_length || 'medium',
            body_tone: brand.copyMessaging?.body_tone || 'conversational',
            body_preferred_length: brand.copyMessaging?.body_preferred_length || brand.writingStyle?.length || 'medium'
          });
        }
      }
    } catch (error) {
      console.error('Error loading writing style preferences:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedBrands = [...brands];
      updatedBrands[selectedBrand] = {
        ...updatedBrands[selectedBrand],
        copyMessaging: {
          ...updatedBrands[selectedBrand]?.copyMessaging,
          ...copyMessaging
        }
      };

      const response = await axios.post(`${API}/api/preferences`, {
        brandInfo: updatedBrands
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Save response:', response.data);
      alert('Writing style saved successfully! ✅');
      loadPreferences();
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to save';
      alert(`Save failed: ${errorMsg}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="section-card">
      <h2>📝 Writing Style</h2>

      <div className="form-group">
        <label>Writing Style</label>
        <select value={copyMessaging.writing_style} onChange={(e) => setCopyMessaging({ ...copyMessaging, writing_style: e.target.value })}>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
        </select>
      </div>

      <div className="form-group">
        <label>Headline Tone</label>
        <input
          type="text"
          value={copyMessaging.headline_tone}
          onChange={(e) => setCopyMessaging({ ...copyMessaging, headline_tone: e.target.value })}
          placeholder="e.g., engaging, bold, subtle"
        />
      </div>

      <div className="form-group">
        <label>Headline Length</label>
        <select value={copyMessaging.headline_preferred_length} onChange={(e) => setCopyMessaging({ ...copyMessaging, headline_preferred_length: e.target.value })}>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>

      <div className="form-group">
        <label>Body Tone</label>
        <input
          type="text"
          value={copyMessaging.body_tone}
          onChange={(e) => setCopyMessaging({ ...copyMessaging, body_tone: e.target.value })}
          placeholder="e.g., conversational, formal, friendly"
        />
      </div>

      <div className="form-group">
        <label>Body Length</label>
        <select value={copyMessaging.body_preferred_length} onChange={(e) => setCopyMessaging({ ...copyMessaging, body_preferred_length: e.target.value })}>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>

      <button className="btn btn-primary" onClick={handleSave}>
        💾 Save Writing Style
      </button>
    </div>
  );
}

const SIZE_PX = { small: 20, medium: 30, large: 40 };

const PREVIEW_ICONS_SVG = [
  // Facebook
  "M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951",
  // Instagram
  "M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.174-1.433-.372-1.942a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334",
  // Twitter / X
  "M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z",
  // LinkedIn
  "M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854zm4.943 12.248V6.169H2.542v7.225zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248S2.4 3.226 2.4 3.934c0 .694.521 1.248 1.327 1.248zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016l.016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225z",
];

const KNOWN_PLATFORMS = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'pinterest', label: 'Pinterest' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'discord', label: 'Discord' },
  { key: 'reddit', label: 'Reddit' },
  { key: 'threads', label: 'Threads' }
];

export function SocialMedia({ token }) {
  const [saving, setSaving] = useState(false);
  const [social, setSocial] = useState({});
  const [iconTheme, setIconTheme] = useState('brandedCircle');
  const [iconSize, setIconSize] = useState('medium');
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customName, setCustomName] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowCustomInput(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  useEffect(() => {
    loadPreferences();
  }, [token]);

  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.exists && response.data.data.brandInfo) {
        setBrands(response.data.data.brandInfo);
        if (response.data.data.brandInfo[selectedBrand]) {
          const brand = response.data.data.brandInfo[selectedBrand];
          // Only keep entries that have a key (filter out empty)
          const saved = brand.socialMedia || {};
          const filtered = {};
          for (const [k, v] of Object.entries(saved)) {
            if (k && !['iconTheme', 'iconSize'].includes(k)) filtered[k] = v || '';
          }
          setSocial(filtered);
          // Migrate old theme names to new style IDs
          const oldToNew = { colored: 'brandedCircle', monochrome: 'grayCircle', dark: 'darkCircle', light: 'whiteCircle' };
          const rawTheme = saved.iconTheme || 'brandedCircle';
          setIconTheme(oldToNew[rawTheme] || rawTheme);
          setIconSize(saved.iconSize || 'medium');
        }
      }
    } catch (error) {
      console.error('Error loading social media preferences:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedBrands = [...brands];
      updatedBrands[selectedBrand] = {
        ...updatedBrands[selectedBrand],
        socialMedia: { ...social, iconTheme, iconSize }
      };

      const response = await axios.post(`${API}/api/preferences`, {
        brandInfo: updatedBrands
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Save response:', response.data);
      alert('Social media links saved successfully!');
      loadPreferences();
    } catch (error) {
      console.error('Save error:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.details || error.message || 'Failed to save';
      alert(`Save failed: ${errorMsg}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Platforms already added — used to filter dropdown
  const addedKeys = Object.keys(social);
  const availablePlatforms = KNOWN_PLATFORMS.filter(p => !addedKeys.includes(p.key));

  const addPlatform = (key, label) => {
    setSocial(prev => ({ ...prev, [key]: '' }));
    setShowDropdown(false);
    setShowCustomInput(false);
    setCustomName('');
  };

  const removePlatform = (key) => {
    setSocial(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const addCustomPlatform = () => {
    const key = customName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || addedKeys.includes(key)) return;
    addPlatform(key);
  };

  const getLabelForKey = (key) => {
    const known = KNOWN_PLATFORMS.find(p => p.key === key);
    if (known) return known.label;
    // Custom platform — capitalize
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="section-card">
      <h2>Social Media Links</h2>

      {Object.keys(social).length === 0 && (
        <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '15px' }}>
          No social media links added yet. Click the button below to add one.
        </p>
      )}

      {Object.entries(social).map(([platform, url]) => (
        <div key={platform} className="form-group" style={{ position: 'relative' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{getLabelForKey(platform)}</span>
            <button
              onClick={() => removePlatform(platform)}
              title="Remove"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '2px 6px', borderRadius: '4px', fontSize: '14px', lineHeight: 1 }}
            >
              <X size={14} />
            </button>
          </label>
          <input
            type="url"
            value={url || ''}
            onChange={(e) => setSocial({ ...social, [platform]: e.target.value })}
            placeholder={`https://${platform.replace(/_/g, '')}.com/yourprofile`}
          />
        </div>
      ))}

      {/* Icon Style Visual Picker */}
      <div className="form-group">
        <label>Icon Style</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '8px' }}>
          {[
            { id: 'brandedCircle', label: 'Branded Circle', colors: ['#1877F2','#C32AA3','#000000','#0A66C2'], radius: '50%', iconColor: '#fff' },
            { id: 'brandedRounded', label: 'Branded Rounded', colors: ['#1877F2','#C32AA3','#000000','#0A66C2'], radius: '6px', iconColor: '#fff' },
            { id: 'brandedSquare', label: 'Branded Square', colors: ['#1877F2','#C32AA3','#000000','#0A66C2'], radius: '0px', iconColor: '#fff' },
            { id: 'darkCircle', label: 'Dark Circle', colors: ['#000','#000','#000','#000'], radius: '50%', iconColor: '#fff' },
            { id: 'darkRounded', label: 'Dark Rounded', colors: ['#1A1A1A','#1A1A1A','#1A1A1A','#1A1A1A'], radius: '6px', iconColor: '#fff' },
            { id: 'darkSquare', label: 'Dark Square', colors: ['#000','#000','#000','#000'], radius: '0px', iconColor: '#fff' },
            { id: 'grayCircle', label: 'Gray Circle', colors: ['#999','#999','#999','#999'], radius: '50%', iconColor: '#fff' },
            { id: 'grayRounded', label: 'Gray Rounded', colors: ['#999','#999','#999','#999'], radius: '6px', iconColor: '#fff' },
            { id: 'whiteCircle', label: 'White Circle', colors: ['#fff','#fff','#fff','#fff'], radius: '50%', iconColor: '#333', border: '1px solid #e2e8f0' },
            { id: 'pastelCircle', label: 'Pastel Circle', colors: ['#A8C7FA','#E8A0CC','#A0D2F5','#A0C4E8'], radius: '50%', iconColor: '#fff' },
            { id: 'brandMatchCircle', label: 'Brand Match', colors: ['#ff5757','#ff5757','#ff5757','#ff5757'], radius: '50%', iconColor: '#fff' },
            { id: 'ghostRounded', label: 'Ghost / Frosted', colors: ['#F0F0F0','#F0F0F0','#F0F0F0','#F0F0F0'], radius: '10px', iconColor: '#666', border: '1px solid #e2e8f0' },
          ].map(style => (
            <div
              key={style.id}
              onClick={() => setIconTheme(style.id)}
              style={{
                padding: '12px 8px',
                borderRadius: '8px',
                border: iconTheme === style.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                backgroundColor: iconTheme === style.id ? '#eff6ff' : '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', marginBottom: '6px' }}>
                {PREVIEW_ICONS_SVG.map((path, i) => {
                  const boxPx = SIZE_PX[iconSize];
                  return (
                    <div key={i} style={{
                      width: boxPx, height: boxPx,
                      borderRadius: style.radius,
                      backgroundColor: style.colors[i],
                      border: style.border || 'none',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg viewBox="0 0 16 16" width={boxPx * 0.6} height={boxPx * 0.6}
                           fill={style.iconColor} xmlns="http://www.w3.org/2000/svg">
                        <path d={path} />
                      </svg>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: '11px', color: iconTheme === style.id ? '#1d4ed8' : '#6b7280', fontWeight: iconTheme === style.id ? 600 : 400 }}>
                {style.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Icon Size Selector */}
      <div className="form-group">
        <label>Icon Size</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          {[
            { id: 'small', label: 'Small', px: '20px' },
            { id: 'medium', label: 'Medium', px: '30px' },
            { id: 'large', label: 'Large', px: '40px' },
          ].map(size => (
            <button
              key={size.id}
              type="button"
              onClick={() => setIconSize(size.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: iconSize === size.id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                backgroundColor: iconSize === size.id ? '#eff6ff' : '#fff',
                color: iconSize === size.id ? '#1d4ed8' : '#374151',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: iconSize === size.id ? 600 : 400,
                transition: 'all 0.15s',
              }}
            >
              {size.label} ({size.px})
            </button>
          ))}
        </div>
      </div>

      {/* Add Social Link */}
      <div ref={dropdownRef} style={{ position: 'relative', marginBottom: '15px' }}>
        <button
          className="btn btn-secondary"
          onClick={() => { setShowDropdown(!showDropdown); setShowCustomInput(false); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={16} /> Add Social Link
        </button>

        {showDropdown && (
          <div style={{
            // position: 'absolute', 
            top: '100%', left: 0, zIndex: 10, marginTop: '4px',
            background: 'var(--background, #fff)', border: '1px solid var(--border, #e2e8f0)',
            borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: '220px',
            maxHeight: '260px', overflowY: 'auto'
          }}>
            {availablePlatforms.map(p => (
              <button
                key={p.key}
                onClick={() => addPlatform(p.key)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                  border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
                  borderBottom: '1px solid var(--border, #f1f1f1)'
                }}
                onMouseEnter={e => e.target.style.background = 'var(--accent, #f5f5f5)'}
                onMouseLeave={e => e.target.style.background = 'none'}
              >
                {p.label}
              </button>
            ))}
            {/* Other option */}
            <button
              onClick={() => setShowCustomInput(true)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
                border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px',
                fontStyle: 'italic', color: '#6B7280'
              }}
              onMouseEnter={e => e.target.style.background = 'var(--accent, #f5f5f5)'}
              onMouseLeave={e => e.target.style.background = 'none'}
            >
              Other...
            </button>

            {showCustomInput && (
              <div style={{ padding: '10px 14px', display: 'flex', gap: '6px', borderTop: '1px solid var(--border, #e2e8f0)' }}>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomPlatform()}
                  placeholder="Platform name"
                  style={{ flex: 1, padding: '6px 10px', fontSize: '13px', borderRadius: '4px', border: '1px solid var(--border, #e2e8f0)' }}
                  autoFocus
                />
                <button
                  className="btn btn-secondary"
                  onClick={addCustomPlatform}
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Add
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Social Media'}
      </button>
    </div>
  );
}


