import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import '../../grapesjs-custom-theme.css'; // SendWithSES-inspired theme (fixed path)
import 'grapesjs-preset-newsletter';
import { Mail, RefreshCw, ArrowLeft, Eye, Edit3, Copy, Download, Loader2, Calendar, MessageSquare, LayoutTemplate, Settings, CheckCircle, X, Sparkles, ImageIcon } from 'lucide-react';
import Sidebar from './Sidebar';
import { BrandIdentity, VisualDesignSettings, WritingStyle, SocialMedia } from './BrandSettings';
import { HeaderSettings, FooterEditor } from './EmailSettings';
import MediaLibrary from './MediaLibrary';
import ProductFeed from './ProductFeed';
// TODO: CRM backend not implemented yet - uncomment when /api/crm endpoints are ready
// import CRMIntegration from './CRMIntegration';
import PromptPlayground from '../PromptPlayground';
import TemplateGallery from './TemplateGallery';
import CustomLayoutBuilder from './CustomLayoutBuilder';
import ImagePreferences from './ImagePreferences';
import ProductPickerModal from './ProductPickerModal';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import API from '../../config/api.config';

export default function DashboardLayout({ token, onLogout, welcomeCampaignId, onWelcomeCampaignHandled }) {
  const [activeSection, setActiveSection] = useState('home');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState(null);
  const loadingCampaignsRef = useRef(false); // Prevent concurrent loads
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Guard: Check onboarding status before allowing dashboard access
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!token) {
        // No token, redirect handled by parent
        setCheckingOnboarding(false);
        return;
      }

      try {
        const response = await axios.get(`${API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const user = response.data.user;
        const onboardingCompleted = user?.onboardingCompleted ?? false;
        
        if (!onboardingCompleted) {
          // Onboarding not completed - redirect to onboarding
          // Signal parent to redirect (or use window.location)
          window.location.href = '/'; // This will trigger App.js to check and redirect
          return;
        }
        
        // Onboarding completed, allow dashboard access
        setCheckingOnboarding(false);
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        // On error, allow access (fallback) but log it
        setCheckingOnboarding(false);
      }
    };
    
    checkOnboardingStatus();
  }, [token]);

  // Load campaigns when component mounts (only after onboarding check)
  useEffect(() => {
    if (!checkingOnboarding && token) {
      console.log('🔄 [useEffect] Component mounted, loading campaigns...');
      loadCampaigns();
    }
  }, [checkingOnboarding, token]);

  // If welcomeCampaignId exists, switch to home section
  useEffect(() => {
    if (welcomeCampaignId) {
      setActiveSection('home');
    }
  }, [welcomeCampaignId]);

  // Debug campaigns state changes
  useEffect(() => {
    console.log('🔄 [useEffect] Campaigns state changed:', {
      count: campaigns.length,
      campaigns: campaigns
    });
  }, [campaigns]);

  const loadCampaigns = async () => {
    // Prevent concurrent calls
    if (loadingCampaignsRef.current) {
      console.log('⏸️ Campaigns already loading, skipping duplicate call');
      return;
    }

    loadingCampaignsRef.current = true;
    setLoadingCampaigns(true);

    try {
      console.log('📥 Loading campaigns...');
      const response = await axios.get(`${API}/api/campaigns`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30000 // 30 second timeout (increased for large datasets)
      });

      const campaignsData = response.data || [];
      console.log(`✅ Loaded ${campaignsData.length} campaigns`);
      console.log('📦 Campaigns data type:', Array.isArray(campaignsData) ? 'array' : typeof campaignsData);
      console.log('📦 Campaigns data:', campaignsData);
      if (campaignsData.length > 0) {
        console.log('📦 First campaign sample:', campaignsData[0]);
        console.log('📦 Campaign IDs:', campaignsData.map(c => c._id || c.id || 'no-id'));
      }
      // Ensure we're setting an array
      if (Array.isArray(campaignsData)) {
        // Migrate old port URLs (4050) to current port for backward compatibility
        const migratedCampaigns = campaignsData.map(campaign => {
          if (campaign.imageUrl && typeof campaign.imageUrl === 'string') {
            campaign.imageUrl = campaign.imageUrl.replace(/https?:\/\/localhost:4050\//gi, `${API}/`);
            campaign.imageUrl = campaign.imageUrl.replace(/https?:\/\/[^\/]+:4050\//gi, `${API}/`);
          }
          return campaign;
        });
        setCampaigns(migratedCampaigns);
        console.log('✅ Campaigns state updated with', migratedCampaigns.length, 'campaigns (port migrated)');
      } else {
        console.error('❌ Campaigns data is not an array:', campaignsData);
        setCampaigns([]);
      }
    } catch (error) {
      console.error('❌ Error loading campaigns:', error);
      // Set empty array on error to prevent infinite loading
      setCampaigns([]);

      // Show error to user (optional - you can add a toast notification here)
      if (error.response) {
        console.error('API Error:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('Network Error:', error.request);
      }
    } finally {
      setLoadingCampaigns(false);
      loadingCampaignsRef.current = false;
    }
  };

  const handleEditInCampaigns = async (campaignId) => {
    console.log('🔄 Redirecting to campaigns to edit:', campaignId);

    try {
      // Switch to campaigns tab first
      setActiveSection('campaigns');

      // Always reload campaigns to ensure we have the latest data
      console.log('⏳ Loading campaigns before editing...');
      await loadCampaigns();
      console.log('✅ Campaigns loaded, setting campaignToEdit');

      // Set the campaign to edit AFTER campaigns are loaded
      // Use a small delay to ensure the campaigns state has updated
      setTimeout(() => {
        console.log('🎯 Setting campaignToEdit to:', campaignId);
        setCampaignToEdit(campaignId);
      }, 200); // Increased delay slightly to ensure state is settled
    } catch (error) {
      console.error('❌ Error in handleEditInCampaigns:', error);
      // Still try to set the campaign even if loading failed
      setCampaignToEdit(campaignId);
    }
  };

  // Show loading state while checking onboarding
  if (checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-spark mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onLogout={onLogout}
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="border-b border-border bg-card/50 backdrop-blur-sm">
          <div className="px-4 md:px-8 py-4 md:py-6 flex items-center gap-4">
            <button
              className="md:hidden p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-accent/10 transition-colors flex-shrink-0 flex items-center justify-center"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base hidden sm:block">
                Manage your email campaigns and preferences
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Campaigns - Generated Emails */}
          {activeSection === 'campaigns' && (
            <CampaignsSection
              token={token}
              campaigns={campaigns}
              loading={loadingCampaigns}
              onRefresh={loadCampaigns}
              campaignToEdit={campaignToEdit}
              onCampaignEdited={() => setCampaignToEdit(null)}
            />
          )}

          {/* Home - AI Email Generator */}
          {activeSection === 'home' && (
            <HomeSection
              token={token}
              onGenerated={loadCampaigns}
              selectedTemplate={selectedTemplate}
              onOpenTemplateGallery={() => setShowTemplateGallery(true)}
              onEditInCampaigns={handleEditInCampaigns}
              welcomeCampaignId={welcomeCampaignId}
              onNavigateToProducts={() => setActiveSection('products')}
            />
          )}

          {/* Brand Preferences */}
          {activeSection === 'brand-identity' && <BrandIdentity token={token} />}
          {activeSection === 'typography' && <VisualDesignSettings token={token} />}
          {activeSection === 'writing-style' && <WritingStyle token={token} />}
          {activeSection === 'social-media' && <SocialMedia token={token} />}
          {activeSection === 'image-preferences' && <ImagePreferences token={token} />}

          {/* Media & Assets */}
          {activeSection === 'media-library' && <MediaLibrary token={token} />}

          {/* Email Settings */}
          {activeSection === 'header-settings' && <HeaderSettings token={token} />}
          {activeSection === 'footer' && <FooterEditor token={token} />}

          {/* Integrations */}
          {activeSection === 'products' && <ProductFeed token={token} />}
          {/* TODO: CRM backend not implemented yet - uncomment when /api/crm endpoints are ready */}
          {/* {activeSection === 'crm' && <CRMIntegration token={token} />} */}
          {activeSection === 'crm' && (
            <div className="section-card">
              <h2>CRM Integration</h2>
              <p style={{ color: '#666', marginTop: '1rem' }}>
                CRM integration coming soon! This feature will allow you to connect HubSpot, Salesforce, Pipedrive, and Zoho CRM.
              </p>
            </div>
          )}

          {/* Templates */}
          {activeSection === 'templates' && <TemplatesSection token={token} onNavigateToHome={() => setActiveSection('home')} selectedTemplate={selectedTemplate} onSelectTemplate={setSelectedTemplate} />}

          {/* Custom Layout Builder */}
          {activeSection === 'custom-layout' && <CustomLayoutBuilder token={token} />}

          {/* Settings */}
          {activeSection === 'settings' && <SettingsSection token={token} />}
        </div>
      </div>

      {/* AI Assistant */}
      {/* Template Gallery Modal */}
      {showTemplateGallery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <TemplateGallery
                onSelectTemplate={(template) => {
                  setSelectedTemplate(template);
                  setShowTemplateGallery(false);
                }}
                selectedTemplateId={selectedTemplate?.id}
                onClose={() => setShowTemplateGallery(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Home Section - AI Email Generator
function HomeSection({ token, onGenerated, selectedTemplate, onOpenTemplateGallery, onEditInCampaigns, welcomeCampaignId, onNavigateToProducts }) {
  const [userStats, setUserStats] = useState({
    emailsGenerated: 0,
    emailsRemaining: 3,
    plan: 'free',
    planLimit: 3
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, [token]);

  const loadUserStats = async () => {
    setLoading(true);
    try {
      // Fetch user details from backend
      const response = await axios.get(`${API}/api/user/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data) {
        setUserStats({
          emailsGenerated: response.data.emailsGeneratedThisMonth || 0,
          emailsRemaining: response.data.emailsRemaining || 0,
          plan: response.data.plan || 'free',
          planLimit: response.data.planLimit || 3
        });
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
      // If endpoint doesn't exist yet, keep default values
    } finally {
      setLoading(false);
    }
  };

  const planNames = {
    free: 'Free',
    starter: 'Starter',
    pro: 'Pro',
    business: 'Business',
    enterprise: 'Enterprise'
  };

  const planColors = {
    free: '#6b7280',
    starter: '#000000',
    pro: '#333333',
    business: '#f59e0b',
    enterprise: '#10b981'
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">AI Email Generator</h2>
        <p className="text-muted-foreground mt-2">Create stunning email campaigns with AI assistance</p>
      </div>

      {/* Embedded Prompt Playground */}
      <PromptPlayground
        token={token}
        selectedTemplate={selectedTemplate}
        onOpenTemplateGallery={onOpenTemplateGallery}
        onEditInCampaigns={onEditInCampaigns}
        welcomeCampaignId={welcomeCampaignId}
        onNavigateToProducts={onNavigateToProducts}
      />

     
      {/* <div className="enhanced-stats-section" style={{ marginTop: '48px' }}>
        <div className="stats-header">
          <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>📊 Your Usage Stats</h3>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
            Track your email generation progress
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="spinner" style={{ margin: '0 auto' }}></div>
          </div>
        ) : (
          <div className="stats-grid-enhanced">
            
            <div className="stat-card-enhanced">
              <div className="stat-icon" style={{ width: 'auto', background: 'linear-gradient(135deg, #000000 0%, #333333 100%)' }}>
                <span style={{ fontSize: '24px' }}>📧</span>
              </div>
              <div className="stat-content">
                <div className="stat-number">{userStats.emailsGenerated}</div>
                <div className="stat-label">Emails Generated</div>
                <div className="stat-sublabel">This billing period</div>
              </div>
            </div>

            
            <div className="stat-card-enhanced">
              <div className="stat-icon" style={{ width: 'auto', background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)' }}>
                <span style={{ fontSize: '24px' }}>🎯</span>
              </div>
              <div className="stat-content">
                <div className="stat-number">{userStats.emailsRemaining}</div>
                <div className="stat-label">Remaining</div>
                <div className="stat-sublabel">Out of {userStats.planLimit} emails</div>
              </div>
            </div>

            
            <div className="stat-card-enhanced">
              <div className="stat-icon" style={{ width: 'auto', background: `linear-gradient(135deg, ${planColors[userStats.plan]} 0%, ${planColors[userStats.plan]}dd 100%)` }}>
                <span style={{ fontSize: '24px' }}>🎨</span>
              </div>
              <div className="stat-content">
                <div className="stat-number" style={{ color: planColors[userStats.plan] }}>
                  {planNames[userStats.plan]}
                </div>
                <div className="stat-label">Current Plan</div>
                <div className="stat-sublabel">
                  {userStats.plan === 'free' ? (
                    <a href="#pricing" style={{ color: '#000000', textDecoration: 'none', fontWeight: '500' }}>
                      Upgrade for more →
                    </a>
                  ) : (
                    'Active subscription'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

       
        {!loading && (
          <div className="usage-progress" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                Usage Progress
              </span>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>
                {userStats.emailsGenerated} / {userStats.planLimit}
              </span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{
                  width: `${Math.min((userStats.emailsGenerated / userStats.planLimit) * 100, 100)}%`,
                  background: userStats.emailsGenerated >= userStats.planLimit
                    ? '#ef4444'
                    : 'linear-gradient(90deg, #000000 0%, #333333 100%)'
                }}
              />
            </div>
            {userStats.emailsGenerated >= userStats.planLimit && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '8px', fontWeight: '500' }}>
                ⚠️ You've reached your limit! Upgrade your plan to continue.
              </p>
            )}
          </div>
        )}
      </div> */}
    </div>
  );
}

// Campaigns Section - Display Generated Emails
// Helper function to convert relative image URLs to absolute URLs
function processImageUrls(html, apiBaseUrl) {
  if (!html) return html;

  // Convert relative URLs that start with /uploads/ to absolute URLs
  // Handle all possible image URL patterns to match backend processing

  let processed = html;

  // FIRST: Migrate old port URLs (4050) to current API port for backward compatibility
  // This fixes images from campaigns generated when backend was on different port
  processed = processed.replace(/https?:\/\/localhost:4050\//gi, `${apiBaseUrl}/`);
  processed = processed.replace(/https?:\/\/[^\/]+:4050\//gi, `${apiBaseUrl}/`);

  // Handle src="/uploads/..."
  processed = processed.replace(/src="(\/uploads\/[^"]+)"/gi, (match, path) => {
    return `src="${apiBaseUrl}${path}"`;
  });

  // Handle src='/uploads/...'
  processed = processed.replace(/src='(\/uploads\/[^']+)'/gi, (match, path) => {
    return `src="${apiBaseUrl}${path}"`;
  });

  // Handle background="/uploads/..." (table background attribute)
  processed = processed.replace(/background="(\/uploads\/[^"]+)"/gi, (match, path) => {
    return `background="${apiBaseUrl}${path}"`;
  });

  // Handle background: url('/uploads/...') or url("/uploads/...")
  processed = processed.replace(/url\(["']?(\/uploads\/[^"')]+)["']?\)/gi, (match, path) => {
    return `url("${apiBaseUrl}${path}")`;
  });

  // Handle href="/uploads/..." (for any image links)
  processed = processed.replace(/href="(\/uploads\/[^"]+)"/gi, (match, path) => {
    return `href="${apiBaseUrl}${path}"`;
  });

  // Handle VML (Vector Markup Language) for Outlook compatibility
  processed = processed.replace(/src="(\/uploads\/[^"]+)"[^>]*xmlns:v=/gi, (match, path) => {
    return match.replace(`src="${path}"`, `src="${apiBaseUrl}${path}"`);
  });

  // Handle any remaining edge cases in attribute values
  processed = processed.replace(/(src|background|href|data-src|data-background)="(\/uploads\/[^"]+)"/gi, (match, attr, path) => {
    return `${attr}="${apiBaseUrl}${path}"`;
  });

  return processed;
}

function CampaignsSection({ token, campaigns, loading, onRefresh, campaignToEdit, onCampaignEdited }) {
  console.log('🔍 [CampaignsSection] Rendering with:', {
    campaignsLength: campaigns?.length || 0,
    loading,
    campaignsType: Array.isArray(campaigns) ? 'array' : typeof campaigns,
    campaigns: campaigns
  });

  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loadingFullCampaign, setLoadingFullCampaign] = useState(false);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' or 'editor'
  const editorRef = useRef(null);
  const editorInstanceRef = useRef(null);
  const [editingSubject, setEditingSubject] = useState(false);
  const [editingPreheader, setEditingPreheader] = useState(false);
  const [tempSubject, setTempSubject] = useState('');
  const [tempPreheader, setTempPreheader] = useState('');
  const [savingChanges, setSavingChanges] = useState(false);
  const [regeneratingComponent, setRegeneratingComponent] = useState(null);
  const [regeneratingImage, setRegeneratingImage] = useState(null);
  const [pendingProductBlockId, setPendingProductBlockId] = useState(null);
  const [productPickerMaxProducts, setProductPickerMaxProducts] = useState(2);
  const [productSelections, setProductSelections] = useState({});
  const processedCampaignRef = useRef(null); // Track which campaign we've already opened

  // Load full campaign data including HTML and MJML
  const loadFullCampaignData = async (campaignId, openInEditor = false) => {
    setLoadingFullCampaign(true);
    try {
      console.log('📥 Fetching full campaign data for:', campaignId);
      const response = await axios.get(`${API}/api/campaigns/${campaignId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('✅ Full campaign data loaded');
      setSelectedCampaign(response.data);

      if (openInEditor) {
        setViewMode('editor');
      } else {
        setViewMode('preview');
      }

      // Scroll to top after a brief delay
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('❌ Error loading full campaign:', error);
      alert('Failed to load campaign data. Please try again.');
    } finally {
      setLoadingFullCampaign(false);
    }
  };

  // Reset processed campaign ref when campaignToEdit changes to a new value
  useEffect(() => {
    if (campaignToEdit && processedCampaignRef.current !== campaignToEdit) {
      processedCampaignRef.current = null; // Reset to allow processing new campaign
    }
  }, [campaignToEdit]);

  // Auto-open campaign in editor mode when campaignToEdit is set
  useEffect(() => {
    console.log('🔄 Auto-open effect triggered:', {
      campaignToEdit,
      loading,
      campaignsCount: campaigns.length,
      alreadyProcessed: processedCampaignRef.current === campaignToEdit
    });

    // Don't try to open campaign while campaigns are still loading
    if (loading) {
      console.log('⏳ Campaigns still loading, waiting...');
      return;
    }

    // Don't process the same campaign twice
    if (campaignToEdit && processedCampaignRef.current === campaignToEdit) {
      console.log('⏭️ Already processed this campaign, skipping');
      return;
    }

    if (campaignToEdit && campaigns.length > 0) {
      console.log('🔍 Looking for campaign to edit:', campaignToEdit);
      console.log('📋 Available campaigns:', campaigns.length);
      console.log('📋 Campaign IDs:', campaigns.map(c => c._id));

      const campaign = campaigns.find(c => c._id === campaignToEdit);

      if (campaign) {
        console.log('✅ Found campaign, opening in editor:', campaign.subject);

        // Mark this campaign as processed
        processedCampaignRef.current = campaignToEdit;

        // Load full campaign data (with HTML/MJML) if not already loaded
        if (!campaign.html || !campaign.mjml) {
          console.log('📥 Loading full campaign data for editor...');
          loadFullCampaignData(campaign._id, true); // true = open in editor
        } else {
          setSelectedCampaign(campaign);
          setViewMode('editor');

          // Scroll to top after a brief delay to ensure DOM is ready
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }

        // Clear the campaignToEdit flag after opening
        setTimeout(() => {
          if (onCampaignEdited) {
            onCampaignEdited();
          }
        }, 500);
      } else {
        console.warn('⚠️ Campaign not found in list:', campaignToEdit);
        console.log('Available IDs:', campaigns.map(c => c._id));
      }
    }
  }, [campaignToEdit, campaigns, loading, onCampaignEdited]);

  // Initialize GrapesJS editor when switching to editor mode
  useEffect(() => {
    if (selectedCampaign && viewMode === 'editor' && editorRef.current && !editorInstanceRef.current) {
      editorInstanceRef.current = grapesjs.init({
        container: editorRef.current,
        fromElement: false,
        height: '600px',
        width: 'auto',
        storageManager: false,
        plugins: ['gjs-preset-newsletter'],
        pluginsOpts: {
          'gjs-preset-newsletter': {}
        },

        // SendWithSES-style minimal configuration
        canvas: {
          styles: [],
          scripts: []
        },

        // No panels needed - we use React buttons
        panels: {
          // defaults: []
        },

        // Device manager
        deviceManager: {
          devices: [
            {
              name: 'Desktop',
              width: ''
            },
            {
              name: 'Tablet',
              width: '768px',
              widthMedia: '992px'
            },
            {
              name: 'Mobile',
              width: '375px',
              widthMedia: '480px'
            }
          ]
        },

        // Block Manager - drag & drop components
        blockManager: {
          appendTo: '.blocks-container'
        },

        // Style Manager - CSS properties
        styleManager: {
          appendTo: '.styles-container',
          sectors: [
            {
              name: 'Dimension',
              open: true,
              buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding']
            },
            {
              name: 'Typography',
              open: true,
              buildProps: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align']
            },
            {
              name: 'Decorations',
              open: false,
              buildProps: ['background-color', 'border-radius', 'border', 'box-shadow', 'background']
            }
          ]
        },

        // Trait Manager - element properties
        traitManager: {
          appendTo: '.traits-container'
        },

        // Hide unnecessary features
        showOffsets: false,
        noticeOnUnload: false
      });

      // Device switcher and other commands
      const editor = editorInstanceRef.current;

      editor.Commands.add('set-device-desktop', {
        run(editor) {
          editor.setDevice('Desktop');
        }
      });

      editor.Commands.add('set-device-tablet', {
        run(editor) {
          editor.setDevice('Tablet');
        }
      });

      editor.Commands.add('set-device-mobile', {
        run(editor) {
          editor.setDevice('Mobile');
        }
      });

      editor.Commands.add('fullscreen', {
        run(editor) {
          const el = editor.getContainer();
          if (el.requestFullscreen) {
            el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
          } else if (el.mozRequestFullScreen) {
            el.mozRequestFullScreen();
          }
        },
        stop() {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
          } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
          }
        }
      });

      // --- Product Blocks for HTML editor ---
      const blockManager = editor.BlockManager;

      blockManager.add('product-grid-2-html', {
        label: '2-Product Grid',
        category: 'Product Blocks',
        content: `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td width="50%" style="padding:12px; text-align:center; vertical-align:top;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Crect fill='%23E5E7EB' width='220' height='220'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='14'%3EProduct 1%3C/text%3E%3C/svg%3E" alt="Product" width="220" style="max-width:100%; border-radius:8px;"/>
      <p style="font-weight:bold; margin:8px 0 4px;">{{product:product:0:name}}</p>
      <p style="color:#666; margin:0 0 8px;">{{product:product:0:price}}</p>
      <a href="{{product:product:0:url}}" style="display:inline-block; padding:8px 20px; background:#2563eb; color:#fff; text-decoration:none; border-radius:4px; font-size:14px;">Shop Now</a>
    </td>
    <td width="50%" style="padding:12px; text-align:center; vertical-align:top;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'%3E%3Crect fill='%23E5E7EB' width='220' height='220'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='14'%3EProduct 2%3C/text%3E%3C/svg%3E" alt="Product" width="220" style="max-width:100%; border-radius:8px;"/>
      <p style="font-weight:bold; margin:8px 0 4px;">{{product:product:1:name}}</p>
      <p style="color:#666; margin:0 0 8px;">{{product:product:1:price}}</p>
      <a href="{{product:product:1:url}}" style="display:inline-block; padding:8px 20px; background:#2563eb; color:#fff; text-decoration:none; border-radius:4px; font-size:14px;">Shop Now</a>
    </td>
  </tr>
</table>`,
        attributes: { class: 'fa fa-th-large' }
      });

      blockManager.add('product-grid-3-html', {
        label: '3-Product Grid',
        category: 'Product Blocks',
        content: `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td width="33%" style="padding:10px; text-align:center; vertical-align:top;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Crect fill='%23E5E7EB' width='180' height='180'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='13'%3EProduct 1%3C/text%3E%3C/svg%3E" alt="Product" width="180" style="max-width:100%; border-radius:8px;"/>
      <p style="font-weight:bold; margin:8px 0 4px; font-size:14px;">{{product:product:0:name}}</p>
      <p style="color:#666; margin:0 0 8px; font-size:13px;">{{product:product:0:price}}</p>
      <a href="{{product:product:0:url}}" style="display:inline-block; padding:6px 16px; background:#2563eb; color:#fff; text-decoration:none; border-radius:4px; font-size:13px;">Shop Now</a>
    </td>
    <td width="33%" style="padding:10px; text-align:center; vertical-align:top;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Crect fill='%23E5E7EB' width='180' height='180'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='13'%3EProduct 2%3C/text%3E%3C/svg%3E" alt="Product" width="180" style="max-width:100%; border-radius:8px;"/>
      <p style="font-weight:bold; margin:8px 0 4px; font-size:14px;">{{product:product:1:name}}</p>
      <p style="color:#666; margin:0 0 8px; font-size:13px;">{{product:product:1:price}}</p>
      <a href="{{product:product:1:url}}" style="display:inline-block; padding:6px 16px; background:#2563eb; color:#fff; text-decoration:none; border-radius:4px; font-size:13px;">Shop Now</a>
    </td>
    <td width="33%" style="padding:10px; text-align:center; vertical-align:top;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' viewBox='0 0 180 180'%3E%3Crect fill='%23E5E7EB' width='180' height='180'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='13'%3EProduct 3%3C/text%3E%3C/svg%3E" alt="Product" width="180" style="max-width:100%; border-radius:8px;"/>
      <p style="font-weight:bold; margin:8px 0 4px; font-size:14px;">{{product:product:2:name}}</p>
      <p style="color:#666; margin:0 0 8px; font-size:13px;">{{product:product:2:price}}</p>
      <a href="{{product:product:2:url}}" style="display:inline-block; padding:6px 16px; background:#2563eb; color:#fff; text-decoration:none; border-radius:4px; font-size:13px;">Shop Now</a>
    </td>
  </tr>
</table>`,
        attributes: { class: 'fa fa-th' }
      });

      blockManager.add('product-spotlight-html', {
        label: 'Product Spotlight',
        category: 'Product Blocks',
        content: `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:20px; text-align:center;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320'%3E%3Crect fill='%23E5E7EB' width='320' height='320'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239CA3AF' font-family='Arial' font-size='16'%3EFeatured Product%3C/text%3E%3C/svg%3E" alt="Product" width="320" style="max-width:100%; border-radius:8px;"/>
      <h2 style="margin:12px 0 4px; font-size:22px;">{{product:product:0:name}}</h2>
      <p style="color:#666; font-size:18px; margin:0 0 12px;">{{product:product:0:price}}</p>
      <a href="{{product:product:0:url}}" style="display:inline-block; padding:12px 32px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px; font-size:16px; font-weight:bold;">Shop Now</a>
    </td>
  </tr>
</table>`,
        attributes: { class: 'fa fa-star' }
      });

      // Load the HTML content (process image URLs to absolute paths)
      let htmlToLoad = selectedCampaign.html || '';

      // Process image URLs - ensure all are absolute and point to correct backend
      htmlToLoad = processImageUrls(htmlToLoad, API);

      // Also normalize any backend URLs that don't match current API
      htmlToLoad = htmlToLoad.replace(/https?:\/\/[^"'\s]+\/uploads\/([^"')]+)/gi, (match, path) => {
        if (!match.includes(API)) {
          console.log('🔄 [EDITOR] Converting backend URL:', match, '→', `${API}/uploads/${path}`);
          return `${API}/uploads/${path}`;
        }
        return match;
      });

      // Final check: convert any remaining relative paths
      htmlToLoad = htmlToLoad.replace(/(src|background|href)=["'](\/uploads\/[^"')]+)["']/gi, (match, attr, path) => {
        if (!path.startsWith('http')) {
          console.log(`🔄 [EDITOR] Converting relative ${attr}:`, path, '→', `${API}${path}`);
          return `${attr}="${API}${path}"`;
        }
        return match;
      });

      // Detect product block drops and trigger product picker
      editor.on('component:add', (component) => {
        const html = component.toHTML();
        const productMatch = html.match(/\{\{product:([^:}]+):/);
        if (productMatch) {
          const componentId = productMatch[1];
          // Derive max products from placeholder indices
          const indexRegex = new RegExp(`\\{\\{product:${componentId}:(\\d+):`, 'g');
          let maxIndex = 0, m;
          while ((m = indexRegex.exec(html)) !== null) {
            maxIndex = Math.max(maxIndex, parseInt(m[1], 10));
          }
          setPendingProductBlockId(componentId);
          setProductPickerMaxProducts(maxIndex + 1);
        }
      });

      console.log('✅ [EDITOR] Loading HTML into editor, length:', htmlToLoad.length);
      editor.setComponents(htmlToLoad);
    }

    // Cleanup on unmount or when switching campaigns
    return () => {
      if (editorInstanceRef.current) {
        try {
          editorInstanceRef.current.destroy();
        } catch (e) {
          console.warn('Editor cleanup warning:', e);
        }
        editorInstanceRef.current = null;
      }
    };
  }, [selectedCampaign, viewMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your campaigns...</p>
          {/* <p className="text-xs text-muted-foreground/50">If this persists, check browser console for errors</p> */}
        </div>
      </div>
    );
  }

  if (selectedCampaign) {
    const handleSaveSubject = async () => {
      try {
        await axios.patch(
          `${API}/api/campaigns/${selectedCampaign._id}`,
          { subject: tempSubject },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedCampaign({ ...selectedCampaign, subject: tempSubject });
        setEditingSubject(false);
        onRefresh();
      } catch (error) {
        console.error('Failed to update subject:', error);
        alert('Failed to update subject');
      }
    };

    const handleSavePreheader = async () => {
      try {
        await axios.patch(
          `${API}/api/campaigns/${selectedCampaign._id}`,
          { preheader: tempPreheader },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSelectedCampaign({ ...selectedCampaign, preheader: tempPreheader });
        setEditingPreheader(false);
        onRefresh();
      } catch (error) {
        console.error('Failed to update preheader:', error);
        alert('Failed to update preheader');
      }
    };

    const handleExportHTML = async () => {
      let htmlToExport = selectedCampaign.html;

      // If in editor mode, get the HTML from the editor
      if (viewMode === 'editor' && editorInstanceRef.current) {
        const body = editorInstanceRef.current.getHtml();
        const css  = editorInstanceRef.current.getCss();
        htmlToExport = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
      }

      try {
        // Convert to shareable HTML with base64 images
        const response = await axios.post(
          `${API}/api/campaigns/${selectedCampaign._id}/shareable-html`,
          { html: htmlToExport },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const shareableHtml = response.data.html;
        const blob = new Blob([shareableHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedCampaign.subject || 'email'}-shareable.html`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error converting to shareable HTML:', error);
        // Fallback to original HTML if conversion fails
        const blob = new Blob([htmlToExport], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'email.html';
        a.click();
        URL.revokeObjectURL(url);
        alert('Downloaded HTML (Note: Images may not work when shared)');
      }
    };

    const handleCopyHTML = async () => {
      let htmlToCopy = selectedCampaign.html;

      // If in editor mode, get the HTML from the editor
      if (viewMode === 'editor' && editorInstanceRef.current) {
        const body = editorInstanceRef.current.getHtml();
        const css  = editorInstanceRef.current.getCss();
        htmlToCopy = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;
      }

      try {
        // Convert to shareable HTML with base64 images
        const response = await axios.post(
          `${API}/api/campaigns/${selectedCampaign._id}/shareable-html`,
          { html: htmlToCopy },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const shareableHtml = response.data.html;
        await navigator.clipboard.writeText(shareableHtml);
        alert('Shareable HTML copied to clipboard! (Images embedded as base64)');
      } catch (error) {
        console.error('Error converting to shareable HTML:', error);
        // Fallback to original HTML if conversion fails
        try {
          await navigator.clipboard.writeText(htmlToCopy);
        alert('HTML copied to clipboard! (Note: Images may not work when shared)');
        } catch (clipboardError) {
          console.error('Failed to copy to clipboard:', clipboardError);
          alert('Failed to copy HTML to clipboard. Please try again.');
        }
      }
    };

    const handleSaveEditorChanges = async () => {
      if (!editorInstanceRef.current) {
        alert('Editor not ready');
        return;
      }

      setSavingChanges(true);

      try {
        // Get full HTML from editor (body + css combined into proper document)
        const body = editorInstanceRef.current.getHtml();
        const css  = editorInstanceRef.current.getCss();
        const updatedHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${body}</body></html>`;

        // Send update to backend
        const response = await axios.patch(
          `${API}/api/campaigns/${selectedCampaign._id}`,
          { html: updatedHtml },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        // Update local state
        setSelectedCampaign({ ...selectedCampaign, html: updatedHtml });

        // Refresh campaigns list
        onRefresh();

        alert('Changes saved successfully! ✅');
      } catch (error) {
        console.error('Failed to save changes:', error);
        alert('Failed to save changes. Please try again.');
      } finally {
        setSavingChanges(false);
      }
    };

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

    // Per-component regeneration handler
    const handleRegenerateComponent = async (componentId) => {
      if (!selectedCampaign?._id) return;

      setRegeneratingComponent(componentId);
      try {
        const response = await axios.post(
          `${API}/api/campaigns/${selectedCampaign._id}/regenerate-component`,
          { component_id: componentId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.html) {
          setSelectedCampaign({ ...selectedCampaign, html: response.data.html });
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
      if (!selectedCampaign?._id) return;

      setRegeneratingImage(slotId);
      try {
        const response = await axios.post(
          `${API}/api/campaigns/${selectedCampaign._id}/regenerate-image`,
          { slotId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.html) {
          setSelectedCampaign({ ...selectedCampaign, html: response.data.html });
        }
      } catch (err) {
        console.error('Image regeneration failed:', err);
        alert('Failed to regenerate image. Please try again.');
      } finally {
        setRegeneratingImage(null);
      }
    };

    // Filter editable components (exclude locked, non-AI, header/footer)
    const campaignComponents = selectedCampaign.designOutput?.components || [];
    const editableComponents = campaignComponents.filter(
      c => !c.locked && c.allow_ai_text !== false && c.type !== 'header' && c.type !== 'footer'
    );

    // Filter editable image slots
    const campaignImageSlots = selectedCampaign.designOutput?.imageSlots || [];
    const editableImageSlots = filterEditableImageSlots(campaignImageSlots, campaignComponents);

    // Handle product picker confirm: fetch product data and replace placeholders in editor
    const handleProductConfirm = async (productIds) => {
      setProductSelections(prev => ({
        ...prev,
        [pendingProductBlockId]: productIds
      }));

      try {
        // Fetch all products
        const response = await axios.get(`${API}/api/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const allProducts = response.data?.products || response.data?.data?.products || response.data || [];

        // Get current HTML from editor
        const editor = editorInstanceRef.current;
        if (!editor) {
          setPendingProductBlockId(null);
          return;
        }

        let html = editor.getHtml();
        const compId = pendingProductBlockId;

        // Replace placeholders with real product data
        productIds.forEach((pid, index) => {
          const product = allProducts.find(p => p._id === pid);
          if (!product) return;

          const prefix = `{{product:${compId}:${index}`;
          html = html.replace(`${prefix}:name}}`, product.name || 'Product');
          html = html.replace(
            `${prefix}:price}}`,
            `${product.currency || '$'}${product.price || ''}`
          );
          html = html.replace(`${prefix}:url}}`, product.product_url || '#');

          // Replace placeholder image for this product index
          // Match the SVG placeholder that says "Product N" (N = index + 1) or "Featured Product"
          const placeholderLabel = productIds.length === 1 ? 'Featured Product' : `Product ${index + 1}`;
          const imgRegex = new RegExp(
            `<img[^>]*src="data:image/svg\\+xml[^"]*${placeholderLabel.replace(' ', '\\s*')}[^"]*"[^>]*>`,
            'i'
          );
          if (product.image_url) {
            html = html.replace(
              imgRegex,
              `<img src="${product.image_url}" alt="${product.name}" width="220" style="max-width:100%; border-radius:8px;"/>`
            );
          }
        });

        // Update editor with resolved HTML
        const currentCss = editor.getCss();
        editor.setComponents(html);
        if (currentCss) {
          editor.setStyle(currentCss);
        }
      } catch (err) {
        console.error('Failed to load products for placeholder replacement:', err);
      }

      setPendingProductBlockId(null);
    };

    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedCampaign(null);
            setViewMode('preview');
          }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Preview</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-2">
              <Calendar className="w-4 h-4" />
              Created: {new Date(selectedCampaign.createdAt).toLocaleDateString()} at {new Date(selectedCampaign.createdAt).toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Prompt */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Original Prompt:</p>
                    <p className="text-sm text-muted-foreground">{selectedCampaign.prompt || 'No prompt available'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject & Preheader */}
            <Card className="bg-accent/20">
              <CardContent className="pt-6 space-y-4">
                {/* Subject Line */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Subject Line</label>
                    {!editingSubject && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTempSubject(selectedCampaign.subject || '');
                          setEditingSubject(true);
                        }}
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingSubject ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tempSubject}
                        onChange={(e) => setTempSubject(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Enter subject line..."
                      />
                      <Button size="sm" onClick={handleSaveSubject}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingSubject(false)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm">
                      {selectedCampaign.subject || <span className="text-muted-foreground italic">No subject line</span>}
                    </p>
                  )}
                </div>

                {/* Preheader */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Preheader Text</label>
                    {!editingPreheader && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTempPreheader(selectedCampaign.preheader || '');
                          setEditingPreheader(true);
                        }}
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingPreheader ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tempPreheader}
                        onChange={(e) => setTempPreheader(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Enter preheader text..."
                      />
                      <Button size="sm" onClick={handleSavePreheader}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPreheader(false)}>
                        ✕
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedCampaign.preheader || <span className="italic">No preheader text</span>}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* View Mode Toggle & Actions */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={viewMode === 'preview' ? 'default' : 'outline'}
                onClick={() => setViewMode('preview')}
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
              <Button
                variant={viewMode === 'editor' ? 'default' : 'outline'}
                onClick={() => setViewMode('editor')}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {viewMode === 'editor' && (
                <Button
                  variant="default"
                  onClick={handleSaveEditorChanges}
                  disabled={savingChanges}
                >
                  {savingChanges ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
              <div className="flex-1" />
              <Button variant="outline" onClick={handleCopyHTML}>
                <Copy className="w-4 h-4 mr-2" />
                Copy HTML
              </Button>
              <Button onClick={handleExportHTML}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>

            {/* Email preview or editor */}
            <div className="rounded-lg border overflow-hidden">
              {viewMode === 'preview' ? (
                <iframe
                  title="Email Preview"
                  srcDoc={(() => {
                    // Process image URLs - handle both relative and ensure absolute URLs
                    let html = selectedCampaign.html || '';
                    if (!html) {
                      console.warn('⚠️ [PREVIEW] No HTML content in selectedCampaign');
                      return '';
                    }

                    // Debug: Check for image URLs before processing
                    const imageMatches = html.match(/src=["']([^"']+)/gi) || [];
                    const uploadMatches = html.match(/\/uploads\/[^"')]+/gi) || [];
                    console.log('🖼️ [PREVIEW] Image URLs found:', {
                      totalSrc: imageMatches.length,
                      uploadPaths: uploadMatches.length,
                      apiBaseUrl: API
                    });

                    // Process relative URLs that might still exist
                    html = processImageUrls(html, API);

                    // Also handle URLs that might be missing the protocol or pointing to wrong backend
                    // Convert any localhost:3000 references to backend URL
                    html = html.replace(/http:\/\/localhost:3000(\/uploads\/[^"')]+)/gi, (match, path) => {
                      console.log('🔄 [PREVIEW] Converting localhost:3000 URL:', match, '→', `${API}${path}`);
                      return `${API}${path}`;
                    });

                    // Convert any localhost:4050 or other backend URLs to current API URL
                    html = html.replace(/https?:\/\/[^"'\s]+\/uploads\/([^"')]+)/gi, (match, path) => {
                      // If the URL doesn't match our current API, replace it
                      if (!match.includes(API)) {
                        console.log('🔄 [PREVIEW] Converting backend URL:', match, '→', `${API}/uploads/${path}`);
                        return `${API}/uploads/${path}`;
                      }
                      return match;
                    });

                    // Final check: ensure all /uploads/ paths are absolute
                    html = html.replace(/(src|background|href)=["'](\/uploads\/[^"')]+)["']/gi, (match, attr, path) => {
                      if (!path.startsWith('http')) {
                        console.log(`🔄 [PREVIEW] Converting relative ${attr}:`, path, '→', `${API}${path}`);
                        return `${attr}="${API}${path}"`;
                      }
                      return match;
                    });

                    console.log('✅ [PREVIEW] Final processed HTML length:', html.length);
                    return html;
                  })()}
                  className="w-full h-[600px] bg-white"
                  sandbox="allow-same-origin allow-scripts"
                  onError={(e) => {
                    console.error('❌ [PREVIEW] Iframe error:', e);
                  }}
                />
              ) : (
                <div className="h-[600px] flex flex-col bg-white">
                  {/* Top Toolbar - Custom React Buttons */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                    {/* Left Side - Action Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editorInstanceRef.current?.Commands.run('sw-visibility')}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-spark transition-colors"
                        title="Toggle Borders"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => editorInstanceRef.current?.Commands.run('fullscreen')}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-spark transition-colors"
                        title="Fullscreen"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => editorInstanceRef.current?.Commands.run('core:undo')}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-spark transition-colors"
                        title="Undo"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => editorInstanceRef.current?.Commands.run('core:redo')}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-spark transition-colors"
                        title="Redo"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Clear all content from the canvas?')) {
                            editorInstanceRef.current?.Commands.run('core:canvas-clear');
                          }
                        }}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-red-500 transition-colors"
                        title="Clear Canvas"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                      </button>
                    </div>

                    {/* Right Side - Device Buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => editorInstanceRef.current?.setDevice('Desktop')}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-spark transition-colors"
                        title="Desktop"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => editorInstanceRef.current?.setDevice('Tablet')}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-spark transition-colors"
                        title="Tablet"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M18 0H6C4.34 0 3 1.34 3 3v18c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V3c0-1.66-1.34-3-3-3zm-4 22h-4v-1h4v1zm5.25-3H4.75V3h14.5v16z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => editorInstanceRef.current?.setDevice('Mobile')}
                        className="flex items-center justify-center w-9 h-9 rounded border border-gray-300 bg-white hover:bg-gray-100 hover:border-spark transition-colors"
                        title="Mobile"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" className="text-brillu-text-secondary">
                          <path fill="currentColor" d="M16 1H8C6.34 1 5 2.34 5 4v16c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V4c0-1.66-1.34-3-3-3zm-2 20h-4v-1h4v1zm3.25-3H6.75V4h10.5v14z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Main Editor Area */}
                  <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar - Always Visible (SendWithSES Style) */}
                    <div className="w-64 bg-white border-r overflow-y-auto">
                      {/* Blocks Panel */}
                      <div className="blocks-container p-4"></div>

                      {/* Style Manager */}
                      <div className="styles-container p-4 border-t"></div>

                      {/* Trait Manager */}
                      <div className="traits-container p-4 border-t"></div>
                    </div>

                    {/* Main Canvas Area */}
                    <div className="flex-1 flex flex-col bg-gray-100">
                      {/* GrapesJS Editor */}
                      <div ref={editorRef} className="flex-1" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Text Regeneration */}
            {selectedCampaign.state === 'DONE' && editableComponents.length > 0 && (
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
            {selectedCampaign.state === 'DONE' && editableImageSlots.length > 0 && (
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
          </CardContent>
        </Card>

        {/* Product Picker Modal for HTML editor */}
        <ProductPickerModal
          isOpen={!!pendingProductBlockId}
          onClose={() => setPendingProductBlockId(null)}
          onConfirm={handleProductConfirm}
          maxProducts={productPickerMaxProducts}
          preSelected={productSelections[pendingProductBlockId] || []}
          token={token}
        />
      </div>
    );
  }

  // Safety check: ensure campaigns is an array
  const campaignsArray = Array.isArray(campaigns) ? campaigns : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="w-6 h-6 text-primary" />
            My Campaigns
          </h2>
          <p className="text-muted-foreground mt-1">View and manage your generated email campaigns</p>
        </div>
        <Button onClick={onRefresh} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {campaignsArray.length === 0 && !loading ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              Generate your first email campaign using AI
            </p>
            <Button onClick={() => window.location.href = '/'}>
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaignsArray.map((campaign) => (
            <Card
              key={campaign._id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                // Load full campaign data if HTML/MJML not available
                if (!campaign.html || !campaign.mjml) {
                  loadFullCampaignData(campaign._id, false); // false = preview mode
                } else {
                  setSelectedCampaign(campaign);
                  setViewMode('preview');
                }
              }}
            >
              {campaign.imageUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                  <img
                    src={
                      campaign.imageUrl.startsWith('http') || campaign.imageUrl.startsWith('//')
                        ? campaign.imageUrl
                        : campaign.imageUrl.startsWith('/uploads/')
                          ? `${API}${campaign.imageUrl}`
                          : `${API}/uploads/${campaign.imageUrl}`
                    }
                    alt="Email preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Mail className="w-12 h-12 text-white opacity-50" />
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-base line-clamp-2">
                  {campaign.subject || (campaign.prompt ? campaign.prompt.substring(0, 70) : 'Untitled Campaign')}{!campaign.subject && campaign.prompt && campaign.prompt.length > 70 ? '...' : ''}
                </CardTitle>
                {campaign.preheader && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                    {campaign.preheader}
                  </p>
                )}
                <CardDescription className="flex items-center gap-1 text-xs mt-2">
                  <Calendar className="w-3 h-3" />
                  {new Date(campaign.createdAt).toLocaleDateString()}
                  {campaign.templateName && campaign.templateName !== 'Dynamic Template' && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="text-xs">{campaign.templateName}</span>
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View & Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Templates Section
function TemplatesSection({ token, onNavigateToHome, selectedTemplate, onSelectTemplate }) {
  const handleTemplateSelect = (template) => {
    onSelectTemplate(template);
    // Optionally navigate to home after selection
    if (onNavigateToHome) {
      onNavigateToHome();
    }
  };

  return (
    <TemplateGallery
      onSelectTemplate={handleTemplateSelect}
      selectedTemplateId={selectedTemplate?.id}
    />
  );
}

// Settings Section
function SettingsSection({ token }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Settings
        </h2>
        <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-4">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription>Manage your account details and password</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Plan & Billing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <LayoutTemplate className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">Plan & Billing</CardTitle>
                <CardDescription>Current Plan: <strong>Free</strong></CardDescription>
              </div>
              <Button size="sm">
                Upgrade Plan
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-base">API Keys</CardTitle>
                <CardDescription>Manage API keys for integrations</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

