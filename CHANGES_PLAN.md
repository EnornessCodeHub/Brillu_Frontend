# Brillu Frontend — Planned Changes

**Date:** 2026-02-24
**Status:** Pending implementation

---

## 1. AI Image Settings Disclaimer in Generate Email
**File:** `src/components/PromptPlayground.js`
**Location:** Image Slot Choices section (~line 1014–1061), inside the `.map()` for each slot
**What to do:**
- When a slot's selected source is `'ai'`, render a small disclaimer box below that slot's buttons
- Text: *"AI image quality depends on how detailed your prompt is. For best results, configure Image Settings in Knowledge Base → Image Settings."*
- Style: muted/info tone (small text, maybe a light info icon)
- No navigation link needed — just informational text

---

## 2. Onboarding Hero Image Upload
**File:** `src/components/EnhancedOnboarding.js`
**Location:** Step 1 — Brand Basics section (~line 257–338), after the Logo upload field
**What to do:**
- Add new state: `heroImageUrl`, `uploadingHeroImage`
- Add a new `handleHeroImageUpload` function — same structure as `handleLogoUpload` but:
  - Uses endpoint: `POST /api/media/upload-logo` with field name `heroImage` OR a separate endpoint (confirm with backend)
  - Sets `heroImageUrl` state on success
- Add upload UI same as logo (dashed border, click to upload, preview + remove button)
- In `handleComplete()` → inside `brandInfo.brandIdentity`, add: `hero_image_url: heroImageUrl || undefined`
- In Summary step (Step 3), show hero image preview if uploaded
- Field is optional — no validation required

---

## 3. Generate Email Page — Condensed Layout
**File:** `src/components/PromptPlayground.js`
**Location:** Lines 722–732 (outer header div) and lines 734–746 (Info Banner)
**What to do:**
- Remove the outer header `<div>` block entirely (lines 724–732) — the Sparkles icon + "Create Your Email" h3 + description paragraph
- Remove the "Info Banner" Card (lines 735–746) — the blue tip card about setting up preferences
- The page will now start directly with the main `<Card>` containing the form
- Also in `DashboardLayout.js` line 215: change the top `<h1>Dashboard</h1>` to be conditional — when `activeSection === 'home'`, show "Generate Email" instead of "Dashboard". This removes the redundant "Dashboard → AI Email Generator → Create Your Email" stacking.

---

## 4. Creative Nudge — Wording & Context
**File:** `src/components/PromptPlayground.js`
**Location:** Lines 819–837
**What to do:**
- Rename the toggle button label from `"Creative Nudge"` to `"Creative Direction (optional)"`
- Change textarea placeholder from `"Any additional creative direction for the AI..."` to:
  `"e.g., Use a storytelling approach, give it a summer vibe, make it feel exclusive and urgent..."`
- Add a helper text line below the textarea (only when expanded):
  `"Give the AI extra context — a style hint, a reference, or a unique angle for this email."`

---

## 5. Product Catalog → Move Inside Knowledge Base
**File:** `src/components/Dashboard/Sidebar.js`
**Location:** Lines 8–55 (menuItems array)
**What to do:**
- Remove the entire `data-sources` menu item object (lines 46–54)
- Inside the `knowledge-base` menu item, add a 4th group after 'Media':
  ```js
  {
    groupLabel: 'Product Catalog',
    collapsible: true,
    items: [
      { id: 'products', label: 'Product Catalog' }
    ]
  }
  ```
- No changes needed in `DashboardLayout.js` since `id: 'products'` already maps to the existing section

---

## 6. Regenerate Section → Create Campaign Copy
**File:** `src/components/PromptPlayground.js`
**Location:** `handleRegenerateComponent` function (~line 554–581)
**What to do:**
- After a successful regenerate-component call, check if response returns a `newCampaignId`
- If `newCampaignId` is returned: update `generatedCampaignId` state with the new ID, update HTML preview
- If not (backward compat): behave as before (just update HTML)
- Add a note in the UI: *"A copy of your campaign was created with this section updated."*
- **Requires backend change** — see backend notes below

---

## 7. Currency Library Expansion
**File:** `src/components/Dashboard/ProductFeed.js`
**Location:** Line 7 — `CURRENCIES` array
**What to do:**
- Replace current array with a comprehensive list of ~30 major world currencies as objects:
  ```js
  const CURRENCIES = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
    { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
    { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: '$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: '$' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    { code: 'SGD', name: 'Singapore Dollar', symbol: '$' },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr' },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
    { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
    { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك' },
    { code: 'QAR', name: 'Qatari Riyal', symbol: 'ر.ق' },
    { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب' },
    { code: 'EGP', name: 'Egyptian Pound', symbol: '£' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
    { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
    { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
    { code: 'THB', name: 'Thai Baht', symbol: '฿' },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: '$' },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: '$' },
  ]
  ```
- Update the dropdown `<select>` to use `{c.code} — {c.name}` as option label, `c.code` as value
- Update `currencySymbol` logic to use `CURRENCIES.find(c => c.code === product.currency)?.symbol || '$'`

---

## 8. Multiple CTAs — Text + URLs
**File:** `src/components/PromptPlayground.js`
**Location:** `intentForm` state (~line 66–75), CTA Goal section (~line 852–907)
**What to do:**

### State change:
- Remove: `ctaGoal`, `customCtaGoal`, `ctaUrl` from `intentForm`
- Add: `ctas: [{ goal: '', customGoal: '', url: '' }]` — an array

### UI change:
- Replace single CTA Goal + CTA URL fields with a dynamic list
- Each CTA item shows: Goal dropdown + (if custom) text input + URL input + Remove button
- Below the list: "＋ Add Another CTA" button (max 3 CTAs)
- Keep existing CTA_GOALS options

### buildPromptFromForm() update:
- Loop through `intentForm.ctas` array and include each in the prompt string

### requestBody update in executeGenerate() and handleRegenerateWithTemplate():
- Send `ctas: intentForm.ctas` instead of `ctaGoal`/`ctaUrl`
- Keep backward compat fallback: if only 1 CTA, also send `ctaGoal`/`ctaUrl` fields
- **Requires backend change** — see backend notes below

---

## Implementation Order (Recommended)

| Priority | Change | Reason |
|---|---|---|
| 1 | #4 Creative Direction wording | 10 min, zero risk |
| 2 | #3 Page condensed | 15 min, zero risk |
| 3 | #5 Product Catalog move | 15 min, sidebar only |
| 4 | #1 AI Image disclaimer | 20 min, no backend |
| 5 | #7 Currency library | 30 min, self-contained |
| 6 | #2 Onboarding hero image | After backend confirms endpoint |
| 7 | #8 Multiple CTAs | After backend confirms schema |
| 8 | #6 Regenerate copy | After backend implements endpoint |
