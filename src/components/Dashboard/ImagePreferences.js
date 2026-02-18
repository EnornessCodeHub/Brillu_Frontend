import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Save, Loader2, Plus, X, Sparkles, Image as ImageIcon, ShoppingBag, MousePointer, Heart, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import API from '../../config/api.config';

const IMAGE_TYPES = [
  { id: 'hero', label: 'Hero Banner', icon: ImageIcon, description: 'Main banner images at the top of emails' },
  { id: 'product', label: 'Product', icon: ShoppingBag, description: 'Product showcase images' },
  // { id: 'cta', label: 'CTA', icon: MousePointer, description: 'Call-to-action section images' },
  // { id: 'lifestyle', label: 'Lifestyle', icon: Heart, description: 'Lifestyle and mood images' },
  { id: 'general', label: 'General', icon: Layers, description: 'Default settings for all other images' }
];

const DEFAULT_SECTION = {
  compositionStyle: '',
  lighting: '',
  colorTreatment: '',
  backgroundStyle: '',
  moodAtmosphere: '',
  additionalInstructions: '',
  negativePromptAdditions: []
};

export default function ImagePreferences({ token }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [preferences, setPreferences] = useState({
    hero: { ...DEFAULT_SECTION },
    product: { ...DEFAULT_SECTION },
    cta: { ...DEFAULT_SECTION },
    lifestyle: { ...DEFAULT_SECTION },
    general: { ...DEFAULT_SECTION }
  });
  const [newTag, setNewTag] = useState('');
  const [brandIndex, setBrandIndex] = useState(0);

  useEffect(() => {
    loadPreferences();
  }, [token]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data?.data?.brandInfo?.[brandIndex]?.imagePreferences) {
        const saved = response.data.data.brandInfo[brandIndex].imagePreferences;
        setPreferences({
          hero: { ...DEFAULT_SECTION, ...saved.hero },
          product: { ...DEFAULT_SECTION, ...saved.product },
          cta: { ...DEFAULT_SECTION, ...saved.cta },
          lifestyle: { ...DEFAULT_SECTION, ...saved.lifestyle },
          general: { ...DEFAULT_SECTION, ...saved.general }
        });
      }
    } catch (error) {
      console.error('Error loading image preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Auto-add pending tag before saving
      const flushPreferences = { ...preferences };
      if (newTag.trim()) {
        const currentTab = { ...flushPreferences[activeTab] };
        if (!currentTab.negativePromptAdditions.includes(newTag.trim())) {
          currentTab.negativePromptAdditions = [...currentTab.negativePromptAdditions, newTag.trim()];
        }
        flushPreferences[activeTab] = currentTab;
        setNewTag('');
        setPreferences(flushPreferences);
      }

      // First get current preferences
      const currentResponse = await axios.get(`${API}/api/preferences`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const currentPrefs = currentResponse.data?.data || currentResponse.data || {};
      const brandInfo = currentPrefs.brandInfo || [{}];

      // Update image preferences in the brand
      if (!brandInfo[brandIndex]) {
        brandInfo[brandIndex] = {};
      }
      brandInfo[brandIndex].imagePreferences = flushPreferences;

      // Save back — exclude mediaAssets to prevent stale overwrite
      const { mediaAssets, lastUpdated, ...safePrefs } = currentPrefs;
      await axios.put(
        `${API}/api/preferences`,
        { ...safePrefs, brandInfo },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Image preferences saved successfully!');
    } catch (error) {
      console.error('Error saving image preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        [field]: value
      }
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !preferences[activeTab].negativePromptAdditions.includes(newTag.trim())) {
      handleFieldChange('negativePromptAdditions', [
        ...preferences[activeTab].negativePromptAdditions,
        newTag.trim()
      ]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    handleFieldChange(
      'negativePromptAdditions',
      preferences[activeTab].negativePromptAdditions.filter(tag => tag !== tagToRemove)
    );
  };

  const currentSection = preferences[activeTab] || DEFAULT_SECTION;
  const currentType = IMAGE_TYPES.find(t => t.id === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading image preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Camera className="w-6 h-6 text-primary" />
            Image Preferences
          </h2>
          <p className="text-muted-foreground mt-1">
            Configure AI image generation settings for different image types
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-4">
        {IMAGE_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setActiveTab(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === type.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Current Tab Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentType && <currentType.icon className="w-5 h-5" />}
            {currentType?.label} Image Settings
          </CardTitle>
          <CardDescription>{currentType?.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Composition Style */}
          <div className="space-y-2">
            <Label htmlFor="compositionStyle">Composition Style</Label>
            <Input
              id="compositionStyle"
              value={currentSection.compositionStyle}
              onChange={(e) => handleFieldChange('compositionStyle', e.target.value)}
              placeholder="e.g., Centered subject, rule of thirds, symmetrical layout"
            />
            <p className="text-xs text-muted-foreground">
              How the image elements should be arranged
            </p>
          </div>

          {/* Lighting */}
          <div className="space-y-2">
            <Label htmlFor="lighting">Lighting</Label>
            <Input
              id="lighting"
              value={currentSection.lighting}
              onChange={(e) => handleFieldChange('lighting', e.target.value)}
              placeholder="e.g., Soft studio lighting, natural daylight, dramatic shadows"
            />
            <p className="text-xs text-muted-foreground">
              Preferred lighting style and mood
            </p>
          </div>

          {/* Color Treatment */}
          <div className="space-y-2">
            <Label htmlFor="colorTreatment">Color Treatment</Label>
            <Input
              id="colorTreatment"
              value={currentSection.colorTreatment}
              onChange={(e) => handleFieldChange('colorTreatment', e.target.value)}
              placeholder="e.g., Vibrant colors, muted tones, high contrast, pastel palette"
            />
            <p className="text-xs text-muted-foreground">
              Color grading and palette preferences
            </p>
          </div>

          {/* Background Style */}
          <div className="space-y-2">
            <Label htmlFor="backgroundStyle">Background Style</Label>
            <Input
              id="backgroundStyle"
              value={currentSection.backgroundStyle}
              onChange={(e) => handleFieldChange('backgroundStyle', e.target.value)}
              placeholder="e.g., Clean white background, gradient, contextual environment"
            />
            <p className="text-xs text-muted-foreground">
              Background preferences for this image type
            </p>
          </div>

          {/* Mood / Atmosphere */}
          <div className="space-y-2">
            <Label htmlFor="moodAtmosphere">Mood / Atmosphere</Label>
            <Input
              id="moodAtmosphere"
              value={currentSection.moodAtmosphere}
              onChange={(e) => handleFieldChange('moodAtmosphere', e.target.value)}
              placeholder="e.g., Professional, playful, luxurious, energetic, calm"
            />
            <p className="text-xs text-muted-foreground">
              The overall feel and emotional tone
            </p>
          </div>

          {/* Additional Instructions */}
          <div className="space-y-2">
            <Label htmlFor="additionalInstructions">Additional Instructions</Label>
            <textarea
              id="additionalInstructions"
              value={currentSection.additionalInstructions}
              onChange={(e) => handleFieldChange('additionalInstructions', e.target.value)}
              placeholder="Any specific instructions for AI image generation..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">
              Extra guidelines for the AI when generating this type of image
            </p>
          </div>

          {/* Negative Prompt Additions */}
          <div className="space-y-2">
            <Label>Negative Prompt Additions</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Elements to avoid in generated images
            </p>
            
            <div className="flex gap-2 mb-3">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="e.g., text, watermark, blurry"
                className="flex-1"
              />
              <Button type="button" onClick={handleAddTag} variant="outline" size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {currentSection.negativePromptAdditions.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {currentSection.negativePromptAdditions.length === 0 && (
                <span className="text-sm text-muted-foreground italic">
                  No negative prompts added
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {/* Tips Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium mb-1">Tips for Better Images</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Be specific about lighting and mood for consistent brand imagery</li>
                <li>• Use negative prompts to avoid unwanted elements like text or watermarks</li>
                <li>• The "General" tab settings apply as fallbacks for all image types</li>
                <li>• Hero images work best with 16:9 aspect ratio compositions</li>
                <li>• Product images should have clean backgrounds for e-commerce</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
