import React, { useState, useEffect } from 'react';
import { Sparkles, Check, Eye, Palette, Grid3x3, Minimize2, X } from 'lucide-react';

import API from '../../config/api.config';

export default function TemplateGallery({ onSelectTemplate, selectedTemplateId, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [previewHTML, setPreviewHTML] = useState('');
  const [thumbnailCache, setThumbnailCache] = useState({});

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async (retryCount = 0) => {
    const MAX_RETRIES = 3;
    let shouldRetry = false;

    setLoading(true);
    setError(null);

    try {
      setError(null);
      console.log('🔍 [TemplateGallery] Fetching templates from:', `${API}/api/templates`);
      console.log('🔍 [TemplateGallery] API value:', API);
      const response = await fetch(`${API}/api/templates`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if response is OK (status 200-299)
      if (!response.ok) {
        throw new Error(`Server responded with status: ${response.status}`);
      }

      // Verify content type is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server did not return JSON data');
      }

      const data = await response.json();

      // Validate data structure
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      const templatesData = data.templates || [];

      // Validate templates is an array
      if (!Array.isArray(templatesData)) {
        throw new Error('Templates data is not an array');
      }

      setTemplates(templatesData);
      setError(null);

      // Fetch thumbnails for all templates
      templatesData.forEach(template => {
        if (template && template.id) {
          fetchThumbnail(template.id);
        }
      });
    } catch (error) {
      console.error('Failed to fetch templates:', error);

      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && (error.name === 'TypeError' || error.message.includes('Failed to fetch'))) {
        console.log(`Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        shouldRetry = true;
        setTimeout(() => {
          fetchTemplates(retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff: 1s, 2s
        return;
      }

      setError(error.message || 'Failed to load templates');
      setTemplates([]); // Ensure templates is empty array on error
    } finally {
      // Only set loading to false if we're not retrying
      if (!shouldRetry) {
        setLoading(false);
      }
    }
  };

  const fetchThumbnail = async (templateId) => {
    try {
      const response = await fetch(`${API}/api/templates/${templateId}/preview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Check if response is OK
      if (!response.ok) {
        console.warn(`Template preview returned status ${response.status} for ${templateId}`);
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`Template preview did not return JSON for ${templateId}`);
        return;
      }

      const data = await response.json();
      setThumbnailCache(prev => ({
        ...prev,
        [templateId]: data.html || ''
      }));
    } catch (error) {
      console.error(`Failed to fetch thumbnail for ${templateId}:`, error);
      // Don't block the UI if thumbnails fail - they can load individually
    }
  };

  const handlePreview = async (template) => {
    setPreviewTemplate(template);
    setPreviewHTML(''); // Reset preview HTML

    try {
      const response = await fetch(`${API}/api/templates/${template.id}/preview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load preview: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format');
      }

      const data = await response.json();
      setPreviewHTML(data.html || '<p>No preview available</p>');
    } catch (error) {
      console.error('Failed to load preview:', error);
      setPreviewHTML(`
        <div style="display: flex; align-items: center; justify-content: center; height: 400px; font-family: Arial, sans-serif; text-align: center; padding: 20px;">
          <div>
            <h3 style="color: #ef4444; margin-bottom: 10px;">Failed to Load Preview</h3>
            <p style="color: #6b7280;">${error.message || 'Please try again later'}</p>
          </div>
        </div>
      `);
    }
  };

  const categories = ['All', ...new Set(templates.map(t => t.category))];
  const filteredTemplates = selectedCategory === 'All'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading templates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="text-center">
          <p className="text-red-500 font-medium mb-2">Failed to load templates</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => fetchTemplates()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            Choose Your Template
          </h3>
          <p className="text-muted-foreground mt-1">
            Select a design style, then provide your prompt
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category Filter - COMMENTED OUT */}
      {/* <div className="flex gap-2 flex-wrap">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              selectedCategory === category
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-accent hover:bg-accent/80 text-foreground'
            }`}
          >
            {category}
          </button>
        ))}
      </div> */}

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* None Option - Default */}
        <div
          className={`template-card rounded-xl border-2 transition-all hover:shadow-xl ${!selectedTemplateId || selectedTemplateId === null
            ? 'border-primary bg-primary/5 shadow-lg'
            : 'border-border hover:border-primary/50'
            }`}
        >
          <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-50 rounded-t-xl overflow-hidden flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-16 h-16 text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No Template</p>
            </div>
            {(!selectedTemplateId || selectedTemplateId === null) && (
              <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                <Check className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-lg">None (Default)</h4>
              <span className="text-xs bg-accent px-2 py-1 rounded-full font-medium">
                Default
              </span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Use your preferences without a predefined template
            </p>
            <button
              onClick={() => onSelectTemplate(null)}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
            >
              {(!selectedTemplateId || selectedTemplateId === null) ? 'Selected' : 'Select Template'}
            </button>
          </div>
        </div>

        {/* AI Dynamic Template */}
        {templates.filter(t => t.id === 'dynamic').map(template => (
          <div
            key={template.id}
            className={`template-card rounded-xl border-2 transition-all hover:shadow-xl ${selectedTemplateId === template.id
              ? 'border-primary bg-primary/5 shadow-lg'
              : 'border-border hover:border-primary/50'
              }`}
          >
            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-50 rounded-t-xl overflow-hidden">
              {/* Template Preview Thumbnail */}
              {thumbnailCache[template.id] ? (
                <iframe
                  srcDoc={thumbnailCache[template.id]}
                  title={`${template.name} preview`}
                  className="w-full h-full pointer-events-none scale-[0.35] origin-top-left"
                  style={{ width: '285%', height: '285%' }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}

              {/* Overlay for better visibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />

              {selectedTemplateId === template.id && (
                <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-primary-foreground" />
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(template);
                }}
                className="absolute top-3 left-3 w-9 h-9 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                title="Full Preview"
              >
                <Eye className="w-4 h-4 text-foreground" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-lg">{template.name}</h4>
                <span className="text-xs bg-accent px-2 py-1 rounded-full font-medium">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {template.features.slice(0, 3).map((feature, idx) => (
                  <span key={idx} className="text-xs bg-accent px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic mb-3">
                Best for: {template.bestFor.join(', ')}
              </p>
              <button
                onClick={() => onSelectTemplate(template)}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                {selectedTemplateId === template.id ? 'Selected' : 'Select Template'}
              </button>
            </div>
          </div>
        ))}

        {/* COMMENTED OUT: All other templates from backend */}
        {/* {filteredTemplates.map(template => (
          <div
            key={template.id}
            className={`template-card rounded-xl border-2 transition-all hover:shadow-xl ${
              selectedTemplateId === template.id
                ? 'border-primary bg-primary/5 shadow-lg'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-50 rounded-t-xl overflow-hidden">
              {thumbnailCache[template.id] ? (
                <iframe
                  srcDoc={thumbnailCache[template.id]}
                  title={`${template.name} preview`}
                  className="w-full h-full pointer-events-none scale-[0.35] origin-top-left"
                  style={{ width: '285%', height: '285%' }}
                  sandbox="allow-same-origin"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent pointer-events-none" />
              
              {selectedTemplateId === template.id && (
                <div className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                  <Check className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreview(template);
                }}
                className="absolute top-3 left-3 w-9 h-9 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-10"
                title="Full Preview"
              >
                <Eye className="w-4 h-4 text-foreground" />
              </button>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-lg">{template.name}</h4>
                <span className="text-xs bg-accent px-2 py-1 rounded-full font-medium">
                  {template.category}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1 mb-3">
                {template.features.slice(0, 3).map((feature, idx) => (
                  <span key={idx} className="text-xs bg-accent px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground italic mb-3">
                Best for: {template.bestFor.join(', ')}
              </p>
              <button
                onClick={() => onSelectTemplate(template)}
                className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
              >
                {selectedTemplateId === template.id ? 'Selected' : 'Select Template'}
              </button>
            </div>
          </div>
        ))} */}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setPreviewTemplate(null)}>
          <div className="bg-background rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-xl font-bold">{previewTemplate.name} Preview</h3>
                <p className="text-sm text-muted-foreground">{previewTemplate.description}</p>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
              {previewHTML ? (
                <iframe
                  title="Template Preview"
                  srcDoc={previewHTML}
                  className="w-full h-[600px] bg-white rounded-lg shadow-lg"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading preview...</p>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-3">
              <button
                onClick={() => {
                  onSelectTemplate(previewTemplate);
                  setPreviewTemplate(null);
                }}
                className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Select This Template
              </button>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateIcon({ name }) {
  const icons = {
    'modern-hero': <Sparkles className="w-16 h-16 text-primary" />,
    'product-showcase': <Grid3x3 className="w-16 h-16 text-primary" />,
    'bold-announcement': <Minimize2 className="w-16 h-16 text-primary rotate-45" />,
    'newsletter-clean': <Grid3x3 className="w-16 h-16 text-primary rotate-90" />,
    'magazine-style': <Grid3x3 className="w-16 h-16 text-primary" />
  };
  return icons[name] || <Eye className="w-16 h-16 text-primary" />;
}

