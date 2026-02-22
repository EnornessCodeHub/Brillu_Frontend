# Mobile Responsiveness Implementation Plan — Brillu Frontend

## Executive Summary

The Brillu frontend is desktop-first throughout. Current mobile score: **3/10 — NOT mobile-friendly**.

**Critical failures:**
1. **Sidebar** — Fixed `w-64`, always visible, no toggle. Takes 50%+ of mobile screen.
2. **DashboardLayout** — `flex h-screen` with no mobile switching. Dashboard completely unusable on mobile.
3. **EnhancedOnboarding** — Heavy inline CSS, color grids never adapt to mobile.
4. **PromptPlayground** — Stage indicator `grid-cols-4` overflows, media picker `grid-cols-3` too tight.
5. **CustomLayoutBuilder** — Toolbar single flex row overflows below ~900px.
6. **BrandSettings** — Inline `display: grid; grid-template-columns: repeat(2, 1fr)` overflows.
7. **Hero** — Decorative `w-96 h-96` blurs cause horizontal scroll.
8. **LandingPage** — Nav `hidden md:flex` but NO hamburger alternative for mobile.

**Implementation order:** Phase 1 → 2 → 3 → 4 (each phase independently deployable).

---

## Phase 1 — CRITICAL: Dashboard Unusable on Mobile

### 1.1 Sidebar.js — Hamburger Toggle + Mobile Overlay

**File:** `src/components/Dashboard/Sidebar.js`

**Step 1 — Accept `isOpen` and `onClose` props:**

BEFORE:
```jsx
export default function Sidebar({ activeSection, onSectionChange, onLogout }) {
```

AFTER:
```jsx
export default function Sidebar({ activeSection, onSectionChange, onLogout, isOpen, onClose }) {
```

**Step 2 — Add backdrop overlay + convert sidebar to fixed position with slide transition:**

BEFORE:
```jsx
return (
  <div className="flex flex-col h-screen w-64 bg-card border-r border-border">
```

AFTER:
```jsx
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
```

Close the fragment at the end:
```jsx
    </div>
  </>
);
```

**Step 3 — Auto-close sidebar on nav item click (mobile):**

For ALL `onSectionChange` calls inside the sidebar, add `if (onClose) onClose()`:

```jsx
// Simple items:
onClick={() => { onSectionChange(item.id); if (onClose) onClose(); }}

// Sub-items:
onClick={() => { onSectionChange(subitem.id); if (onClose) onClose(); }}
```

---

### 1.2 DashboardLayout.js — Wire Hamburger State

**File:** `src/components/Dashboard/DashboardLayout.js`

**Step 1 — Add state:**
```jsx
const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
```

**Step 2 — Pass props to Sidebar:**

BEFORE:
```jsx
<Sidebar
  activeSection={activeSection}
  onSectionChange={setActiveSection}
  onLogout={onLogout}
/>
```

AFTER:
```jsx
<Sidebar
  activeSection={activeSection}
  onSectionChange={setActiveSection}
  onLogout={onLogout}
  isOpen={mobileSidebarOpen}
  onClose={() => setMobileSidebarOpen(false)}
/>
```

**Step 3 — Add `overflow-hidden` + `min-w-0` to outer containers:**

```jsx
// Outer wrapper:
<div className="flex h-screen bg-background overflow-hidden">

// Content column:
<div className="flex-1 flex flex-col overflow-hidden min-w-0">
```

**Step 4 — Add hamburger button in header + reduce padding:**

BEFORE:
```jsx
<div className="border-b border-border bg-card/50 backdrop-blur-sm">
  <div className="px-8 py-6">
    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
    <p className="text-muted-foreground mt-1">Manage your email campaigns and preferences</p>
  </div>
</div>
```

AFTER:
```jsx
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
```

**Step 5 — Reduce main content padding:**

BEFORE:
```jsx
<div className="flex-1 overflow-y-auto p-8">
```

AFTER:
```jsx
<div className="flex-1 overflow-y-auto p-4 md:p-8">
```

---

## Phase 2 — High Priority

### 2.1 PromptPlayground.js

**File:** `src/components/PromptPlayground.js`

**Fix A — Template selector grid (single column on mobile):**
```jsx
// BEFORE:
<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
// AFTER:
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

**Fix B — Stage indicators (2 cols on mobile):**
```jsx
// BEFORE:
<div className="grid grid-cols-4 gap-2 text-xs">
// AFTER:
<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
```

**Fix C — Email preview iframe (shorter on mobile):**
```jsx
// BEFORE:
<iframe className="w-full h-[600px]" ... />
// AFTER:
<iframe className="w-full h-[400px] sm:h-[600px]" style={{ minWidth: '320px' }} ... />
```

**Fix D — Image slot row (stack on mobile):**
```jsx
// BEFORE:
<div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
  <span className="text-sm font-medium min-w-[120px] capitalize">...</span>
  <div className="flex gap-2 flex-1">
// AFTER:
<div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 border rounded-lg bg-muted/30">
  <span className="text-sm font-medium sm:min-w-[120px] capitalize">...</span>
  <div className="flex gap-2 flex-wrap">
```

**Fix E — Media picker grid:**
```jsx
// BEFORE:
<div className="grid grid-cols-3 gap-3">
// AFTER:
<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
```

**Fix F — Template modal max-height on mobile:**
```jsx
// BEFORE:
<div className="bg-background rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
// AFTER:
<div className="bg-background rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] sm:max-h-[80vh] flex flex-col mx-2 sm:mx-4">
```

---

### 2.2 CustomLayoutBuilder.js

**File:** `src/components/Dashboard/CustomLayoutBuilder.js`

**Fix A — Editor toolbar (wrap into two rows):**

BEFORE: Single `flex items-center justify-between` row with all inputs + buttons.

AFTER:
```jsx
<div className="flex flex-col gap-2 p-3 border-b bg-background" style={{ flexShrink: 0 }}>
  {/* Row 1: Cancel + name + category */}
  <div className="flex flex-wrap items-center gap-2">
    <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
    <input
      type="text"
      value={layoutName}
      onChange={(e) => setLayoutName(e.target.value)}
      placeholder="Layout name..."
      className="px-3 py-2 border rounded-md flex-1 min-w-[140px] text-sm"
    />
    <select className="px-3 py-2 border rounded-md text-sm" value={...} onChange={...}>
      ...
    </select>
    {showCustomInput && (
      <input
        type="text"
        value={customCategoryName}
        onChange={...}
        placeholder="Category name..."
        className="px-3 py-2 border rounded-md flex-1 min-w-[140px] text-sm"
        autoFocus
      />
    )}
  </div>
  {/* Row 2: Action buttons */}
  <div className="flex items-center gap-2 justify-end">
    <Button variant="outline" size="sm" onClick={handlePreview} disabled={!editorReady || previewLoading} className="gap-2">
      {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
      Preview
    </Button>
    <Button size="sm" onClick={handleSave} disabled={saving || !editorReady} className="gap-2">
      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
      Save Layout
    </Button>
  </div>
</div>
```

**Fix B — Editor blocks sidebar toggle on mobile:**

Add state: `const [showEditorSidebar, setShowEditorSidebar] = useState(true);`

```jsx
<div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
  {/* Mobile toggle */}
  <button
    className="md:hidden absolute top-2 left-2 z-10 p-1.5 bg-background border border-border rounded shadow-sm text-xs"
    onClick={() => setShowEditorSidebar(prev => !prev)}
  >
    {showEditorSidebar ? 'Hide Blocks' : 'Blocks'}
  </button>

  <div
    className="editor-sidebar"
    style={{
      width: showEditorSidebar ? '240px' : '0px',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      ...
    }}
  >
```

**Fix C — List view header (wrap on mobile):**
```jsx
// BEFORE:
<div className="flex items-center justify-between">
// AFTER:
<div className="flex flex-wrap items-start justify-between gap-4">
  // Also: <h1 className="text-xl md:text-2xl font-bold">
  // Also: <Button className="gap-2 flex-shrink-0">
```

**Fix D — Preview modal width (responsive):**
```jsx
// BEFORE:
style={{ width: '680px', ... }}
// AFTER:
style={{ width: 'min(680px, calc(100vw - 32px))', ... }}
```

**Fix E — List view spacing:**
```jsx
// BEFORE:
<div className="p-6 space-y-6">
// AFTER:
<div className="p-4 md:p-6 space-y-4 md:space-y-6">
```

---

### 2.3 EnhancedOnboarding.js

**File:** `src/components/EnhancedOnboarding.js`

**Fix A — Back button (Tailwind classes, shorter label on mobile):**

BEFORE: Heavy inline style object with `position: fixed`, mouse event handlers.

AFTER:
```jsx
<button
  onClick={handleBackToLanding}
  className="fixed top-3 left-3 sm:top-5 sm:left-5 z-50 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white border border-gray-200 rounded-lg cursor-pointer text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors min-h-[44px]"
>
  <ArrowLeft className="w-4 h-4" />
  <span className="hidden sm:inline">Back to Sign in</span>
  <span className="sm:hidden">Back</span>
</button>
```

**Fix B — Color grid media query (inside `<style>` block):**
```css
.color-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}
@media (max-width: 480px) {
  .color-grid {
    grid-template-columns: 1fr;
  }
}
```

**Fix C — Summary grid media query (inside `<style>` block):**
```css
.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 480px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
```

**Fix D — Progress steps + navigation buttons media query (inside `<style>` block):**
```css
@media (max-width: 480px) {
  .progress-steps {
    gap: 4px;
  }
  .step-label {
    font-size: 10px;
  }
  .wizard-navigation {
    flex-direction: column;
    gap: 8px;
  }
  .wizard-navigation .btn {
    width: 100%;
  }
}
```

---

## Phase 3 — Medium Priority

### 3.1 BrandSettings.js

**File:** `src/components/Dashboard/BrandSettings.js`

**Fix A — Email colors grid (inline → Tailwind):**
```jsx
// BEFORE:
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginTop: '8px' }}>
// AFTER:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
```

**Fix B — Input + button rows (prevent button squash):**
```jsx
// BEFORE:
<div style={{ display: 'flex', gap: '10px' }}>
  <input type="text" ... />
  <button ...>Add</button>
// AFTER:
<div className="flex gap-2">
  <input type="text" className="flex-1 min-w-0 ..." ... />
  <button className="flex-shrink-0 ..." ...>Add</button>
```

Apply to all input+button pairs (value proposition, brand values, negative keywords).

**Fix C — Tone slider cards (inline → Tailwind):**
```jsx
// BEFORE:
<div key={name} style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
// AFTER:
<div key={name} className="bg-gray-50 p-3 rounded-lg">
  <div className="flex justify-between mb-2">
```

---

### 3.2 Hero.js

**File:** `src/components/Hero.js`

**Fix A — Decorative blur circles (smaller on mobile):**
```jsx
// BEFORE:
<div className="absolute top-20 right-20 w-96 h-96 bg-gray-200 rounded-full blur-3xl animate-pulse-slow" />
<div className="absolute bottom-20 left-20 w-96 h-96 bg-gray-100 rounded-full blur-3xl animate-pulse-slow" ... />
// AFTER:
<div className="absolute top-10 right-10 sm:top-20 sm:right-20 w-48 sm:w-96 h-48 sm:h-96 bg-gray-200 rounded-full blur-3xl animate-pulse-slow" />
<div className="absolute bottom-10 left-10 sm:bottom-20 sm:left-20 w-48 sm:w-96 h-48 sm:h-96 bg-gray-100 rounded-full blur-3xl animate-pulse-slow" ... />
```

**Fix B — Main heading font size:**
```jsx
// BEFORE:
<h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
// AFTER:
<h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight leading-tight">
```

**Fix C — Stats row (wrap on mobile):**
```jsx
// BEFORE:
<div className="flex items-center gap-8 pt-4">
// AFTER:
<div className="flex flex-wrap items-center gap-4 sm:gap-8 pt-4">
```

**Fix D — Right column height (shorter on mobile):**
```jsx
// BEFORE:
<div className="relative h-[500px] lg:h-[600px]">
// AFTER:
<div className="relative h-[300px] sm:h-[400px] lg:h-[600px]">
```

**Fix E — Section padding:**
```jsx
// BEFORE:
<div className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden">
// AFTER:
<div className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 py-12 sm:py-20 overflow-hidden">
```

---

### 3.3 LandingPage.js — Mobile Hamburger Menu

**File:** `src/components/LandingPage.js`

**Step 1 — Add state:**
```jsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

**Step 2 — Add hamburger button next to existing desktop nav:**
```jsx
{/* Mobile hamburger — add after existing hidden md:flex nav div */}
<button
  className="md:hidden p-2 min-w-[44px] min-h-[44px] rounded-lg hover:bg-accent/10 transition-colors flex items-center justify-center"
  onClick={() => setMobileMenuOpen(prev => !prev)}
  aria-label="Toggle navigation"
>
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
  </svg>
</button>
```

**Step 3 — Add mobile menu panel (below nav, above page content):**
```jsx
{mobileMenuOpen && (
  <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-background border-b border-border shadow-lg">
    <div className="container mx-auto px-6 py-4 flex flex-col gap-3">
      <a href="#features" className="text-sm font-medium py-2 border-b border-border hover:text-primary"
         onClick={() => setMobileMenuOpen(false)}>Features</a>
      <a href="#pricing" className="text-sm font-medium py-2 border-b border-border hover:text-primary"
         onClick={() => setMobileMenuOpen(false)}>Pricing</a>
      {isAuthenticated ? (
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="ghost" className="justify-start"
            onClick={() => { handleDashboardClick(); setMobileMenuOpen(false); }}>Dashboard</Button>
          <Button variant="outline" className="justify-start"
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>Logout</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 pt-2">
          <Button variant="ghost" className="justify-start"
            onClick={() => { setAuthModalMode('login'); setShowSignUpModal(true); setMobileMenuOpen(false); }}>Sign In</Button>
          <Button className="justify-start"
            onClick={() => { setAuthModalMode('signup'); setShowSignUpModal(true); setMobileMenuOpen(false); }}>Sign Up</Button>
        </div>
      )}
    </div>
  </div>
)}
```

---

## Phase 4 — Polish

### 4.1 Body Overflow Fix

**File:** `src/index.css`

Add to the `body` rule:
```css
body {
  /* existing styles */
  overflow-x: hidden;
}
```

### 4.2 Touch Target Sizes

All hamburger buttons added in Phase 1 and Phase 3 should have `min-w-[44px] min-h-[44px]` (already included in code above).

For small `Button` variants in `src/components/ui/button.jsx`, add minimum touch height on mobile:
```jsx
// In the CVA size variants, sm:
"sm": "h-9 rounded-md px-3 min-h-[44px] md:min-h-[36px]"
```

### 4.3 EmailSettings.js

No critical changes needed — after Phase 1 fixes the outer layout padding (`p-4 md:p-8`), EmailSettings forms will have adequate mobile spacing. Forms already use `w-full` inputs.

---

## Implementation Summary Table

| Phase | File | Key Change | Priority |
|---|---|---|---|
| 1 | `Sidebar.js` | Fixed position + slide transform + backdrop overlay + auto-close | CRITICAL |
| 1 | `DashboardLayout.js` | `mobileSidebarOpen` state + hamburger button + `p-4 md:p-8` | CRITICAL |
| 2 | `PromptPlayground.js` | Grid responsive classes, iframe height, stage indicators | HIGH |
| 2 | `CustomLayoutBuilder.js` | Toolbar flex-wrap, editor sidebar toggle, modal responsive width | HIGH |
| 2 | `EnhancedOnboarding.js` | Back button Tailwind, color/summary grid media queries | HIGH |
| 3 | `BrandSettings.js` | Color grid Tailwind, input+button flex-1, tone card Tailwind | MEDIUM |
| 3 | `Hero.js` | Decorative circle sizes, heading font, column height, padding | MEDIUM |
| 3 | `LandingPage.js` | `mobileMenuOpen` state + hamburger + mobile nav panel | MEDIUM |
| 4 | `index.css` | `overflow-x: hidden` on body | LOW |
| 4 | `button.jsx` | `min-h-[44px]` for touch targets | LOW |

---

*Plan generated: 2026-02-21*
*Codebase version: main branch*
