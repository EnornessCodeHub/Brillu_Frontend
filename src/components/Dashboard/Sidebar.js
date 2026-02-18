import React from 'react';
import { Mail, Sparkles, LayoutTemplate, Palette, Type, PenTool, Share2, Image as ImageIcon, Layout, Database, Plug, Settings, ChevronDown, ChevronRight, LogOut, PencilRuler, BookOpen, Camera } from 'lucide-react';
import { Button } from '../ui/button';

export default function Sidebar({ activeSection, onSectionChange, onLogout }) {
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
          groupLabel: 'Media',
          collapsible: true,
          items: [
            { id: 'media-library', label: 'Media Library' }
          ]
        }
      ]
    },
    {
      id: 'data-sources',
      icon: Database,
      label: 'Data Sources',
      submenu: [
        { id: 'products', label: 'Product Catalog' }
        // { id: 'crm', label: 'CRM Integration' } // Coming soon
      ]
    },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  const [expandedMenus, setExpandedMenus] = React.useState([]);
  const [expandedGroups, setExpandedGroups] = React.useState([]);
  
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
    <div className="flex flex-col h-screen w-64 bg-card border-r border-border">
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
                            {group.collapsible ? (
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
                              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {group.groupLabel}
                              </div>
                            )}
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
                                    onClick={() => onSectionChange(subitem.id)}
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
                          onClick={() => onSectionChange(subitem.id)}
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
                  onClick={() => onSectionChange(item.id)}
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
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
