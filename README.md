# Brillu — AI Email Campaign Frontend

A React-based SaaS frontend for AI-powered email campaign generation. Brillu lets users create, customize, and manage professional email campaigns through natural language prompts, a drag-and-drop email editor, and a guided brand setup flow.

---

## Features

- **AI Email Generation** — Describe your campaign in plain English; the AI generates a full MJML/HTML email
- **Drag-Drop Editor** — GrapesJS-powered visual email builder with desktop / tablet / mobile preview
- **Campaign Management** — Create, edit, save, and manage multiple email campaigns
- **Brand Onboarding** — 3-step wizard to capture brand identity, voice, colors, and personality
- **Template System** — Pre-built templates and a custom layout builder
- **Product Integration** — Embed product blocks with dynamic data from your product catalog
- **Media Library** — Upload and manage image assets for your emails
- **AI Regeneration** — Regenerate individual components or images with AI at any time
- **HTML Export** — Download emails as standalone HTML with base64-embedded images
- **Responsive Design** — Preview emails across device sizes inside the editor

---

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 18 (Create React App) |
| Styling | Tailwind CSS 3, CSS variables |
| UI Primitives | Radix UI |
| Email Editor | GrapesJS + MJML + Newsletter Preset |
| HTTP Client | Axios |
| Icons | Lucide React |
| Containerization | Docker (Nginx) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- A running instance of the Brillu backend API

### Installation

```bash
git clone <repo-url>
cd AI-State-Machine-Frontend
npm install
```

### Environment Setup

Create a `.env.local` file in the project root (see `.env.example`):

```bash
REACT_APP_API=http://localhost:4000
```

Set `REACT_APP_API` to the URL of your backend API.

### Running Locally

```bash
# Start the development server (port 3000)
npm run dev
```

### Production Build

```bash
# Build optimised assets
npm run build

# Serve the build locally
npm start
```

---

## Docker

Build and run a production-ready container served by Nginx:

```bash
docker build -t brillu-frontend .
docker run -p 80:80 brillu-frontend
```

The app will be available at `http://localhost`.

---

## Project Structure

```
src/
├── components/
│   ├── ui/                     # Reusable UI primitives (button, card, input, etc.)
│   ├── Dashboard/              # All dashboard feature components
│   │   ├── DashboardLayout.js  # Main layout, campaign CRUD, GrapesJS editor
│   │   ├── Sidebar.js          # Navigation sidebar
│   │   ├── BrandSettings.js
│   │   ├── MediaLibrary.js
│   │   ├── ProductFeed.js
│   │   ├── TemplateGallery.js
│   │   ├── EmailSettings.js
│   │   ├── CustomLayoutBuilder.js
│   │   └── ...
│   ├── App.js                  # Auth state & top-level routing
│   ├── LoginPage.js
│   ├── SignUpModal.js
│   ├── EnhancedOnboarding.js   # 3-step brand profile setup
│   └── PromptPlayground.js     # AI email generation interface
├── config/
│   └── api.config.js           # Central API base URL
├── lib/
│   └── utils.js                # cn() class name helper
├── index.css                   # Global styles + Brillu CSS variables
└── grapesjs-custom-theme.css   # GrapesJS editor overrides
```

---

## User Flows

### New User
1. Sign up via the registration modal
2. Complete 3-step brand onboarding (Brand Basics → Brand Voice & Colors → Summary)
3. Land on the dashboard ready to generate campaigns

### Generate an Email
1. Go to **Generate Email** in the sidebar
2. Fill in the prompt, select a template, and set image preferences
3. Hit Generate — watch the AI build your email in real time
4. The campaign is saved automatically and opens in the editor

### Edit & Export
1. Open any campaign from **My Campaigns**
2. Edit content, layout, and styles in the GrapesJS editor
3. Regenerate individual sections or images with AI as needed
4. Export as standalone HTML or save back to the campaign

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server on port 3000 |
| `npm run build` | Build optimised production assets |
| `npm start` | Serve the production build locally |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `REACT_APP_API` | `http://localhost:4000` | Backend API base URL |
