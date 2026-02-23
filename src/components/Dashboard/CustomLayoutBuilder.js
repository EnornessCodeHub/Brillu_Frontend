import React, { useRef, useEffect, useState } from 'react';
import axios from 'axios';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import '../../grapesjs-custom-theme.css'; // Unified GrapesJS theme
import mjmlPlugin from 'grapesjs-mjml';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Save, Loader2, Trash2, Edit3, Plus, Layout, Eye, X, ShoppingBag, ArrowLeft, FileText, Mail } from 'lucide-react';
import API from '../../config/api.config';
import ProductPickerModal from './ProductPickerModal';

// Placeholder SVGs for image slots (shown in editor instead of broken {{image:*}} URLs)
// IMPORTANT: All single quotes MUST be encoded as %27 to prevent MJML attribute parsing breakage
const PLACEHOLDER_IMG = `data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27600%27 height=%27340%27 viewBox=%270 0 600 340%27%3E%3Crect fill=%27%23E5E7EB%27 width=%27600%27 height=%27340%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%239CA3AF%27 font-family=%27Arial%27 font-size=%2718%27%3EImage Preview%3C/text%3E%3C/svg%3E`;
const PLACEHOLDER_PRODUCT_IMG = `data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27220%27 height=%27220%27 viewBox=%270 0 220 220%27%3E%3Crect fill=%27%23E5E7EB%27 width=%27220%27 height=%27220%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%239CA3AF%27 font-family=%27Arial%27 font-size=%2714%27%3EProduct%3C/text%3E%3C/svg%3E`;
const PLACEHOLDER_LOGO_IMG = `data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27140%27 height=%2740%27 viewBox=%270 0 140 40%27%3E%3Crect fill=%27%23E5E7EB%27 width=%27140%27 height=%2740%27 rx=%274%27/%3E%3Ctext x=%2750%25%27 y=%2750%25%27 dominant-baseline=%27middle%27 text-anchor=%27middle%27 fill=%27%239CA3AF%27 font-family=%27Arial%27 font-size=%2712%27%3EYour Logo%3C/text%3E%3C/svg%3E`;

/**
 * Content slot → dummy text mapping.
 * Editor shows readable text; on export these convert back to {{content:...}} markers.
 */
const SLOT_DUMMY_MAP = {
  'headline': 'Your Headline Here',
  'hero-headline': 'Your Hero Headline Here',
  'subheading': 'Your Subheading Here',
  'body-text': 'Your body text will appear here. The AI will generate engaging content based on your brief.',
  'cta-text': 'Click Here',
  'cta-headline': 'Ready to Get Started?',
  'offer-text': 'SPECIAL OFFER',
  'footer': 'Footer content from your settings',
  'feature-headline': 'Feature Headline',
  'feature-text': 'Description of this feature goes here.',
  'product-headline': 'Product Name',
  'product-description': 'Product description will appear here.',
  'highlight-headline-1': 'Feature One',
  'highlight-text-1': 'Description of the first feature goes here.',
  'highlight-headline-2': 'Feature Two',
  'highlight-text-2': 'Description of the second feature goes here.',
};

// Reverse map: dummy text → slot ID (for export)
const DUMMY_TO_SLOT = {};
for (const [slotId, text] of Object.entries(SLOT_DUMMY_MAP)) {
  DUMMY_TO_SLOT[text] = slotId;
}

/**
 * Convert saved MJML (with {{image:*}} / {{product:*:*:image}}) to editor-friendly format.
 * Replaces src with placeholder SVGs and tracks original slot names via css-class.
 */
function prepareForEditor(mjml) {
  return mjml.replace(/<mj-image\b[^>]*?\/?>/gi, (tag) => {
    // Check for {{logo}} in src
    const logoMatch = tag.match(/src=["'](\{\{logo\}\})["']/);
    if (logoMatch) {
      let result = tag.replace(logoMatch[1], PLACEHOLDER_LOGO_IMG);
      const cssClassMatch = result.match(/css-class=["']([^"']*)["']/);
      if (cssClassMatch) {
        result = result.replace(cssClassMatch[0], `css-class="${cssClassMatch[1]} img-slot--logo"`);
      } else {
        result = result.replace(/\/?>\s*$/, ` css-class="img-slot--logo" />`);
      }
      return result;
    }

    // Check for {{image:X}} in src
    const imgMatch = tag.match(/src=["'](\{\{image:([^}]+)\}\})["']/);
    if (imgMatch) {
      const slotName = imgMatch[2];
      let result = tag.replace(imgMatch[1], PLACEHOLDER_IMG);
      // Add css-class tracking (append to existing or add new)
      const cssClassMatch = result.match(/css-class=["']([^"']*)["']/);
      if (cssClassMatch) {
        result = result.replace(cssClassMatch[0], `css-class="${cssClassMatch[1]} img-slot--${slotName}"`);
      } else {
        result = result.replace(/\/?>\s*$/, ` css-class="img-slot--${slotName}" />`);
      }
      return result;
    }

    // Check for {{product:X:Y:image}} in src
    const prodMatch = tag.match(/src=["'](\{\{product:([^:}]+):([^:}]+):image\}\})["']/);
    if (prodMatch) {
      const compId = prodMatch[2];
      const idx = prodMatch[3];
      let result = tag.replace(prodMatch[1], PLACEHOLDER_PRODUCT_IMG);
      const cssClassMatch = result.match(/css-class=["']([^"']*)["']/);
      if (cssClassMatch) {
        result = result.replace(cssClassMatch[0], `css-class="${cssClassMatch[1]} product-img-slot--${compId}--${idx}"`);
      } else {
        result = result.replace(/\/?>\s*$/, ` css-class="product-img-slot--${compId}--${idx}" />`);
      }
      return result;
    }

    return tag;
  });

  // Special non-standard markers → slot ID mapping
  const SPECIAL_MARKERS = { '{{footer}}': 'footer' };

  // Convert {{content:slotId}} and special markers to dummy text + css-class tracking
  mjml = mjml.replace(/<mj-text([^>]*)>([\s\S]*?)<\/mj-text>/gi, (match, attrs, innerText) => {
    const trimmed = innerText.trim();

    // Check for standard {{content:X}} pattern
    const slotMatch = trimmed.match(/^\{\{content:([^}]+)\}\}$/);
    if (slotMatch) {
      const slotId = slotMatch[1];
      const dummyText = SLOT_DUMMY_MAP[slotId] || slotId;
      if (attrs.includes('css-class="')) {
        attrs = attrs.replace(/css-class="([^"]*)"/, `css-class="$1 content-slot--${slotId}"`);
      } else {
        attrs += ` css-class="content-slot--${slotId}"`;
      }
      return `<mj-text${attrs}>${dummyText}</mj-text>`;
    }

    // Check for special markers like {{footer}}
    if (SPECIAL_MARKERS[trimmed]) {
      const slotId = SPECIAL_MARKERS[trimmed];
      const dummyText = SLOT_DUMMY_MAP[slotId] || slotId;
      if (attrs.includes('css-class="')) {
        attrs = attrs.replace(/css-class="([^"]*)"/, `css-class="$1 content-slot--${slotId}"`);
      } else {
        attrs += ` css-class="content-slot--${slotId}"`;
      }
      return `<mj-text${attrs}>${dummyText}</mj-text>`;
    }

    return match;
  });

  // Also convert {{content:slotId}} inside mj-button
  mjml = mjml.replace(/<mj-button([^>]*)>([\s\S]*?)<\/mj-button>/gi, (match, attrs, innerText) => {
    const slotMatch = innerText.trim().match(/^\{\{content:([^}]+)\}\}$/);
    if (slotMatch) {
      const slotId = slotMatch[1];
      const dummyText = SLOT_DUMMY_MAP[slotId] || slotId;
      if (attrs.includes('css-class="')) {
        attrs = attrs.replace(/css-class="([^"]*)"/, `css-class="$1 content-slot--${slotId}"`);
      } else {
        attrs += ` css-class="content-slot--${slotId}"`;
      }
      return `<mj-button${attrs}>${dummyText}</mj-button>`;
    }
    return match;
  });

  return mjml;
}

/**
 * Valid mj-image attributes (excluding src, which is set explicitly).
 * Used by restoreImageSlots and exportMjml safety net to rebuild clean tags,
 * stripping any SVG garbage that leaked from broken data-URI quoting.
 */
const VALID_MJ_IMAGE_ATTRS = [
  'alt', 'width', 'height', 'padding', 'padding-top', 'padding-right',
  'padding-bottom', 'padding-left', 'align', 'border', 'border-radius',
  'container-background-color', 'css-class', 'fluid-on-mobile', 'href',
  'rel', 'target', 'title', 'name', 'srcset', 'sizes'
];

/**
 * Extract valid attributes from a (possibly malformed) mj-image tag.
 * Takes the LAST occurrence of each attribute so real MJML attrs win over
 * SVG garbage that may have leaked into the tag from broken src quoting.
 */
function extractLastAttrs(tag, validNames) {
  const attrs = {};
  for (const name of validNames) {
    const regex = new RegExp(`\\b${name}=["']([^"']*?)["']`, 'g');
    let match;
    while ((match = regex.exec(tag)) !== null) {
      attrs[name] = match[1]; // last occurrence wins
    }
  }
  return attrs;
}

/** Build a clean mj-image tag from src + attributes object. */
function buildMjImage(src, attrs) {
  let tag = `<mj-image src="${src}"`;
  for (const [key, value] of Object.entries(attrs)) {
    tag += ` ${key}="${value}"`;
  }
  tag += ' />';
  return tag;
}

/**
 * Restore {{image:*}} / {{product:*:*:image}} patterns from css-class tracking.
 * Called before saving to DB — ensures saved MJML is identical to original format.
 *
 * Instead of regex-replacing just the src (which breaks when SVG data-URI single
 * quotes leak into the tag), we REBUILD the entire mj-image tag from scratch,
 * keeping only known valid MJML attributes.
 */
function restoreImageSlots(mjml) {
  return mjml.replace(/<mj-image\b[^>]*?\/?>/gi, (tag) => {
    // Check for img-slot--X in css-class
    const imgSlotMatch = tag.match(/\bimg-slot--([^\s"']+)/);
    if (imgSlotMatch) {
      const slotName = imgSlotMatch[1];
      const attrs = extractLastAttrs(tag, VALID_MJ_IMAGE_ATTRS);
      // Remove tracking class from css-class
      if (attrs['css-class']) {
        attrs['css-class'] = attrs['css-class'].replace(/\s*\bimg-slot--[^\s"']+/, '').trim();
        if (!attrs['css-class']) delete attrs['css-class'];
      }
      // Special case: logo slot restores as {{logo}}, not {{image:logo}}
      const src = slotName === 'logo' ? '{{logo}}' : `{{image:${slotName}}}`;
      return buildMjImage(src, attrs);
    }

    // Check for product-img-slot--X--Y in css-class
    const prodSlotMatch = tag.match(/\bproduct-img-slot--([^\s"']+)--(\d+)/);
    if (prodSlotMatch) {
      const compId = prodSlotMatch[1];
      const idx = prodSlotMatch[2];
      const attrs = extractLastAttrs(tag, VALID_MJ_IMAGE_ATTRS);
      if (attrs['css-class']) {
        attrs['css-class'] = attrs['css-class'].replace(/\s*\bproduct-img-slot--[^\s"']+/, '').trim();
        if (!attrs['css-class']) delete attrs['css-class'];
      }
      return buildMjImage(`{{product:${compId}:${idx}:image}}`, attrs);
    }

    return tag;
  });
}

/**
 * Restore {{content:slotId}} markers from content-slot-- css-class tracking.
 * Replaces dummy text with slot markers before saving to DB.
 */
function restoreContentSlots(mjml) {
  // Special slot IDs that use non-standard marker format
  const SPECIAL_SLOTS = {
    'footer': '{{footer}}',  // Backend uses {{footer}}, not {{content:footer}}
  };

  // Restore mj-text content slots
  mjml = mjml.replace(/<mj-text([^>]*)>([\s\S]*?)<\/mj-text>/gi, (match, attrs, innerText) => {
    const slotMatch = attrs.match(/\bcontent-slot--([^\s"']+)/);
    if (slotMatch) {
      const slotId = slotMatch[1];
      const marker = SPECIAL_SLOTS[slotId] || `{{content:${slotId}}}`;
      // Remove content-slot-- tracking class from css-class
      let cleanAttrs = attrs.replace(/\s*\bcontent-slot--[^\s"']+/, '').trim();
      // Clean up empty css-class attribute
      cleanAttrs = cleanAttrs.replace(/css-class=["']\s*["']/, '').trim();
      return `<mj-text${cleanAttrs}>${marker}</mj-text>`;
    }
    return match;
  });

  // Restore mj-button content slots
  mjml = mjml.replace(/<mj-button([^>]*)>([\s\S]*?)<\/mj-button>/gi, (match, attrs, innerText) => {
    const slotMatch = attrs.match(/\bcontent-slot--([^\s"']+)/);
    if (slotMatch) {
      const slotId = slotMatch[1];
      let cleanAttrs = attrs.replace(/\s*\bcontent-slot--[^\s"']+/, '').trim();
      cleanAttrs = cleanAttrs.replace(/css-class=["']\s*["']/, '').trim();
      return `<mj-button${cleanAttrs}>{{content:${slotId}}}</mj-button>`;
    }
    return match;
  });

  return mjml;
}

// MJML-specific overrides (extends shared grapesjs-custom-theme.css)
const editorStyles = `
  /* MJML plugin specific - ensure blocks panel shows in sidebar */
  .gjs-pn-views-container {
    display: none !important;
  }
`;

function LayoutThumbnail({ thumbnail, name }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    if (containerRef.current) {
      setScale(containerRef.current.offsetWidth / 600);
    }
  }, []);

  return (
    <div ref={containerRef} className="bg-muted overflow-hidden relative" style={{ height: '180px' }}>
      {thumbnail ? (
        <iframe
          srcDoc={thumbnail}
          title={name}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '600px',
            height: `${Math.ceil(180 / scale)}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            border: 'none',
            pointerEvents: 'none',
          }}
          scrolling="no"
          sandbox="allow-same-origin"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Layout className="w-12 h-12 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export default function CustomLayoutBuilder({ token }) {
  const editorRef = useRef(null);
  const editorContainerRef = useRef(null);
  const [layouts, setLayouts] = useState([]);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [layoutName, setLayoutName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editorReady, setEditorReady] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'editor', or 'templateChooser'
  const [activeTab, setActiveTab] = useState('blocks'); // 'blocks' or 'settings'
  const [showEditorSidebar, setShowEditorSidebar] = useState(true);
  const [layoutCategory, setLayoutCategory] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState(''); // ← NAYA STATE
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [productSelections, setProductSelections] = useState({});
  const [pendingProductBlockId, setPendingProductBlockId] = useState(null);
  const [productPickerMaxProducts, setProductPickerMaxProducts] = useState(2);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [systemTemplates, setSystemTemplates] = useState([]);

  // Load user's layouts
  useEffect(() => {
    if (token) {
      loadLayouts();
    }
  }, [token]);

  // Inject custom editor styles
  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.id = 'grapesjs-custom-styles';
    styleEl.innerHTML = editorStyles;
    document.head.appendChild(styleEl);

    return () => {
      const el = document.getElementById('grapesjs-custom-styles');
      if (el) el.remove();
    };
  }, []);

  // Initialize GrapesJS when entering editor mode
  useEffect(() => {
    if (viewMode === 'editor' && editorContainerRef.current && !editorRef.current) {
      initEditor();
    }

    return () => {
      if (editorRef.current && viewMode !== 'editor') {
        editorRef.current.destroy();
        editorRef.current = null;
        setEditorReady(false);
      }
    };
  }, [viewMode]);

  // Derive max products when product picker is triggered
  useEffect(() => {
    if (pendingProductBlockId && editorRef.current) {
      const mjml = editorRef.current.getHtml();
      const indexRegex = new RegExp(`\\{\\{product:${pendingProductBlockId}:(\\d+):`, 'g');
      let maxIndex = 0;
      let m;
      while ((m = indexRegex.exec(mjml)) !== null) {
        maxIndex = Math.max(maxIndex, parseInt(m[1], 10));
      }
      setProductPickerMaxProducts(maxIndex + 1);
    }
  }, [pendingProductBlockId]);

  const loadLayouts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/api/layouts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data || {};
      const userLayouts = Array.isArray(data.userLayouts) ? data.userLayouts : [];
      const defaults = Array.isArray(data.systemDefaults) ? data.systemDefaults : [];
      setLayouts(userLayouts);
      setSystemTemplates(defaults);
    } catch (error) {
      console.error('Failed to load layouts:', error);
      setLayouts([]);
    } finally {
      setLoading(false);
    }
  };

  const initEditor = () => {
    if (editorRef.current) return;

    const editor = grapesjs.init({
      container: editorContainerRef.current,
      fromElement: false,
      height: '100%',
      width: 'auto',
      storageManager: false,
      // Remove default panels - we use custom layout
      panels: { defaults: [] },
      // Configure block manager to render in our sidebar
      blockManager: {
        appendTo: '.blocks-panel',
      },
      // Configure style manager to render in sidebar
      styleManager: {
        appendTo: '.styles-panel',
      },
      plugins: [mjmlPlugin],
      pluginsOpts: {
        [mjmlPlugin]: {
          // Use MJML defaults - adds all MJML blocks
          resetBlocks: true,
          resetDevices: true,
          resetStyleManager: true,
          useCustomTheme: true,
          columnsPadding: '10px 0',
        }
      },
    });

    // Add custom placeholder blocks
    const blockManager = editor.BlockManager;

    // SVG icon helper - smaller 20x20 icons
    const svgIcon = (inner) =>
      `<svg width="20" height="20" viewBox="0 0 32 32" fill="none" stroke="#666" stroke-width="2" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

    // ============================================
    // 1. SECTIONS — Pre-filled combo blocks (drag one, get a complete section)
    // ============================================
    blockManager.add('combo-hero', {
      label: 'Hero Banner',
      category: 'Sections',
      media: svgIcon('<rect x="3" y="4" width="26" height="16" rx="2"/><polyline points="3,16 10,10 15,13 21,7 29,14"/><circle cx="9" cy="9" r="2"/><line x1="6" y1="23" x2="26" y2="23"/><line x1="9" y1="27" x2="23" y2="27"/>'),
      content: `<mj-section css-class="hero-section" padding="0px"><mj-column padding="0px"><mj-image src="${PLACEHOLDER_IMG}" alt="Hero image" width="600px" height="auto" padding="0px" css-class="img-slot--hero-banner" /><mj-text font-size="32px" font-weight="bold" padding="20px 25px 8px" css-class="content-slot--hero-headline">Your Hero Headline Here</mj-text></mj-column></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('combo-text', {
      label: 'Text Block',
      category: 'Sections',
      media: svgIcon('<line x1="5" y1="8" x2="22" y2="8" stroke-width="3"/><line x1="5" y1="14" x2="27" y2="14"/><line x1="5" y1="19" x2="27" y2="19"/><line x1="5" y1="24" x2="19" y2="24"/>'),
      content: `<mj-section padding="20px 0px"><mj-column padding="0px 25px"><mj-text font-size="18px" font-weight="bold" padding="0px 0px 8px" css-class="content-slot--subheading">Your Subheading Here</mj-text><mj-text font-size="14px" line-height="22px" padding="0px" css-class="content-slot--body-text">Your body text will appear here. The AI will generate engaging content based on your brief.</mj-text></mj-column></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('combo-cta', {
      label: 'Call to Action',
      category: 'Sections',
      media: svgIcon('<line x1="7" y1="10" x2="25" y2="10" stroke-width="2"/><rect x="8" y="16" width="16" height="8" rx="4"/><text x="50%" y="68%" text-anchor="middle" dominant-baseline="middle" fill="#666" stroke="none" font-size="7">CTA</text>'),
      content: `<mj-section css-class="cta-section" padding="20px 0px"><mj-column><mj-text font-size="20px" font-weight="bold" align="center" padding="0px 25px 10px" css-class="content-slot--cta-headline">Ready to Get Started?</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" padding="10px 25px" css-class="content-slot--cta-text">Click Here</mj-button></mj-column></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('combo-image-text', {
      label: 'Image + Text',
      category: 'Sections',
      media: svgIcon('<rect x="3" y="6" width="12" height="20" rx="2"/><polyline points="3,22 8,16 15,22"/><line x1="18" y1="9" x2="29" y2="9" stroke-width="2"/><line x1="18" y1="14" x2="29" y2="14"/><line x1="18" y1="19" x2="26" y2="19"/><rect x="18" y="22" width="8" height="3" rx="1"/>'),
      content: `<mj-section padding="20px 0px"><mj-column width="50%" padding="0px 12px"><mj-image src="${PLACEHOLDER_IMG}" alt="Image" width="220px" height="auto" padding="0px" css-class="img-slot--product" /></mj-column><mj-column width="50%" padding="0px 12px"><mj-text font-size="17px" font-weight="bold" padding="0px 0px 5px" css-class="content-slot--feature-headline">Feature Headline</mj-text><mj-text font-size="14px" color="#6B7280" line-height="22px" padding="0px 0px 10px" css-class="content-slot--feature-text">Description of this feature goes here.</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" font-size="14px" padding="0px" css-class="content-slot--cta-text">Click Here</mj-button></mj-column></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('combo-features', {
      label: 'Feature Grid',
      category: 'Sections',
      media: svgIcon('<circle cx="9" cy="10" r="4"/><circle cx="23" cy="10" r="4"/><line x1="5" y1="18" x2="13" y2="18"/><line x1="6" y1="22" x2="12" y2="22"/><line x1="19" y1="18" x2="27" y2="18"/><line x1="20" y1="22" x2="26" y2="22"/>'),
      content: `<mj-section padding="25px 0px"><mj-group><mj-column width="50%" padding="10px 15px"><mj-image src="${PLACEHOLDER_IMG}" alt="Feature image" width="120px" height="auto" padding="0px" css-class="img-slot--icon" /><mj-text font-size="17px" font-weight="bold" padding="10px 0px 5px" css-class="content-slot--highlight-headline-1">Feature One</mj-text><mj-text font-size="14px" color="#6B7280" padding="0px" css-class="content-slot--highlight-text-1">Description of the first feature goes here.</mj-text></mj-column><mj-column width="50%" padding="10px 15px"><mj-image src="${PLACEHOLDER_IMG}" alt="Feature image" width="120px" height="auto" padding="0px" css-class="img-slot--icon" /><mj-text font-size="17px" font-weight="bold" padding="10px 0px 5px" css-class="content-slot--highlight-headline-2">Feature Two</mj-text><mj-text font-size="14px" color="#6B7280" padding="0px" css-class="content-slot--highlight-text-2">Description of the second feature goes here.</mj-text></mj-column></mj-group></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('combo-offer', {
      label: 'Offer Banner',
      category: 'Sections',
      media: svgIcon('<rect x="3" y="8" width="26" height="16" rx="3" fill="none"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#666" stroke="none" font-size="10" font-weight="bold">%OFF</text>'),
      content: `<mj-section css-class="offer-banner-section" padding="10px 25px"><mj-column padding="0px"><mj-text font-size="28px" font-weight="bold" align="center" padding="16px" background-color="#FEF3C7" color="#92400E" css-class="content-slot--offer-text">SPECIAL OFFER</mj-text></mj-column></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('combo-2col', {
      label: '2 Columns (Empty)',
      category: 'Sections',
      media: svgIcon('<rect x="3" y="8" width="12" height="16" rx="2"/><rect x="17" y="8" width="12" height="16" rx="2"/>'),
      content: `<mj-section padding="15px 0px"><mj-group><mj-column width="50%" padding="12px"></mj-column><mj-column width="50%" padding="12px"></mj-column></mj-group></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('combo-3col', {
      label: '3 Columns (Empty)',
      category: 'Sections',
      media: svgIcon('<rect x="2" y="8" width="8" height="16" rx="2"/><rect x="12" y="8" width="8" height="16" rx="2"/><rect x="22" y="8" width="8" height="16" rx="2"/>'),
      content: `<mj-section padding="15px 0px"><mj-group><mj-column width="33%" padding="12px"></mj-column><mj-column width="33%" padding="12px"></mj-column><mj-column width="33%" padding="12px"></mj-column></mj-group></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    // ============================================
    // Product section blocks (also in Sections category)
    // ============================================
    blockManager.add('product-grid-2', {
      label: '2-Product Grid',
      category: 'Sections',
      media: svgIcon('<rect x="3" y="6" width="12" height="20" rx="2"/><rect x="17" y="6" width="12" height="20" rx="2"/><circle cx="9" cy="12" r="3"/><circle cx="23" cy="12" r="3"/><line x1="5" y1="18" x2="13" y2="18"/><line x1="19" y1="18" x2="27" y2="18"/>'),
      content: `<mj-section css-class="product-section" padding="15px 0px"><mj-group><mj-column width="50%" padding="12px"><mj-image src="${PLACEHOLDER_PRODUCT_IMG}" alt="Product image" width="220px" height="auto" padding="0px" css-class="product-img-slot--product--0" /><mj-text font-size="16px" font-weight="bold" padding="10px 0 4px 0">{{product:product:0:name}}</mj-text><mj-text font-size="14px" color="#666666" padding="0">{{product:product:0:price}}</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" padding="10px 0" href="{{product:product:0:url}}">Shop Now</mj-button></mj-column><mj-column width="50%" padding="12px"><mj-image src="${PLACEHOLDER_PRODUCT_IMG}" alt="Product image" width="220px" height="auto" padding="0px" css-class="product-img-slot--product--1" /><mj-text font-size="16px" font-weight="bold" padding="10px 0 4px 0">{{product:product:1:name}}</mj-text><mj-text font-size="14px" color="#666666" padding="0">{{product:product:1:price}}</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" padding="10px 0" href="{{product:product:1:url}}">Shop Now</mj-button></mj-column></mj-group></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    // ============================================
    // 2. ELEMENTS — Individual pieces for fine-tuning inside sections
    // ============================================
    blockManager.add('placeholder-headline', {
      label: 'Headline',
      category: 'Elements',
      media: svgIcon('<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#666" stroke="none" font-size="16" font-weight="bold">H1</text>'),
      content: `<mj-text font-size="28px" font-weight="bold" align="center" padding="10px" css-class="content-slot--headline">Your Headline Here</mj-text>`,
    });
    blockManager.add('placeholder-subheading', {
      label: 'Subheading',
      category: 'Elements',
      media: svgIcon('<text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#666" stroke="none" font-size="14" font-weight="600">H2</text>'),
      content: `<mj-text font-size="18px" align="center" padding="10px" color="#666666" css-class="content-slot--subheading">Your Subheading Here</mj-text>`,
    });
    blockManager.add('placeholder-body', {
      label: 'Body Text',
      category: 'Elements',
      media: svgIcon('<line x1="6" y1="10" x2="26" y2="10"/><line x1="6" y1="16" x2="26" y2="16"/><line x1="6" y1="22" x2="18" y2="22"/>'),
      content: `<mj-text font-size="14px" padding="10px" line-height="22px" css-class="content-slot--body-text">Your body text will appear here. The AI will generate engaging content based on your brief.</mj-text>`,
    });
    blockManager.add('placeholder-cta', {
      label: 'CTA Button',
      category: 'Elements',
      media: svgIcon('<rect x="5" y="10" width="22" height="12" rx="3"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#666" stroke="none" font-size="9">CTA</text>'),
      content: `<mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" padding="10px" css-class="content-slot--cta-text">Click Here</mj-button>`,
    });
    blockManager.add('placeholder-offer', {
      label: 'Offer Text',
      category: 'Elements',
      media: svgIcon('<rect x="3" y="8" width="26" height="16" rx="3" fill="none"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#666" stroke="none" font-size="10" font-weight="bold">%OFF</text>'),
      content: `<mj-text font-size="28px" font-weight="bold" align="center" padding="16px" background-color="#FEF3C7" color="#92400E" css-class="content-slot--offer-text">SPECIAL OFFER</mj-text>`,
    });
    blockManager.add('placeholder-hero-image', {
      label: 'Hero Image (16:9)',
      category: 'Elements',
      media: svgIcon('<rect x="3" y="8" width="26" height="16" rx="2"/><polyline points="3,20 10,14 15,18 21,12 29,20"/><circle cx="9" cy="13" r="2"/>'),
      content: `<mj-image src="${PLACEHOLDER_IMG}" alt="Hero image" width="600px" height="auto" padding="0px" css-class="img-slot--hero-banner" />`,
    });
    blockManager.add('placeholder-product-image', {
      label: 'Product Image (4:3)',
      category: 'Elements',
      media: svgIcon('<rect x="5" y="6" width="22" height="20" rx="2"/><polyline points="5,22 11,16 16,20 22,14 27,18"/><circle cx="11" cy="12" r="2"/>'),
      content: `<mj-image src="${PLACEHOLDER_IMG}" alt="Product image" width="400px" height="auto" padding="0px" css-class="img-slot--product" />`,
    });
    blockManager.add('placeholder-square-image', {
      label: 'Square Image (1:1)',
      category: 'Elements',
      media: svgIcon('<rect x="6" y="6" width="20" height="20" rx="2"/><polyline points="6,22 12,14 17,18 22,12 26,16"/><circle cx="12" cy="11" r="2"/>'),
      content: `<mj-image src="${PLACEHOLDER_IMG}" alt="Image" width="300px" height="auto" padding="0px" css-class="img-slot--square" />`,
    });
    blockManager.add('placeholder-icon', {
      label: 'Icon/Small Image',
      category: 'Elements',
      media: svgIcon('<circle cx="16" cy="14" r="7"/><circle cx="13" cy="12" r="1" fill="#666" stroke="none"/><circle cx="19" cy="12" r="1" fill="#666" stroke="none"/><path d="M13 16 Q16 19 19 16" stroke-linecap="round"/>'),
      content: `<mj-image src="${PLACEHOLDER_IMG}" alt="Icon" width="60px" height="auto" padding="0px" css-class="img-slot--icon" />`,
    });

    blockManager.add('product-grid-3', {
      label: '3-Product Grid',
      category: 'Sections',
      media: svgIcon('<rect x="2" y="6" width="8" height="20" rx="2"/><rect x="12" y="6" width="8" height="20" rx="2"/><rect x="22" y="6" width="8" height="20" rx="2"/><circle cx="6" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="26" cy="12" r="2"/>'),
      content: `<mj-section css-class="product-section" padding="15px 0px"><mj-group><mj-column width="33%" padding="12px"><mj-image src="${PLACEHOLDER_PRODUCT_IMG}" alt="Product image" width="180px" height="auto" padding="0px" css-class="product-img-slot--product--0" /><mj-text font-size="14px" font-weight="bold" padding="8px 0 4px 0">{{product:product:0:name}}</mj-text><mj-text font-size="13px" color="#666666" padding="0">{{product:product:0:price}}</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" font-size="13px" padding="10px 0" href="{{product:product:0:url}}">Shop Now</mj-button></mj-column><mj-column width="33%" padding="12px"><mj-image src="${PLACEHOLDER_PRODUCT_IMG}" alt="Product image" width="180px" height="auto" padding="0px" css-class="product-img-slot--product--1" /><mj-text font-size="14px" font-weight="bold" padding="8px 0 4px 0">{{product:product:1:name}}</mj-text><mj-text font-size="13px" color="#666666" padding="0">{{product:product:1:price}}</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" font-size="13px" padding="10px 0" href="{{product:product:1:url}}">Shop Now</mj-button></mj-column><mj-column width="33%" padding="12px"><mj-image src="${PLACEHOLDER_PRODUCT_IMG}" alt="Product image" width="180px" height="auto" padding="0px" css-class="product-img-slot--product--2" /><mj-text font-size="14px" font-weight="bold" padding="8px 0 4px 0">{{product:product:2:name}}</mj-text><mj-text font-size="13px" color="#666666" padding="0">{{product:product:2:price}}</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" font-size="13px" padding="10px 0" href="{{product:product:2:url}}">Shop Now</mj-button></mj-column></mj-group></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    blockManager.add('product-spotlight', {
      label: 'Product Spotlight',
      category: 'Sections',
      media: svgIcon('<rect x="6" y="4" width="20" height="14" rx="2"/><polyline points="6,16 12,10 16,13 22,8 26,12"/><line x1="8" y1="21" x2="24" y2="21"/><line x1="10" y1="24" x2="22" y2="24"/><rect x="10" y="26" width="12" height="3" rx="1"/>'),
      content: `<mj-section css-class="product-section" padding="15px 0px"><mj-column padding="12px"><mj-image src="${PLACEHOLDER_PRODUCT_IMG}" alt="Product image" width="400px" height="auto" padding="0px" css-class="product-img-slot--product--0" /><mj-text font-size="20px" font-weight="bold" align="center" padding="12px 0 4px 0">{{product:product:0:name}}</mj-text><mj-text font-size="16px" color="#666666" align="center" padding="0">{{product:product:0:price}}</mj-text><mj-button background-color="#ff5757" color="#ffffff" border-radius="4px" padding="12px 0" align="center" href="{{product:product:0:url}}">Shop Now</mj-button></mj-column></mj-section>`,
      attributes: { class: 'gjs-block-full' }
    });

    // ============================================
    // DRAG & DROP HINTS + ERROR HANDLING
    // ============================================

    // Content blocks that need to go inside columns
    const contentBlockIds = [
      'placeholder-headline', 'placeholder-subheading', 'placeholder-body',
      'placeholder-cta', 'placeholder-offer',
      'placeholder-hero-image', 'placeholder-product-image', 'placeholder-square-image',
      'placeholder-icon'
    ];

    // Structure blocks that go into body
    const structureBlockIds = [
      'combo-hero', 'combo-text', 'combo-cta',
      'combo-image-text', 'combo-features', 'combo-offer',
      'combo-2col', 'combo-3col',
      'product-grid-2', 'product-grid-3', 'product-spotlight'
    ];

    // Track drag state
    let currentDragBlock = null;
    let componentWasAdded = false;

    // Helper: Show toast message
    const showErrorToast = (message) => {
      // Remove existing toast
      const existingToast = document.querySelector('.gjs-drag-error-toast');
      if (existingToast) existingToast.remove();

      const toast = document.createElement('div');
      toast.className = 'gjs-drag-error-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }, 3000);
    };

    // Helper: Add/remove highlight class from canvas
    const setDropZoneHighlight = (type) => {
      const canvas = editor.Canvas.getBody();
      if (!canvas) return;

      canvas.classList.remove('gjs-drop-zone-active', 'gjs-drop-zone-structure');
      if (type === 'content') {
        canvas.classList.add('gjs-drop-zone-active');
      } else if (type === 'structure') {
        canvas.classList.add('gjs-drop-zone-structure');
      }
    };

    // On block drag start - show visual hints
    editor.on('block:drag:start', (block) => {
      const blockId = block.getId();
      currentDragBlock = blockId;
      componentWasAdded = false;

      if (contentBlockIds.includes(blockId)) {
        setDropZoneHighlight('content');
      } else if (structureBlockIds.includes(blockId)) {
        setDropZoneHighlight('structure');
      }
    });

    // Track when component is successfully added
    editor.on('component:add', () => {
      componentWasAdded = true;
    });

    // On block drag stop - check if drop succeeded
    editor.on('block:drag:stop', (block) => {
      setDropZoneHighlight(null);

      // Small delay to let component:add fire first
      setTimeout(() => {
        if (currentDragBlock && !componentWasAdded) {
          // Drop failed - show appropriate error
          if (contentBlockIds.includes(currentDragBlock)) {
            showErrorToast('Drop this inside a Column. Add a Section first if the canvas is empty.');
          } else if (structureBlockIds.includes(currentDragBlock)) {
            showErrorToast('Sections can only be dropped into the email body.');
          } else {
            showErrorToast('This element cannot be dropped here. Check the highlighted areas.');
          }
        }
        currentDragBlock = null;
        componentWasAdded = false;
      }, 50);
    });

    // Duplicate slot name handler
    let isInitialLoad = true;

    // Safe helper to get all descendant components (avoids DOM querySelectorAll crash)
    const getAllDescendants = (comp) => {
      const descendants = [];
      const traverse = (c) => {
        const children = c.components ? c.components() : [];
        children.forEach(child => {
          descendants.push(child);
          traverse(child);
        });
      };
      traverse(comp);
      return descendants;
    };

    editor.on('component:add', (component) => {
      if (isInitialLoad) return;

      setTimeout(() => {
        // Safety check - make sure component is valid
        if (!component || typeof component.toHTML !== 'function') return;

        const html = component.toHTML();

        // ── Product block dedup + picker trigger ──
        const productMatch = html.match(/\{\{product:([^:}]+):/);
        if (productMatch) {
          const productComponentId = productMatch[1];
          const fullMjml = editor.getHtml();

          // Count how many sections contain this product component ID
          const sectionMatches = fullMjml.match(/<mj-section[^>]*>[\s\S]*?<\/mj-section>/gi) || [];
          let sectionsWithThisId = 0;
          for (const section of sectionMatches) {
            if (new RegExp(`\\{\\{product:${productComponentId}:`).test(section)) {
              sectionsWithThisId++;
            }
          }

          if (sectionsWithThisId > 1) {
            const newComponentId = `${productComponentId}-${sectionsWithThisId}`;
            const oldPattern = `{{product:${productComponentId}:`;
            const newPattern = `{{product:${newComponentId}:`;

            // Replace in component and all children
            const oldCssPrefix = `product-img-slot--${productComponentId}--`;
            const newCssPrefix = `product-img-slot--${newComponentId}--`;
            const replaceInComp = (comp) => {
              const content = comp.get('content') || '';
              if (content.includes(oldPattern)) {
                comp.set('content', content.replaceAll(oldPattern, newPattern));
              }
              const attrs = comp.getAttributes ? comp.getAttributes() : {};
              if (attrs.src && attrs.src.includes(oldPattern)) {
                comp.addAttributes({ src: attrs.src.replaceAll(oldPattern, newPattern) });
              }
              if (attrs.href && attrs.href.includes(oldPattern)) {
                comp.addAttributes({ href: attrs.href.replaceAll(oldPattern, newPattern) });
              }
              const cssClass = attrs['css-class'] || '';
              if (cssClass.startsWith(oldCssPrefix)) {
                comp.addAttributes({ 'css-class': cssClass.replace(oldCssPrefix, newCssPrefix) });
              }
              // Use safe descendant traversal instead of find('*')
              getAllDescendants(comp).forEach(child => {
                const cc = child.get('content') || '';
                if (cc.includes(oldPattern)) child.set('content', cc.replaceAll(oldPattern, newPattern));
                const ca = child.getAttributes ? child.getAttributes() : {};
                if (ca.src && ca.src.includes(oldPattern)) child.addAttributes({ src: ca.src.replaceAll(oldPattern, newPattern) });
                if (ca.href && ca.href.includes(oldPattern)) child.addAttributes({ href: ca.href.replaceAll(oldPattern, newPattern) });
                const childCss = ca['css-class'] || '';
                if (childCss.startsWith(oldCssPrefix)) {
                  child.addAttributes({ 'css-class': childCss.replace(oldCssPrefix, newCssPrefix) });
                }
              });
            };
            replaceInComp(component);
            setPendingProductBlockId(newComponentId);
          } else {
            setPendingProductBlockId(productComponentId);
          }
          return; // Skip content/image dedup for product blocks
        }

        // ── Content / Image dedup ──
        const contentMatch = html.match(/\{\{content:([^}]+)\}\}/);
        const imageMatch = html.match(/css-class=["'][^"']*\bimg-slot--([^\s"']+)/);

        if (!contentMatch && !imageMatch) return;

        const fullMjml = editor.getHtml();

        if (contentMatch) {
          const slotName = contentMatch[1];
          const regex = new RegExp(`\\{\\{content:${slotName}\\}\\}`, 'g');
          const matches = fullMjml.match(regex);
          const count = matches ? matches.length : 0;

          if (count > 1) {
            const newSlotName = `${slotName}-${count}`;
            const oldPlaceholder = `{{content:${slotName}}}`;
            const newPlaceholder = `{{content:${newSlotName}}}`;

            const currentContent = component.get('content') || '';
            if (currentContent.includes(oldPlaceholder)) {
              component.set('content', currentContent.replace(oldPlaceholder, newPlaceholder));
            }
            getAllDescendants(component).forEach(child => {
              const childContent = child.get('content') || '';
              if (childContent.includes(oldPlaceholder)) {
                child.set('content', childContent.replace(oldPlaceholder, newPlaceholder));
              }
            });
          }
        }

        if (imageMatch) {
          const slotName = imageMatch[1];
          const countRegex = new RegExp(`\\bimg-slot--${slotName}(?=["\\s])`, 'g');
          const matches = fullMjml.match(countRegex);
          const count = matches ? matches.length : 0;

          if (count > 1) {
            const newSlotName = `${slotName}-${count}`;
            const oldClass = `img-slot--${slotName}`;
            const newClass = `img-slot--${newSlotName}`;

            // Rename css-class on the component and descendants
            const renameImgSlot = (comp) => {
              const attrs = comp.getAttributes ? comp.getAttributes() : {};
              const cssClass = attrs['css-class'] || '';
              if (cssClass.includes(oldClass)) {
                comp.addAttributes({ 'css-class': cssClass.replace(oldClass, newClass) });
              }
            };
            renameImgSlot(component);
            getAllDescendants(component).forEach(renameImgSlot);
          }
        }
      }, 0);
    });

    // Load existing layout if editing
    if (selectedLayout) {
      try {
        editor.setComponents(prepareForEditor(selectedLayout.mjmlTemplate));
        setLayoutName(selectedLayout.name || '');
      } catch (e) {
        console.error('Failed to load layout:', e);
      }
    } else {
      // Load default MJML template
      editor.setComponents(`
        <mjml>
          <mj-head>
            <mj-attributes>
              <mj-all font-family="Arial, sans-serif" />
              <mj-text padding="10px" font-size="14px" color="#333333" line-height="22px" />
            </mj-attributes>
          </mj-head>
          <mj-body width="600px">
            <mj-section css-class="header-section" padding="15px 0px">
              <mj-column padding="12px">
                <mj-text align="center" font-size="24px" font-weight="bold" css-class="content-slot--headline">Your Headline Here</mj-text>
              </mj-column>
            </mj-section>
            <mj-section css-class="hero-section" padding="15px 0px">
              <mj-column padding="0px">
                <mj-image src="${PLACEHOLDER_IMG}" alt="Hero image" width="600px" height="auto" padding="0px" css-class="img-slot--hero-banner" />
              </mj-column>
            </mj-section>
            <mj-section css-class="content-section" padding="15px 0px">
              <mj-column padding="12px">
                <mj-text css-class="content-slot--body-text">Your body text will appear here. The AI will generate engaging content based on your brief.</mj-text>
                <mj-button background-color="#ff5757" color="#ffffff" css-class="content-slot--cta-text">Click Here</mj-button>
              </mj-column>
            </mj-section>
            <mj-section css-class="footer-section" padding="15px 0px">
              <mj-column padding="12px">
                <mj-text align="center" font-size="12px" color="#999999" css-class="content-slot--footer">Footer content from your settings</mj-text>
              </mj-column>
            </mj-section>
          </mj-body>
        </mjml>
      `);
    }

    // Allow GrapesJS to finish processing initial components before enabling dedup
    setTimeout(() => { isInitialLoad = false; }, 500);

    // Recalculate canvas offset so hover/select highlights align correctly
    // (toolbar above canvas shifts Y coordinates — refresh() fixes it)
    setTimeout(() => { editor.refresh(); }, 600);

    // Inject CSS into canvas iframe to hide mj-head phantom elements + style content slots
    setTimeout(() => {
      try {
        const frameEl = editor.Canvas.getFrameEl();
        if (frameEl && frameEl.contentDocument) {
          const style = frameEl.contentDocument.createElement('style');
          style.textContent = `
            [data-gjs-type="mj-head"],
            [data-gjs-type="mj-attributes"],
            [data-gjs-type="mj-all"],
            [data-gjs-type="mj-class"],
            [data-gjs-type="mj-font"],
            [data-gjs-type="mj-style"] {
              display: none !important;
            }
            /* Visual indicator for AI-generated content slots */
            [class*="content-slot--"] {
              opacity: 0.75;
              border: 1px dashed #CBD5E1 !important;
              cursor: default;
            }
            /* Locked header/footer sections */
            .locked-section {
              position: relative;
              opacity: 0.6;
              pointer-events: none;
            }
            .locked-section::after {
              content: '';
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(148,163,184,0.08) 10px,
                rgba(148,163,184,0.08) 20px
              );
              pointer-events: none;
            }
          `;
          frameEl.contentDocument.head.appendChild(style);
        }
      } catch (e) {
        console.warn('Could not inject canvas CSS:', e);
      }
    }, 300);

    // Make content slot components non-editable + lock header/footer sections
    setTimeout(() => {
      try {
        const wrapper = editor.DomComponents.getWrapper();
        if (wrapper) {
          const allComps = wrapper.find('*');
          allComps.forEach(comp => {
            const cssClass = comp.getAttributes()?.['css-class'] || comp.getAttributes()?.class || '';

            // Lock content slots (non-editable)
            if (cssClass.includes('content-slot--')) {
              comp.set({
                editable: false,
                copyable: false,
              });
            }

            // Lock header/footer sections (non-editable, non-draggable, non-removable)
            if (cssClass.includes('header-section') || cssClass.includes('footer-section')) {
              comp.set({
                draggable: false,
                removable: false,
                copyable: false,
                selectable: false,
                hoverable: true,
              });
              // Add locked-section class for visual styling
              const existingClass = comp.getAttributes()['css-class'] || '';
              if (!existingClass.includes('locked-section')) {
                comp.addAttributes({ 'css-class': existingClass + ' locked-section' });
              }
              // Lock all children too
              const lockChildren = (parent) => {
                parent.components().forEach(child => {
                  child.set({
                    draggable: false,
                    removable: false,
                    copyable: false,
                    selectable: false,
                    editable: false,
                  });
                  lockChildren(child);
                });
              };
              lockChildren(comp);
            }
          });
        }
      } catch (e) {
        console.warn('Could not lock components:', e);
      }
    }, 400);

    // Auto-lock newly dropped header/footer combo blocks
    editor.on('component:add', (comp) => {
      if (isInitialLoad) return;
      setTimeout(() => {
        const cssClass = comp?.getAttributes?.()?.['css-class'] || '';
        if (cssClass.includes('header-section') || cssClass.includes('footer-section')) {
          comp.set({ draggable: false, removable: false, copyable: false, selectable: false, hoverable: true });
          const existingClass = comp.getAttributes()['css-class'] || '';
          if (!existingClass.includes('locked-section')) {
            comp.addAttributes({ 'css-class': existingClass + ' locked-section' });
          }
          const lockChildren = (parent) => {
            parent.components().forEach(child => {
              child.set({ draggable: false, removable: false, copyable: false, selectable: false, editable: false });
              lockChildren(child);
            });
          };
          lockChildren(comp);
        }
      }, 100);
    });

    // Show tooltip on hover over locked header/footer sections
    editor.on('component:hover', (comp) => {
      const cssClass = comp?.getAttributes()?.['css-class'] || '';
      if (cssClass.includes('header-section') || cssClass.includes('footer-section')) {
        const isHeader = cssClass.includes('header-section');
        const msg = isHeader
          ? 'Header is locked — styled from your Brand Settings'
          : 'Footer is locked — styled from your Email Settings';
        // Show as toolbar tooltip
        const el = comp.getEl();
        if (el) {
          el.title = msg;
        }
      }
    });

    editorRef.current = editor;
    setEditorReady(true);
  };

  const exportMjml = () => {
    if (!editorRef.current) return null;

    try {
      // Get MJML from editor, restore {{image:*}} patterns from css-class tracking
      let mjml = editorRef.current.getHtml();
      // Fix grapesjs-mjml serialization bug: missing space between tag name and first attribute
      // e.g. <mj-textfont-size="17px"> → <mj-text font-size="17px">
      // Longer/multi-word tag names must come first to avoid partial matches
      const mjmlTagNames = [
        'mj-social-element', 'mj-accordion-element', 'mj-html-attributes',
        'mj-text', 'mj-button', 'mj-image', 'mj-section', 'mj-column',
        'mj-divider', 'mj-spacer', 'mj-social', 'mj-navbar', 'mj-hero',
        'mj-all', 'mj-attributes', 'mj-font', 'mj-preview', 'mj-title',
        'mj-raw', 'mj-head', 'mj-body', 'mj-breakpoint', 'mj-accordion',
        'mj-table', 'mj-group', 'mj-wrapper', 'mj-carrier',
      ];
      const tagPattern = mjmlTagNames.join('|');
      mjml = mjml.replace(new RegExp(`(<(?:${tagPattern}))([a-z])`, 'g'), '$1 $2');
      mjml = restoreImageSlots(mjml);
      mjml = restoreContentSlots(mjml);

      // Safety net: if any SVG data URIs leaked through restoreImageSlots
      // (e.g. user added a raw mj-image without slot tracking), rebuild tag without SVG
      mjml = mjml.replace(/<mj-image\b[^>]*?\/?>/gi, (tag) => {
        if (tag.includes('data:image/svg+xml')) {
          const attrs = extractLastAttrs(tag, VALID_MJ_IMAGE_ATTRS);
          return buildMjImage('', attrs);
        }
        return tag;
      });

      // Strip any wrapper tags (html/body/div) the editor adds around MJML
      const mjmlStart = mjml.indexOf('<mjml');
      const mjmlEnd = mjml.lastIndexOf('</mjml>');
      if (mjmlStart !== -1 && mjmlEnd !== -1) {
        mjml = mjml.substring(mjmlStart, mjmlEnd + '</mjml>'.length);
      }

      return mjml;
    } catch (e) {
      console.error('Failed to export MJML:', e);
      return null;
    }
  };

  const handleSave = async () => {
    if (!layoutName.trim()) {
      alert('Please enter a layout name');
      return;
    }

    const mjml = exportMjml();
    if (!mjml) {
      alert('Failed to export layout');
      return;
    }


    try {
      setSaving(true);

      // Generate thumbnail by compiling MJML to HTML via preview endpoint
      let thumbnail = null;
      try {
        const previewRes = await axios.post(
          `${API}/api/layouts/preview-html`,
          { mjml },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        thumbnail = previewRes.data.html || null;
      } catch (e) {
        // thumbnail is non-critical, proceed without it
        console.warn('Thumbnail generation failed:', e);
      }

      // Backend auto-extracts slots from MJML — only send name + template
      const payload = {
        name: layoutName,
        mjmlTemplate: mjml,
        ...(thumbnail && { thumbnail }),
        ...(layoutCategory && { category: layoutCategory }),
        ...(Object.keys(productSelections).length > 0 && { productSelections }),
      };

      if (selectedLayout?._id && !selectedLayout._isSystemTemplate) {
        // Update existing user layout
        await axios.put(`${API}/api/layouts/${selectedLayout._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Create new
        await axios.post(`${API}/api/layouts`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      await loadLayouts();
      setViewMode('list');
      setSelectedLayout(null);
      setLayoutName('');
      setLayoutCategory('');
      setCustomCategoryName('');
      setShowCustomInput(false);

      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    } catch (error) {
      console.error('Failed to save layout:', error);
      alert('Failed to save layout');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (layoutId) => {
    if (!window.confirm('Are you sure you want to delete this layout?')) return;

    try {
      await axios.delete(`${API}/api/layouts/${layoutId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await loadLayouts();
    } catch (error) {
      console.error('Failed to delete layout:', error);
      alert('Failed to delete layout');
    }
  };

  const handleEdit = (layout) => {
    setSelectedLayout(layout);
    setLayoutName(layout.name || '');
    
    // Check if category is not in predefined list
    const predefinedCategories = ['promo', 'newsletter', 'welcome', 'activation', 'reengagement'];
    if (layout.category && !predefinedCategories.includes(layout.category)) {
      // Custom category - show input field
      setShowCustomInput(true);
      setCustomCategoryName(layout.category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())); // Display-friendly format
      setLayoutCategory(layout.category);
    } else {
      // Predefined category
      setShowCustomInput(false);
      setCustomCategoryName('');
      setLayoutCategory(layout.category || '');
    }

    // Reconstruct productSelections from layout components
    const selections = {};
    (layout.components || []).forEach(comp => {
      if (comp.type === 'product_block' && comp.product_block_config?.product_ids?.length > 0) {
        selections[comp.component_id] = comp.product_block_config.product_ids;
      }
    });
    setProductSelections(selections);

    setViewMode('editor');
  };

  const handleCreate = () => {
    setSelectedLayout(null);
    setLayoutName('');
    setLayoutCategory('');
    setCustomCategoryName('');
    setShowCustomInput(false);
    setProductSelections({});
    setViewMode('templateChooser');
  };

  const handleStartFromScratch = () => {
    setViewMode('editor');
  };

  const handleStartFromTemplate = (template) => {
    setLayoutName(`My ${template.name}`);
    setLayoutCategory(template.category || '');
    setSelectedLayout({ ...template, _isSystemTemplate: true });
    setViewMode('editor');
  };

  const handleCancel = () => {
    if (editorRef.current) {
      editorRef.current.destroy();
      editorRef.current = null;
    }
    setSelectedLayout(null);
    setLayoutName('');
    setLayoutCategory('');
    setCustomCategoryName('');
    setShowCustomInput(false);
    setProductSelections({});
    setViewMode('list');
    setEditorReady(false);
  };

  const handlePreview = async () => {
    const mjml = exportMjml();
    if (!mjml) return;

    try {
      setPreviewLoading(true);
      setShowPreview(true);
      const res = await axios.post(`${API}/api/layouts/preview-html`, { mjml }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewHtml(res.data.html);
    } catch (err) {
      console.error('Preview failed:', err);
      setPreviewHtml('<div style="padding:40px;text-align:center;color:#999;">Preview failed. Check MJML syntax.</div>');
    } finally {
      setPreviewLoading(false);
    }
  };

  // List view
  if (viewMode === 'list') {
    return (
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Custom Layout Builder</h1>
            <p className="text-muted-foreground mt-1">
              Create custom email layouts that skip AI design generation
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" />
            Create Layout
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : layouts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layout className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No layouts yet</h3>
              <p className="text-muted-foreground mt-2">
                Create your first custom layout to use in campaigns
              </p>
              <Button onClick={handleCreate} className="mt-4">
                Create Layout
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {layouts.map((layout) => (
              <Card key={layout._id} className="overflow-hidden">
                <LayoutThumbnail thumbnail={layout.thumbnail} name={layout.name} />
                <CardContent className="p-4">
                  <h3 className="font-medium truncate">{layout.name || 'Untitled Layout'}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {layout.contentSlots?.length || 0} content slots, {layout.imageSlots?.length || 0} image slots
                  </p>
                  {/* Only show Edit/Delete for user's own layouts, not system defaults */}
                  {!layout.is_default ? (
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(layout)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(layout._id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-3">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        System Template
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Template chooser view
  if (viewMode === 'templateChooser') {
    return (
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setViewMode('list')}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create New Layout</h1>
            <p className="text-muted-foreground mt-1">
              Start from scratch or pick a template as your starting point
            </p>
          </div>
        </div>

        {/* Start from Scratch */}
        <Card
          className="cursor-pointer hover:border-primary transition-colors border-2 border-dashed"
          onClick={handleStartFromScratch}
        >
          <CardContent className="flex items-center gap-4 p-6">
            <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <Plus className="w-7 h-7 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Start from Scratch</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Open a blank editor with a basic Header, Hero, Content, and Footer structure
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Templates */}
        {systemTemplates.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Or start from a template</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {systemTemplates.map((template) => (
                <Card
                  key={template._id}
                  className="cursor-pointer hover:border-primary transition-colors overflow-hidden"
                  onClick={() => handleStartFromTemplate(template)}
                >
                  <div className="bg-muted rounded overflow-hidden relative" style={{ height: '280px' }}>
                    {template.thumbnail ? (
                      <iframe
                        srcDoc={template.thumbnail}
                        title={template.name}
                        className="border-0 pointer-events-none"
                        style={{
                          width: '600px',
                          height: '800px',
                          transform: 'scale(0.47)',
                          transformOrigin: 'top left',
                        }}
                        sandbox=""
                        scrolling="no"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Mail className="w-10 h-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {template.contentSlots?.length || 0} content slots, {template.imageSlots?.length || 0} image slots
                    </p>
                    {template.category && (
                      <span className="inline-block mt-2 text-xs bg-muted px-2 py-1 rounded capitalize">
                        {template.category}
                      </span>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Editor view
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 p-3 border-b bg-background" style={{ flexShrink: 0 }}>
        {/* Row 1: Cancel + name + category */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <input
            type="text"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            placeholder="Layout name..."
            className="px-3 py-2 border rounded-md flex-1 min-w-[140px] text-sm"
          />
          <select
            value={layoutCategory === 'custom' || (layoutCategory && !['promo', 'newsletter', 'welcome', 'activation', 'reengagement'].includes(layoutCategory)) ? 'custom' : layoutCategory}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'custom') {
                setShowCustomInput(true);
                setLayoutCategory(''); // Clear until user enters name
              } else {
                setShowCustomInput(false);
                setLayoutCategory(value);
                setCustomCategoryName(''); // Clear custom input
              }
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="">No Category</option>
            <option value="promo">Promotional</option>
            <option value="newsletter">Newsletter</option>
            <option value="welcome">Welcome</option>
            <option value="activation">Activation</option>
            <option value="reengagement">Re-engagement</option>
            <option value="custom">Custom...</option>
          </select>
          {showCustomInput && (
            <input
              type="text"
              value={customCategoryName}
              onChange={(e) => {
                const displayValue = e.target.value;
                setCustomCategoryName(displayValue);
                // Normalize: lowercase, replace spaces with hyphens
                const normalizedValue = displayValue.trim().toLowerCase().replace(/\s+/g, '-');
                setLayoutCategory(normalizedValue || '');
              }}
              placeholder="Category name..."
              className="px-3 py-2 border rounded-md flex-1 min-w-[140px] text-sm"
              autoFocus
            />
          )}
        </div>
        {/* Row 2: Action buttons */}
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={!editorReady || previewLoading} className="gap-2">
            {previewLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !editorReady} className="gap-2">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Layout
          </Button>
        </div>
      </div>

      {/* Editor container with sidebar */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Mobile sidebar toggle */}
        <button
          className="md:hidden absolute top-2 left-2 z-10 p-1.5 bg-background border border-border rounded shadow-sm text-xs"
          onClick={() => setShowEditorSidebar(prev => !prev)}
        >
          {showEditorSidebar ? 'Hide Blocks' : 'Blocks'}
        </button>

        {/* Left Sidebar - Blocks Panel */}
        <div
          className="editor-sidebar"
          style={{
            width: showEditorSidebar ? '240px' : '0px',
            transition: 'width 0.2s ease',
            backgroundColor: '#ffffff',
            borderRight: showEditorSidebar ? '1px solid #e0e0e0' : 'none',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Tabs */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#fafafa'
          }}>
            <button
              onClick={() => setActiveTab('blocks')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                backgroundColor: activeTab === 'blocks' ? '#ffffff' : 'transparent',
                color: activeTab === 'blocks' ? '#000' : '#888',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                borderBottom: activeTab === 'blocks' ? '2px solid #333' : '2px solid transparent'
              }}
            >
              Blocks
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                backgroundColor: activeTab === 'settings' ? '#ffffff' : 'transparent',
                color: activeTab === 'settings' ? '#000' : '#888',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
                borderBottom: activeTab === 'settings' ? '2px solid #333' : '2px solid transparent'
              }}
            >
              Settings
            </button>
          </div>

          {/* Panel Content */}
          <div
            className="blocks-panel"
            style={{
              flex: 1,
              overflowY: 'auto',
              display: activeTab === 'blocks' ? 'block' : 'none',
              backgroundColor: '#ffffff'
            }}
          />
          <div
            className="styles-panel"
            style={{
              flex: 1,
              overflowY: 'auto',
              display: activeTab === 'settings' ? 'block' : 'none',
              backgroundColor: '#ffffff'
            }}
          />
        </div>

        {/* Main Editor Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div
            ref={editorContainerRef}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        </div>
      </div>

      {/* Instructions */}
      <div className="p-4 bg-muted/50 border-t" style={{ flexShrink: 0 }}>
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> Drag placeholder blocks from the sidebar. Content placeholders like{' '}
          <code className="bg-muted px-1 rounded">{'{{content:headline}}'}</code> will be filled by AI.
          Image placeholders like <code className="bg-muted px-1 rounded">{'{{image:hero-banner}}'}</code>{' '}
          will have images generated automatically.
        </p>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => setShowPreview(false)}
        >
          <div
            style={{
              backgroundColor: '#fff', borderRadius: 8,
              width: 'min(680px, calc(100vw - 32px))', maxHeight: '90vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid #e5e7eb'
            }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Email Preview</span>
              <button
                onClick={() => setShowPreview(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', justifyContent: 'center' }}>
              {previewLoading ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">Rendering preview...</p>
                </div>
              ) : (
                <iframe
                  srcDoc={previewHtml}
                  title="Email Preview"
                  style={{
                    width: '600px', border: '1px solid #e5e7eb',
                    borderRadius: 4, minHeight: '500px', height: '70vh'
                  }}
                  sandbox="allow-same-origin allow-scripts"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Product Picker Modal */}
      <ProductPickerModal
        isOpen={!!pendingProductBlockId}
        onClose={() => setPendingProductBlockId(null)}
        onConfirm={(ids) => {
          setProductSelections(prev => ({
            ...prev,
            [pendingProductBlockId]: ids
          }));
          setPendingProductBlockId(null);
        }}
        maxProducts={productPickerMaxProducts}
        preSelected={productSelections[pendingProductBlockId] || []}
        token={token}
      />
    </div>
  );
}
