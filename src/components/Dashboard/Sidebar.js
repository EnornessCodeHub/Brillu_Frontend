import React, { useState } from 'react';
import { Mail, Sparkles, LayoutTemplate, Palette, Type, PenTool, Share2, Image as ImageIcon, Layout, Database, Plug, Settings, ChevronDown, ChevronRight, LogOut, PencilRuler, BookOpen, Camera, Star, MessageSquare, X } from 'lucide-react';
import { Button } from '../ui/button';
import axios from 'axios';
import API from '../../config/api.config';

export default function Sidebar({ activeSection, onSectionChange, onLogout, isOpen, onClose }) {
  const menuItems = [
    { id: 'home', icon: Sparkles, label: 'Generate Email' },
    { id: 'campaigns', icon: Mail, label: 'My Campaigns' },
    {
      id: 'knowledge-base',
      icon: BookOpen,
      label: 'Knowledge Base',
      groups: [
        {
          groupLabel: 'Template Management',
          collapsible: true,
          items: [
            // { id: 'templates', label: 'Templates' },
            { id: 'custom-layout', label: 'Layout Builder' },
            { id: 'header-settings', label: 'Header' },
            { id: 'footer', label: 'Footer' }
          ]
        },
        {
          groupLabel: 'Brand Management',
          collapsible: true,
          items: [
            { id: 'brand-identity', label: 'Brand Identity' },
            { id: 'typography', label: 'Visual Design' },
            { id: 'writing-style', label: 'Writing Style' },
            { id: 'social-media', label: 'Social Media' },
            { id: 'image-preferences', label: 'Image Settings' }
          ]
        },
        {
          groupLabel: 'Media Library',
          collapsible: false,
          navId: 'media-library',
          items: []
        },
        {
          groupLabel: 'Product Catalog',
          collapsible: false,
          navId: 'products',
          items: []
        }
      ]
    },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const [expandedMenus, setExpandedMenus] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/feedback`, { rating, message: feedbackText }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      // feedback is non-critical, proceed to success anyway
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const closeFeedback = () => {
    setShowFeedback(false);
    setRating(0);
    setHoveredRating(0);
    setFeedbackText('');
    setSubmitted(false);
  };
  
  const toggleGroup = (groupLabel) => {
    setExpandedGroups(prev =>
      prev.includes(groupLabel) ? prev.filter(g => g !== groupLabel) : [...prev, groupLabel]
    );
  };

  const toggleSubmenu = (id) => {
    setExpandedMenus(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Check if any item in groups is active
  const isGroupItemActive = (groups) => {
    if (!groups) return false;
    return groups.some(group => group.items.some(item => activeSection === item.id));
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col h-screen w-64
          bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto md:flex-shrink-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      {/* Logo/Header */}
      <div className="flex items-center gap-2 p-6 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-spark to-spark-hover flex items-center justify-center">
          <Mail className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-lg">Brillu</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {menuItems.map(item => {
          const Icon = item.icon;
          const hasSubmenu = item.submenu && item.submenu.length > 0;
          const hasGroups = item.groups && item.groups.length > 0;
          const isExpanded = expandedMenus.includes(item.id);
          const isActive = activeSection === item.id;

          return (
            <div key={item.id}>
              {/* Items with groups (Knowledge Base) */}
              {hasGroups ? (
                <>
                  <button
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isExpanded || isGroupItemActive(item.groups)
                        ? 'bg-accent/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                      }`}
                    onClick={() => toggleSubmenu(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-4 mt-1 space-y-2">
                      {item.groups.map((group, groupIndex) => {
                        const isGroupExpanded = expandedGroups.includes(group.groupLabel);
                        const hasActiveItem = group.items.some(item => activeSection === item.id);
                        
                        return (
                          <div key={groupIndex}>
                            {/* Group label (collapsible if enabled) */}
                            {group.groupLabel && (group.collapsible ? (
                              <button
                                className={`w-full flex items-center justify-between px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                                  isGroupExpanded || hasActiveItem
                                    ? 'text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                                onClick={() => toggleGroup(group.groupLabel)}
                              >
                                <span>{group.groupLabel}</span>
                                {isGroupExpanded ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : (
                                  <ChevronRight className="w-3 h-3" />
                                )}
                              </button>
                            ) : (
                              group.navId ? (
                                <button
                                  className={`w-full flex items-center px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                                    activeSection === group.navId
                                      ? 'text-foreground'
                                      : 'text-muted-foreground hover:text-foreground'
                                  }`}
                                  onClick={() => { onSectionChange(group.navId); if (onClose) onClose(); }}
                                >
                                  {group.groupLabel}
                                </button>
                              ) : (
                                <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                  {group.groupLabel}
                                </div>
                              )
                            ))}
                            {/* Group items (show if not collapsible or expanded) */}
                            {(!group.collapsible || isGroupExpanded) && (
                              <div className="ml-2 space-y-1">
                                {group.items.map(subitem => (
                                  <button
                                    key={subitem.id}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${activeSection === subitem.id
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                                      }`}
                                    onClick={() => { onSectionChange(subitem.id); if (onClose) onClose(); }}
                                  >
                                    {subitem.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : hasSubmenu ? (
                /* Items with flat submenu (Email Settings, Integrations) */
                <>
                  <button
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isExpanded
                        ? 'bg-accent/10'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                      }`}
                    onClick={() => toggleSubmenu(item.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {isExpanded && (
                    <div className="ml-7 mt-1 space-y-1">
                      {item.submenu.map(subitem => (
                        <button
                          key={subitem.id}
                          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${activeSection === subitem.id
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                            }`}
                          onClick={() => { onSectionChange(subitem.id); if (onClose) onClose(); }}
                        >
                          {subitem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* Simple items (no submenu) */
                <button
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                    }`}
                  onClick={() => { onSectionChange(item.id); if (onClose) onClose(); }}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => setShowFeedback(true)}
        >
          <MessageSquare className="w-4 h-4" />
          Submit Feedback
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>

    </div>

      {/* Feedback Modal — outside the sidebar div to avoid transform containment */}
      {showFeedback && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={closeFeedback}
        >
          <div
            className="bg-background rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6"
            onClick={e => e.stopPropagation()}
          >
            {submitted ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-green-600" fill="currentColor" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Thanks for your feedback!</h3>
                <p className="text-sm text-muted-foreground mb-4">We appreciate you taking the time.</p>
                <Button onClick={closeFeedback} className="w-full">Close</Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Submit Feedback</h3>
                  <button onClick={closeFeedback} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Star Rating */}
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">How would you rate Brillu? <span className="text-destructive">*</span></p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className="w-8 h-8"
                          style={{ color: star <= (hoveredRating || rating) ? '#FFD966' : '#e2e8f0' }}
                          fill={star <= (hoveredRating || rating) ? '#FFD966' : '#e2e8f0'}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Feedback Text */}
                <div className="mb-5">
                  <p className="text-sm font-medium mb-2">Any comments? <span className="text-muted-foreground text-xs">(optional)</span></p>
                  <textarea
                    rows={3}
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="Tell us what you think..."
                    className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <Button
                  onClick={handleFeedbackSubmit}
                  disabled={!rating || submitting}
                  className="w-full"
                >
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
