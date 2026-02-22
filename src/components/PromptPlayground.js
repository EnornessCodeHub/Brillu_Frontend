import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Eye, Edit3, Loader2, CheckCircle, AlertCircle, Info, Layout, X, ImageIcon } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

import API from '../config/api.config';

// Helper function to convert relative image URLs to absolute URLs
function processImageUrls(html, apiBaseUrl) {
  if (!html) return html;
  
  // Convert relative URLs that start with /uploads/ to absolute URLs
  // Handle multiple cases: double quotes, single quotes, and CSS url()
  let processed = html;
  
  // Handle src="..." (double quotes)
  processed = processed.replace(
    /src="(\/uploads\/[^"]+)"/gi,
    (match, path) => `src="${apiBaseUrl}${path}"`
  );
  
  // Handle src='...' (single quotes)
  processed = processed.replace(
    /src='(\/uploads\/[^']+)'/gi,
    (match, path) => `src="${apiBaseUrl}${path}"`
  );
  
  // Handle background-image: url("...") or url('...')
  processed = processed.replace(
    /url\(["']?(\/uploads\/[^"')]+)["']?\)/gi,
    (match, path) => `url("${apiBaseUrl}${path}")`
  );
  
  // Handle any remaining /uploads/ paths in href attributes
  processed = processed.replace(
    /href="(\/uploads\/[^"]+)"/gi,
    (match, path) => `href="${apiBaseUrl}${path}"`
  );
  
  return processed;
}

// Purpose options
const PURPOSE_OPTIONS = [
  { value: 'activation', label: 'Activation / Welcome' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'promo', label: 'Promotional / Sale' },
  { value: 'reengagement', label: 'Re-engagement' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'custom', label: 'Custom...' }
];

// CTA Goal options
const CTA_GOALS = [
  { value: 'shop_now', label: 'Shop Now' },
  { value: 'learn_more', label: 'Learn More' },
  { value: 'sign_up', label: 'Sign Up' },
  { value: 'get_started', label: 'Get Started' },
  { value: 'custom', label: 'Custom...' }
];

export default function PromptPlayground({ token, selectedTemplate, onOpenTemplateGallery, onEditInCampaigns, welcomeCampaignId, onNavigateToProducts }) {
  // Structured intent form state
  const [intentForm, setIntentForm] = useState({
    purpose: '',
    customPurpose: '',
    keyMessage: '',
    offer: '',
    ctaGoal: '',
    customCtaGoal: '',
    ctaUrl: '',
    toneModifier: ''
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [creativeNudge, setCreativeNudge] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState('');
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  // Preferences state
  const [hasPreferences, setHasPreferences] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [selectedBrandIndex, setSelectedBrandIndex] = useState(0);

  // Custom layout state
  const [customLayouts, setCustomLayouts] = useState([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState(null);
  const [showLayoutSelector, setShowLayoutSelector] = useState(false);
  const [imageSlotChoices, setImageSlotChoices] = useState({}); // { slotName: { source: 'ai'|'media'|'skip', mediaUrl?, mediaId? } }
  const [showMediaPicker, setShowMediaPicker] = useState(null); // slot name currently picking for
  const [mediaAssets, setMediaAssets] = useState([]);

  // Streaming state
  const [streamingStatus, setStreamingStatus] = useState('');
  const [contentReady, setContentReady] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [emailContent, setEmailContent] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [usedPreferences, setUsedPreferences] = useState(false);
  const [generatedCampaignId, setGeneratedCampaignId] = useState(null);
  const [campaignProgress, setCampaignProgress] = useState(0);
  const [currentState, setCurrentState] = useState(null);
  
  // Per-component regeneration state
  const [campaignComponents, setCampaignComponents] = useState([]);
  const [regeneratingComponent, setRegeneratingComponent] = useState(null);
  const [regeneratingImage, setRegeneratingImage] = useState(null);
  const [campaignImageSlots, setCampaignImageSlots] = useState([]);

  // Template preview state
  const [previewLayout, setPreviewLayout] = useState(null);

  // Product availability warning state
  const [showProductWarning, setShowProductWarning] = useState(false);

  // Template change escape hatch state
  const [showTemplateChangeModal, setShowTemplateChangeModal] = useState(false);
  const [regeneratingWithTemplate, setRegeneratingWithTemplate] = useState(false);
  const [currentCampaignBrief, setCurrentCampaignBrief] = useState(null);

  // Update form field helper
  const updateIntentForm = (field, value) => {
    setIntentForm(prev => ({ ...prev, [field]: value }));
  };

  // Build prompt from structured form
  const buildPromptFromForm = () => {
    const parts = [];
    
    if (intentForm.purpose) {
      const purposeLabel = PURPOSE_OPTIONS.find(p => p.value === intentForm.purpose)?.label || intentForm.purpose;
      parts.push(`Create a ${purposeLabel.toLowerCase()} email`);
    }
    
    if (intentForm.keyMessage) {
      parts.push(`Key message: ${intentForm.keyMessage}`);
    }
    
    if (intentForm.offer) {
      parts.push(`Offer: ${intentForm.offer}`);
    }
    
    if (intentForm.ctaGoal) {
      const ctaLabel = intentForm.ctaGoal === 'custom' 
        ? intentForm.customCtaGoal 
        : CTA_GOALS.find(c => c.value === intentForm.ctaGoal)?.label;
      if (ctaLabel) parts.push(`CTA: ${ctaLabel}`);
    }
    
    if (intentForm.toneModifier) {
      parts.push(`Tone: ${intentForm.toneModifier}`);
    }
    
    if (creativeNudge) {
      parts.push(creativeNudge);
    }
    
    return parts.join('. ');
  };

  // Check if form is valid for generation
  const isFormValid = () => {
    return (
      intentForm.purpose &&
      intentForm.keyMessage &&
      intentForm.ctaGoal &&
      (selectedLayoutId || customLayouts.length === 0) // Layout required if layouts exist
    );
  };

  useEffect(() => {
    loadPreferences();
    loadCustomLayouts();

    // Check for hero prompt from landing page
    const heroPrompt = sessionStorage.getItem('hero_prompt');
    if (heroPrompt) {
      setCreativeNudge(heroPrompt);
      setShowAdvanced(true);
      sessionStorage.removeItem('hero_prompt');
    }
  }, [token]);

  // Pre-fill CTA URL from brand preferences
  useEffect(() => {
    if (hasPreferences && preferences?.brandInfo?.length > 0) {
      const brand = preferences.brandInfo[selectedBrandIndex] || preferences.brandInfo[0];
      const defaultCtaUrl = brand?.visualDesign?.default_cta_url;
      if (defaultCtaUrl && !intentForm.ctaUrl) {
        updateIntentForm('ctaUrl', defaultCtaUrl);
      }
    }
  }, [hasPreferences, preferences, selectedBrandIndex]);

  // Welcome email loader state
  const [isWelcomeLoading, setIsWelcomeLoading] = useState(false);

  // Handle welcome campaign from onboarding
  useEffect(() => {
    if (welcomeCampaignId) {
      setGeneratedCampaignId(welcomeCampaignId);
      setLoading(true);
      setIsWelcomeLoading(true);
      setStreamingStatus('Generating your welcome email...');
      setCampaignProgress(5);
    }
  }, [welcomeCampaignId]);

  const loadPreferences = async () => {
    if (!token) return;

    try {
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.exists && response.data.data) {
        setHasPreferences(true);
        setPreferences(response.data.data);
      } else {
        setHasPreferences(false);
        setPreferences(null);
      }
    } catch (err) {
      console.error('Error loading preferences:', err);
      setHasPreferences(false);
    }
  };

  const loadCustomLayouts = async () => {
    if (!token) return;

    try {
      // Load layouts including system defaults
      const response = await axios.get(`${API}/api/layouts?include_defaults=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || {};
      // API returns { userLayouts, systemDefaults } — merge into flat array
      const layouts = [
        ...(Array.isArray(data) ? data : []),
        ...(Array.isArray(data.userLayouts) ? data.userLayouts : []),
        ...(Array.isArray(data.systemDefaults) ? data.systemDefaults : []),
      ];
      setCustomLayouts(layouts);
      
      // Auto-select first layout if none selected and layouts exist
      if (layouts.length > 0 && !selectedLayoutId) {
        setSelectedLayoutId(layouts[0]._id);
      }
    } catch (err) {
      console.error('Error loading custom layouts:', err);
      setCustomLayouts([]);
    }
  };

  // Reset image slot choices when layout changes
  useEffect(() => {
    if (selectedLayoutId) {
      const layout = customLayouts.find(l => l._id === selectedLayoutId);
      if (layout?.imageSlots?.length > 0) {
        const defaults = {};
        layout.imageSlots.forEach(slot => {
          defaults[slot] = { source: 'ai' };
        });
        setImageSlotChoices(defaults);
      } else {
        setImageSlotChoices({});
      }
    }
  }, [selectedLayoutId, customLayouts]);

  // Load media assets for media picker
  useEffect(() => {
    if (token) {
      axios.get(`${API}/api/media`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const assets = res.data?.data?.mediaAssets || res.data?.mediaAssets || [];
          setMediaAssets(Array.isArray(assets) ? assets : []);
        })
        .catch(() => setMediaAssets([]));
    }
  }, [token]);

  const getSelectedLayout = () => {
    if (!selectedLayoutId) return null;
    return customLayouts.find(l => l._id === selectedLayoutId);
  };



  const handleGenerate = async () => {
    // Validate form
    if (!isFormValid()) {
      if (!intentForm.purpose) {
        setError('Please select a purpose');
      } else if (!intentForm.keyMessage) {
        setError('Please enter your key message');
      } else if (!intentForm.ctaGoal) {
        setError('Please select a CTA goal');
      } else if (!selectedLayoutId && customLayouts.length > 0) {
        setError('Please select a template/layout');
      }
      return;
    }

    // Check if selected template uses product blocks and user has products
    const layout = getSelectedLayout();
    const hasProductBlocks = layout?.components?.some(c => c.type === 'product_block');

    if (hasProductBlocks) {
      try {
        const prodRes = await axios.get(`${API}/api/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const products = prodRes.data?.products || prodRes.data?.data?.products || [];
        if (products.length === 0) {
          setShowProductWarning(true);
          return;
        }
      } catch (err) {
        console.warn('Could not check products, proceeding anyway:', err);
      }
    }

    executeGenerate();
  };

  const executeGenerate = async () => {
    setLoading(true);
    setError('');
    setWarnings([]);
    setHtmlPreview('');
    setStreamingStatus('Starting email generation...');
    setContentReady(false);
    setImageReady(false);
    setEmailContent(null);
    setImageUrl('');
    setUsedPreferences(false);

    try {
      const endpoint = `${API}/api/ai/generate-email-stream`;

      // Build structured request body
      const requestBody = {
        // Structured intent fields
        purpose: intentForm.purpose === 'custom' ? intentForm.customPurpose : intentForm.purpose,
        keyMessage: intentForm.keyMessage,
        offer: intentForm.offer || undefined,
        ctaGoal: intentForm.ctaGoal === 'custom' ? intentForm.customCtaGoal : intentForm.ctaGoal,
        ctaUrl: intentForm.ctaUrl || undefined,
        toneModifier: intentForm.toneModifier || undefined,
        creativeNudge: creativeNudge || undefined,
        // Also send as prompt for backward compatibility
        prompt: buildPromptFromForm()
      };

      if (hasPreferences && preferences?.brandInfo?.length > 0) {
        requestBody.brandIndex = selectedBrandIndex;
      }

      // Include selected template ID if a template is selected
      if (selectedTemplate && selectedTemplate.id) {
        requestBody.templateId = selectedTemplate.id;
      }
      
      // Include custom layout ID (required)
      if (selectedLayoutId) {
        requestBody.layoutId = selectedLayoutId;
      }

      // Include image slot choices if any are non-default
      const nonDefaultChoices = Object.entries(imageSlotChoices).filter(([, v]) => v.source !== 'ai');
      if (nonDefaultChoices.length > 0) {
        requestBody.imageSlotChoices = imageSlotChoices;
      }
      
      console.log('📦 [FRONTEND] Final request body:', requestBody);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start generation: ${response.status} - ${errorText}`);
      }

      // Get campaignId from response
      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Server returned an invalid response. Please try again.');
      }

      if (responseData.campaignId) {
        setGeneratedCampaignId(responseData.campaignId);
        setCurrentState(responseData.state || 'CREATED');
        setCampaignProgress(5);
        setStreamingStatus('Campaign created...');
      } else {
        throw new Error('No campaign ID returned');
      }
    } catch (err) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate email. Please try again.');
      setLoading(false);
      setStreamingStatus('');
    }
  };

  // Poll campaign status for progress updates
  useEffect(() => {
    if (!generatedCampaignId || !loading) return;

    const pollStatus = async () => {
      try {
        const response = await axios.get(`${API}/api/campaigns/${generatedCampaignId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const { state, finalOutput, html, mjml, contentOutput } = response.data;
        setCurrentState(state);

        // Store content output (subject/preheader) when available
        if (contentOutput) {
          setEmailContent(contentOutput);
        }

        // Map states to progress and messages (updated for new flow)
        const stateMap = {
          'CREATED': { progress: 5, message: 'Campaign created...' },
          'BRIEF_ENRICHED': { progress: 10, message: 'Brief enriched...' },
          'BRIEF_VALIDATED': { progress: 20, message: 'Brief validated ✓' },
          'LAYOUT_APPLIED': { progress: 30, message: 'Template applied ✓' },
          'DESIGN_GENERATED': { progress: 35, message: 'Design generated ✓' },
          'DESIGN_APPROVED': { progress: 40, message: 'Design approved ✓' },
          'CONTENT_GENERATED': { progress: 50, message: 'Content generated ✓' },
          'CONTENT_APPROVED': { progress: 60, message: 'Content approved ✓' },
          'IMAGES_GENERATED': { progress: 80, message: 'Images generated ✓' },
          'FINAL_ASSEMBLY': { progress: 95, message: 'Assembling final email...' },
          'DONE': { progress: 100, message: 'Complete! ✓' },
          'FAILED': { progress: 0, message: 'Generation failed' }
        };

        const stateInfo = stateMap[state] || { progress: 0, message: `Processing: ${state}` };
        setCampaignProgress(stateInfo.progress);
        setStreamingStatus(stateInfo.message);

        // If done, load the final HTML and components
        if (state === 'DONE') {
          const finalHtml = finalOutput?.html || html || '';
          if (finalHtml) {
            setHtmlPreview(finalHtml);
            setContentReady(true);
            setImageReady(true);
          }

          // Set warnings if any
          if (response.data.warnings?.length > 0) {
            setWarnings(response.data.warnings);
          }

          // Load components for per-component regeneration
          if (response.data.designOutput?.components) {
            setCampaignComponents(response.data.designOutput.components);
          }

          // Load image slots for image regeneration
          if (response.data.designOutput?.imageSlots) {
            setCampaignImageSlots(response.data.designOutput.imageSlots);
          }

          // Store brief for template change escape hatch
          if (response.data.brief) {
            setCurrentCampaignBrief(response.data.brief);
          }

          setLoading(false);
          setIsWelcomeLoading(false);
        } else if (state === 'FAILED') {
          setError('Campaign generation failed. Please try again.');
          setLoading(false);
          setIsWelcomeLoading(false);
        }
      } catch (err) {
        console.error('Status poll error:', err);
        // Don't stop polling on error, just log it
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    // Also poll immediately
    pollStatus();

    return () => clearInterval(interval);
  }, [generatedCampaignId, loading, token]);

  // Format slot/component label for display
  const formatSlotLabel = (id) => {
    if (!id) return '';
    return id
      .replace(/-/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
      .replace(/\bcta\b/gi, 'CTA');
  };

  // Filter editable image slots (matching images.worker.ts logic)
  const filterEditableImageSlots = (imageSlots, components) => {
    if (!imageSlots || !Array.isArray(imageSlots)) return [];
    if (!components || !Array.isArray(components)) return [];

    return imageSlots.filter((slot) => {
      const slotId = slot.slotId || '';
      const slotIdLower = slotId.toLowerCase();
      
      // Find parent component
      const parentComponent = components.find((comp) => {
        if (slotIdLower.startsWith(comp.component_id?.toLowerCase())) return true;
        if (comp.slotNames?.includes(slotId)) return true;
        if (slotIdLower.startsWith(comp.type?.toLowerCase())) return true;
        return false;
      });
      
      // Skip product blocks
      if (parentComponent?.type === 'product_block') return false;
      
      // Skip if allow_ai_image is false
      if (parentComponent?.config?.allow_ai_image === false) return false;
      
      // Skip locked components
      if (parentComponent?.config?.locked === true) return false;
      
      // Skip product-type slots
      if (slot.type === 'product' || slotIdLower.includes('product')) return false;
      
      return true;
    });
  };

  // Handle per-component regeneration
  const handleRegenerateComponent = async (componentId) => {
    if (!generatedCampaignId) return;
    
    setRegeneratingComponent(componentId);
    try {
      const response = await axios.post(
        `${API}/api/campaigns/${generatedCampaignId}/regenerate-component`,
        { component_id: componentId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update HTML preview with new content
      if (response.data.html) {
        setHtmlPreview(response.data.html);
      }
      
      // Update components list if returned
      if (response.data.components) {
        setCampaignComponents(response.data.components);
      }
    } catch (err) {
      console.error('Component regeneration failed:', err);
      alert('Failed to regenerate component. Please try again.');
    } finally {
      setRegeneratingComponent(null);
    }
  };

  // Handle image regeneration
  const handleRegenerateImage = async (slotId) => {
    if (!generatedCampaignId) return;
    
    setRegeneratingImage(slotId);
    try {
      const response = await axios.post(
        `${API}/api/campaigns/${generatedCampaignId}/regenerate-image`,
        { slotId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update HTML preview with new image
      if (response.data.html) {
        setHtmlPreview(response.data.html);
      }
    } catch (err) {
      console.error('Image regeneration failed:', err);
      alert('Failed to regenerate image. Please try again.');
    } finally {
      setRegeneratingImage(null);
    }
  };

  // Filter editable components (not locked, allow_ai_text, exclude header/footer which come from Preferences)
  const editableComponents = campaignComponents.filter(
    c => !c.locked && c.allow_ai_text !== false && c.type !== 'header' && c.type !== 'footer'
  );

  // Filter editable image slots
  const editableImageSlots = filterEditableImageSlots(campaignImageSlots, campaignComponents);

  // Handle regeneration with a different template
  const handleRegenerateWithTemplate = async (templateId) => {
    if (!token) return;

    setRegeneratingWithTemplate(true);
    setShowTemplateChangeModal(false);

    // Get original prompt from current campaign brief or form
    const originalPrompt = currentCampaignBrief?.goal || buildPromptFromForm();

    try {
      // Reset state for new generation
      setHtmlPreview('');
      setContentReady(false);
      setImageReady(false);
      setCampaignComponents([]);
      setLoading(true);
      setStreamingStatus('Starting regeneration with new template...');
      setCampaignProgress(5);

      const requestBody = {
        prompt: originalPrompt,
        layoutId: templateId,  // Force the selected template
        // Preserve structured intent if available
        purpose: intentForm.purpose || currentCampaignBrief?.purpose,
        keyMessage: intentForm.keyMessage || currentCampaignBrief?.keyMessage,
        offer: intentForm.offer || currentCampaignBrief?.offer,
        ctaGoal: intentForm.ctaGoal === 'custom'
          ? intentForm.customCtaGoal
          : (intentForm.ctaGoal || currentCampaignBrief?.ctaGoal),
        toneModifier: intentForm.toneModifier || currentCampaignBrief?.toneModifier,
        creativeNudge: creativeNudge || currentCampaignBrief?.creativeNudge,
      };

      if (hasPreferences && preferences?.brandInfo?.length > 0) {
        requestBody.brandIndex = selectedBrandIndex;
      }

      const response = await fetch(`${API}/api/ai/generate-email-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Failed to regenerate: ${response.status}`);
      }

      const responseData = await response.json();
      if (responseData.campaignId) {
        setGeneratedCampaignId(responseData.campaignId);
        setCurrentState(responseData.state || 'CREATED');
        setSelectedLayoutId(templateId);  // Update selected layout
      } else {
        throw new Error('No campaign ID returned');
      }
    } catch (err) {
      console.error('Template regeneration error:', err);
      setError(err.message || 'Failed to regenerate with new template. Please try again.');
      setLoading(false);
    } finally {
      setRegeneratingWithTemplate(false);
    }
  };

  // Full-page welcome email loader
  if (isWelcomeLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="relative">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div className="absolute inset-0 w-20 h-20 mx-auto rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
          </div>
          
          <div>
            <h2 className="text-2xl font-bold mb-2">Creating Your Welcome Email</h2>
            <p className="text-muted-foreground">
              We're generating a personalized welcome email based on your brand settings...
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                style={{ width: `${campaignProgress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{streamingStatus}</p>
            <p className="text-xs text-muted-foreground/70">{campaignProgress}% complete</p>
          </div>
          
          <div className="pt-4 text-sm text-muted-foreground/60">
            This usually takes 60-90 seconds
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h3 className="text-xl font-semibold">Create Your Email</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Generate AI-powered emails
        </p>
      </div>

      {/* Info Banner */}
      {!hasPreferences && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                💡 Tip: Set up your preferences to get more personalized emails!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prompt Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Create Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Brand Selector */}
          {hasPreferences && preferences?.brandInfo?.length > 1 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">Brand:</label>
              <select 
                value={selectedBrandIndex}
                onChange={(e) => setSelectedBrandIndex(parseInt(e.target.value))}
                disabled={loading}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                {preferences.brandInfo.map((brand, index) => (
                  <option key={index} value={index}>
                    {brand.brandName || brand.brandIdentity?.brand_name || `Brand ${index + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Structured Intent Form */}
          <div className="space-y-4">
            {/* Purpose - Required */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Purpose <span className="text-destructive">*</span>
              </label>
              <select
                value={intentForm.purpose}
                onChange={(e) => updateIntentForm('purpose', e.target.value)}
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select purpose...</option>
                {PURPOSE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {intentForm.purpose === 'custom' && (
                <input
                  type="text"
                  value={intentForm.customPurpose}
                  onChange={(e) => updateIntentForm('customPurpose', e.target.value)}
                  disabled={loading}
                  placeholder="Enter your custom purpose..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
                />
              )}
            </div>

            {/* Key Message - Required */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Key Message <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={intentForm.keyMessage}
                onChange={(e) => updateIntentForm('keyMessage', e.target.value)}
                placeholder="What's the main message? (1-2 sentences)"
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Offer - Optional */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Offer (optional)</label>
              <input
                type="text"
                value={intentForm.offer}
                onChange={(e) => updateIntentForm('offer', e.target.value)}
                placeholder="e.g., 20% off, Free shipping, Limited time deal"
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* CTA Goal - Required */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                CTA Goal <span className="text-destructive">*</span>
              </label>
              <select
                value={intentForm.ctaGoal}
                onChange={(e) => updateIntentForm('ctaGoal', e.target.value)}
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select CTA...</option>
                {CTA_GOALS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {intentForm.ctaGoal === 'custom' && (
                <input
                  type="text"
                  value={intentForm.customCtaGoal}
                  onChange={(e) => updateIntentForm('customCtaGoal', e.target.value)}
                  placeholder="Enter custom CTA text"
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                />
              )}
            </div>

            {/* CTA URL - Optional */}
            <div className="space-y-2">
              <label className="text-sm font-medium">CTA URL (optional)</label>
              <input
                type="url"
                value={intentForm.ctaUrl}
                onChange={(e) => updateIntentForm('ctaUrl', e.target.value)}
                placeholder="https://yoursite.com/landing"
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground">
                Link for CTA buttons. Leave empty to use your brand default.
              </p>
            </div>

            {/* Tone Modifier - Optional */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tone Modifier (optional)</label>
              <input
                type="text"
                value={intentForm.toneModifier}
                onChange={(e) => updateIntentForm('toneModifier', e.target.value)}
                placeholder="e.g., More urgent, Extra friendly, Very professional"
                disabled={loading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {/* Template/Layout Selection - Required */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Template <span className="text-destructive">*</span>
            </label>
            <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-accent/20">
              <div className="flex items-center gap-2">
                <Layout className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    {selectedLayoutId ? getSelectedLayout()?.name || 'Custom Layout' : 'No template selected'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedLayoutId
                      ? `${getSelectedLayout()?.contentSlots?.length || 0} content slots, ${getSelectedLayout()?.imageSlots?.length || 0} image slots`
                      : 'Please select a template to continue'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLayoutSelector(!showLayoutSelector)}
                disabled={loading}
              >
                {selectedLayoutId ? 'Change' : 'Select Template'}
              </Button>
            </div>
          </div>

          {/* Layout Selector Modal */}
          {showLayoutSelector && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowLayoutSelector(false)}>
              <div className="bg-background rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] sm:max-h-[80vh] flex flex-col mx-2 sm:mx-0" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-5 border-b">
                  <div>
                    <h3 className="text-lg font-semibold">Select a Template</h3>
                    <p className="text-sm text-muted-foreground">Choose a layout for your email campaign</p>
                  </div>
                  <button onClick={() => setShowLayoutSelector(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto flex-1">
                  {customLayouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No templates available. Create one in the Layout Builder.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {customLayouts.map((layout) => (
                        <div
                          key={layout._id}
                          className={`cursor-pointer border-2 rounded-lg p-3 transition-all hover:shadow-md ${
                            selectedLayoutId === layout._id ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground'
                          }`}
                          onClick={() => {
                            setSelectedLayoutId(layout._id);
                            setShowLayoutSelector(false);
                          }}
                        >
                          <div className="aspect-[3/4] bg-muted rounded mb-2 overflow-hidden relative group">
                            {layout.thumbnail ? (
                              <iframe
                                srcDoc={layout.thumbnail}
                                title={layout.name}
                                className="w-[600px] h-[800px] border-0 pointer-events-none origin-top-left"
                                style={{ transform: 'scale(0.28)', transformOrigin: 'top left' }}
                                sandbox=""
                                scrolling="no"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Layout className="w-8 h-8 text-muted-foreground" />
                              </div>
                            )}
                            {layout.thumbnail && (
                              <button
                                className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-background"
                                onClick={(e) => { e.stopPropagation(); setPreviewLayout(layout); }}
                                title="Preview template"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="font-medium text-sm truncate">{layout.name}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-1">
                            <p className="text-xs text-muted-foreground capitalize">{layout.category || 'General'}</p>
                            {selectedLayoutId === layout._id && (
                              <Badge variant="secondary" className="text-xs">Selected</Badge>
                            )}
                            {layout.components?.some(c => c.type === 'product_block') && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Requires Products</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Image Slot Choices — shown when a layout with image slots is selected */}
          {selectedLayoutId && getSelectedLayout()?.imageSlots?.length > 0 && (
            <div className="space-y-3">
              <label className="text-sm font-medium">Image Sources</label>
              <p className="text-xs text-muted-foreground">For each image slot, choose how to fill it:</p>
              <div className="space-y-2">
                {getSelectedLayout().imageSlots.map(slot => {
                  const slotId = typeof slot === 'string' ? slot : slot.slotId;
                  return (
                  <div key={slotId} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg bg-muted/30">
                    <span className="text-sm font-medium sm:min-w-[120px] capitalize">{slotId.replace(/-/g, ' ')}</span>
                    <div className="flex gap-2 flex-wrap">
                      {['ai', 'media', 'skip'].map(source => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => {
                            if (source === 'media') {
                              const slotCategory = slotId.includes('hero') ? 'hero' : slotId.includes('product') ? 'product' : 'general';
                              const available = mediaAssets.filter(a => a.category === slotCategory || a.category === 'general');
                              if (available.length === 0) {
                                setImageSlotChoices(prev => ({ ...prev, [slotId]: { source: 'skip' } }));
                                alert(`No ${slotCategory} images in your Media Library. A placeholder will be used — you can replace it later.`);
                                return;
                              }
                              setShowMediaPicker(slotId);
                            } else {
                              setImageSlotChoices(prev => ({ ...prev, [slotId]: { source } }));
                            }
                          }}
                          className={`px-3 py-1.5 text-xs rounded-md border transition-all ${
                            imageSlotChoices[slotId]?.source === source
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background border-border hover:border-muted-foreground'
                          }`}
                        >
                          {source === 'ai' ? 'AI Generate' : source === 'media' ? 'Media Library' : 'Skip'}
                        </button>
                      ))}
                    </div>
                    {imageSlotChoices[slotId]?.source === 'media' && imageSlotChoices[slotId]?.mediaUrl && (
                      <img src={imageSlotChoices[slotId].mediaUrl} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Media Picker Modal */}
          {showMediaPicker && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowMediaPicker(null)}>
              <div className="bg-background rounded-lg shadow-xl max-w-lg w-full max-h-[70vh] overflow-auto p-4" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Select Image for "{showMediaPicker.replace(/-/g, ' ')}"</h3>
                  <button onClick={() => setShowMediaPicker(null)}><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mediaAssets
                    .filter(a => a.type === 'image')
                    .map(asset => (
                      <div
                        key={asset._id || asset.url}
                        className="cursor-pointer border-2 rounded-lg overflow-hidden hover:border-primary transition-colors"
                        onClick={() => {
                          setImageSlotChoices(prev => ({
                            ...prev,
                            [showMediaPicker]: { source: 'media', mediaUrl: asset.url, mediaId: asset._id }
                          }));
                          setShowMediaPicker(null);
                        }}
                      >
                        <img src={asset.url} alt={asset.name || ''} className="w-full aspect-square object-cover" />
                        {asset.name && <p className="text-xs p-1 truncate">{asset.name}</p>}
                      </div>
                    ))}
                </div>
                {mediaAssets.filter(a => a.type === 'image').length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No images in your Media Library</p>
                )}
              </div>
            </div>
          )}

          {/* Advanced: Creative Nudge */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              {showAdvanced ? '▼' : '▶'} Advanced: Creative Nudge
            </button>
            {showAdvanced && (
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={3}
                value={creativeNudge}
                onChange={(e) => setCreativeNudge(e.target.value)}
                placeholder="Any additional creative direction for the AI..."
                disabled={loading}
              />
            )}
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={loading || !isFormValid()}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Email
              </>
            )}
          </Button>

          {/* Progress Status */}
          {loading && (
            <Card className="bg-muted/50">
              <CardContent className="pt-6 space-y-4">
                {usedPreferences && (
                  <Badge variant="secondary" className="mb-2">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Using your preferences
                  </Badge>
                )}
                
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{streamingStatus}</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            await axios.post(`${API}/api/campaigns/${generatedCampaignId}/cancel`, {}, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            setError('Generation cancelled.');
                            setLoading(false);
                            setStreamingStatus('');
                            setCampaignProgress(0);
                          } catch (err) {
                            console.error('Cancel error:', err);
                          }
                        }}
                        className="text-destructive border-destructive/50 hover:bg-destructive/10 h-6 px-2 text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Stop
                      </Button>
                      <span className="text-sm text-muted-foreground">{campaignProgress}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                      style={{ width: `${campaignProgress}%` }}
                    />
                  </div>
                </div>

                {/* Stage Indicators (4 steps: Brief, Template, Content, Final) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className={`text-center p-2 rounded ${['CREATED', 'BRIEF_ENRICHED', 'BRIEF_VALIDATED'].includes(currentState) ? 'bg-primary/10 text-primary font-medium' : campaignProgress > 20 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    Brief
                  </div>
                  <div className={`text-center p-2 rounded ${['LAYOUT_APPLIED', 'DESIGN_GENERATED', 'DESIGN_APPROVED'].includes(currentState) ? 'bg-primary/10 text-primary font-medium' : campaignProgress > 40 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    Template
                  </div>
                  <div className={`text-center p-2 rounded ${['CONTENT_GENERATED', 'CONTENT_APPROVED', 'IMAGES_GENERATED'].includes(currentState) ? 'bg-primary/10 text-primary font-medium' : campaignProgress > 80 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    Content
                  </div>
                  <div className={`text-center p-2 rounded ${['FINAL_ASSEMBLY', 'DONE'].includes(currentState) ? 'bg-primary/10 text-primary font-medium' : campaignProgress === 100 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    Final
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="bg-destructive/10 border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Card className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
              <CardContent className="pt-6 space-y-2">
                {warnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-300">{w}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {htmlPreview && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Your Email Preview
              </CardTitle>
              <div className="flex items-center gap-2">
                {generatedCampaignId && onEditInCampaigns && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onEditInCampaigns(generatedCampaignId)}
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit in Campaigns
                  </Button>
                )}
                {/* Template Change Escape Hatch */}
                {/* {contentReady && generatedCampaignId && customLayouts.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowTemplateChangeModal(true)}
                    disabled={regeneratingWithTemplate}
                  >
                    <Layout className="w-4 h-4 mr-2" />
                    Change Template
                  </Button>
                )} */}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {emailContent?.subject && (
              <div style={{ marginBottom: '16px', padding: '16px', background: 'var(--muted, #f9fafb)', borderRadius: '8px', border: '1px solid var(--border, #e5e7eb)' }}>
                <div style={{ marginBottom: emailContent.preheader ? '8px' : '0' }}>
                  <label style={{ fontSize: '12px', color: 'var(--muted-foreground, #6b7280)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject Line</label>
                  <p style={{ fontSize: '16px', fontWeight: 500, margin: '4px 0 0', color: 'var(--foreground, #111)' }}>
                    {emailContent.subject}
                  </p>
                </div>
                {emailContent.preheader && (
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--muted-foreground, #6b7280)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pre-header</label>
                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground, #666)', margin: '4px 0 0' }}>
                      {emailContent.preheader}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="rounded-lg border overflow-hidden">
              <iframe
                title="Email Preview"
                srcDoc={processImageUrls(htmlPreview, API)}
                className="w-full h-[400px] sm:h-[600px]"
                style={{ minWidth: '320px' }}
                sandbox="allow-same-origin"
              />
            </div>

            {/* Text Regeneration */}
            {editableComponents.length > 0 && (
              <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Regenerate Text Sections
                </h4>
                <div className="flex flex-wrap gap-2">
                  {editableComponents.map((component) => (
                    <Button
                      key={component.component_id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerateComponent(component.component_id)}
                      disabled={regeneratingComponent === component.component_id}
                    >
                      {regeneratingComponent === component.component_id ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {formatSlotLabel(component.component_id)}
                        </>
                      )}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click to regenerate specific text sections while keeping the rest of your email
                </p>
              </div>
            )}

            {/* Image Regeneration */}
            {editableImageSlots.length > 0 && (
              <div className="mt-4 p-4 border border-border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Regenerate Images
                </h4>
                <div className="flex flex-wrap gap-2">
                  {editableImageSlots.map((slot) => (
                    <Button
                      key={slot.slotId}
                      variant="outline"
                      size="sm"
                      onClick={() => handleRegenerateImage(slot.slotId)}
                      disabled={regeneratingImage === slot.slotId}
                    >
                      {regeneratingImage === slot.slotId ? (
                        <>
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          Generating image...
                        </>
                      ) : (
                        <>
                          <ImageIcon className="w-3 h-3 mr-1" />
                          {formatSlotLabel(slot.slotId)}
                        </>
                      )}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Click to regenerate specific images (may take up to 65 seconds)
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <Button 
                variant="outline"
                onClick={async () => {
                  if (!htmlPreview) {
                    alert('No HTML to copy');
                    return;
                  }
                  
                  try {
                    let htmlToCopy = htmlPreview;

                    if (generatedCampaignId && token) {
                      try {
                        const response = await axios.post(
                          `${API}/api/campaigns/${generatedCampaignId}/shareable-html`,
                          { html: htmlPreview },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        htmlToCopy = response.data.html;
                      } catch (apiError) {
                        console.warn('Shareable HTML API failed, using processed HTML:', apiError);
                        htmlToCopy = processImageUrls(htmlPreview, API);
                      }
                    }

                    await navigator.clipboard.writeText(htmlToCopy);
                    alert('HTML copied to clipboard!');
                  } catch (error) {
                    console.error('Failed to copy HTML:', error);
                    alert('Failed to copy HTML to clipboard. Please try again.');
                  }
                }}
              >
                Copy HTML
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (!htmlPreview) {
                    alert('No HTML to download');
                    return;
                  }
                  
                  try {
                    let htmlToDownload = htmlPreview;

                    if (generatedCampaignId && token) {
                      try {
                        const response = await axios.post(
                          `${API}/api/campaigns/${generatedCampaignId}/shareable-html`,
                          { html: htmlPreview },
                          { headers: { Authorization: `Bearer ${token}` } }
                        );
                        htmlToDownload = response.data.html;
                      } catch (apiError) {
                        console.warn('Shareable HTML API failed, using processed HTML:', apiError);
                        htmlToDownload = processImageUrls(htmlPreview, API);
                      }
                    }
                    
                  const element = document.createElement('a');
                    const file = new Blob([htmlToDownload], { type: 'text/html' });
                  element.href = URL.createObjectURL(file);
                  element.download = 'email.html';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                    URL.revokeObjectURL(element.href);
                  } catch (error) {
                    console.error('Failed to download HTML:', error);
                    alert('Failed to download HTML. Please try again.');
                  }
                }}
              >
                Download HTML
              </Button>
            </div>

          </CardContent>
        </Card>
      )}

      {/* Template Change Modal (Escape Hatch) */}
      {showTemplateChangeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-lg shadow-xl max-w-3xl w-full mx-2 sm:mx-4 max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold">Choose a Different Template</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a template and we'll regenerate your email with the same content
                </p>
              </div>
              <button
                onClick={() => setShowTemplateChangeModal(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Template Grid */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {customLayouts.map(template => (
                  <div
                    key={template._id}
                    className={`cursor-pointer border-2 rounded-lg p-3 transition-all hover:shadow-md ${
                      template._id === selectedLayoutId
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => {
                      if (template._id !== selectedLayoutId) {
                        handleRegenerateWithTemplate(template._id);
                      } else {
                        setShowTemplateChangeModal(false);
                      }
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[3/4] bg-muted rounded mb-2 overflow-hidden relative group">
                      {template.thumbnail ? (
                        <iframe
                          srcDoc={template.thumbnail}
                          title={template.name}
                          className="w-[600px] h-[800px] border-0 pointer-events-none origin-top-left"
                          style={{ transform: 'scale(0.28)', transformOrigin: 'top left' }}
                          sandbox=""
                          scrolling="no"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Layout className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      {template.thumbnail && (
                        <button
                          className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-background"
                          onClick={(e) => { e.stopPropagation(); setPreviewLayout(template); }}
                          title="Preview template"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {/* Info */}
                    <p className="font-medium text-sm truncate">{template.name}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      <p className="text-xs text-muted-foreground capitalize">
                        {template.category || 'General'}
                      </p>
                      {template._id === selectedLayoutId && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                      {template.components?.some(c => c.type === 'product_block') && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Requires Products</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t bg-muted/30">
              <Button
                variant="outline"
                onClick={() => setShowTemplateChangeModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Size Template Preview Modal */}
      {previewLayout && previewLayout.thumbnail && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setPreviewLayout(null)}>
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold">{previewLayout.name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{previewLayout.category || 'General'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedLayoutId(previewLayout._id);
                    setPreviewLayout(null);
                    setShowLayoutSelector(false);
                    setShowTemplateChangeModal(false);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-1" /> Select This Template
                </Button>
                <button onClick={() => setPreviewLayout(null)} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-muted/30">
              <div className="mx-auto" style={{ maxWidth: '600px' }}>
                <iframe
                  srcDoc={previewLayout.thumbnail}
                  title={`Preview: ${previewLayout.name}`}
                  className="w-full border-0 bg-white rounded shadow-sm"
                  style={{ height: '80vh', maxHeight: '700px' }}
                  sandbox=""
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Availability Warning Modal */}
      {showProductWarning && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Products Required</h3>
              <p className="text-sm text-muted-foreground mb-1">
                The selected template uses product blocks, but you haven't added any products yet.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Without products, these sections will be automatically converted to feature highlights by the AI.
              </p>
              <div className="flex gap-3 justify-center">
                {onNavigateToProducts && (
                  <Button
                    onClick={() => {
                      setShowProductWarning(false);
                      onNavigateToProducts();
                    }}
                  >
                    Add Products
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProductWarning(false);
                    executeGenerate();
                  }}
                >
                  Continue Anyway
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowProductWarning(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
