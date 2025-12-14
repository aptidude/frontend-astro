# AptiDude SEO Layer

Pre-rendered static pages for SEO optimization. This Astro-based frontend generates HTML pages for all questions, topics, and courses to enable proper search engine indexing.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        aptidude.in (Production)                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │    ASTRO SEO LAYER      │    │       REACT INTERACTIVE APP         │ │
│  │     (Static HTML)       │    │        (SPA at /app/)               │ │
│  │                         │    │                                     │ │
│  │  aptidude.in/           │    │  aptidude.in/app/                   │ │
│  │  ├── /                  │    │  ├── /practice                      │ │
│  │  ├── /learn             │    │  ├── /compete                       │ │
│  │  ├── /learn/:course     │    │  ├── /learn                         │ │
│  │  ├── /learn/:course/:topic   │  ├── /question/:id                  │ │
│  │  ├── /questions/:slug   │    │  ├── /analytics                     │ │
│  │  └── /sitemap.xml       │    │  └── ...interactive features        │ │
│  │                         │    │                                     │ │
│  │  🤖 Google indexes      │    │  🔒 noindex (handled by Astro)      │ │
│  │  📄 Static HTML         │    │  ⚡ Interactive SPA                  │ │
│  │  🚀 Fast load           │    │  🔐 Auth, Progress, Analytics        │ │
│  └─────────────────────────┘    └─────────────────────────────────────┘ │
│                                                                         │
│        User clicks CTA ─────────────────────────────▶                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔄 User Flow: How Redirects Work

### Production Flow (aptidude.in)

```
1. User searches Google: "number system questions for SSC CGL"
                                    │
                                    ▼
2. Google shows: aptidude.in/learn/quantitative-aptitude/number-system
   (Astro SEO page with pre-rendered HTML)
                                    │
                                    ▼
3. User clicks result → Lands on ASTRO page
   ┌─────────────────────────────────────────────┐
   │  📄 Static HTML - Fast Loading              │
   │  ✅ Full content visible                    │
   │  ✅ SEO metadata in HTML                    │
   │  ✅ Schema.org structured data              │
   │  🔘 "Start Learning →" button               │
   └─────────────────────────────────────────────┘
                                    │
                                    ▼
4. User clicks "Start Learning →" or any CTA
                                    │
                                    ▼
5. JavaScript redirects to: aptidude.in/app/learn/quantitative-aptitude/number-system
   ┌─────────────────────────────────────────────┐
   │  ⚡ REACT SPA loads                         │
   │  ✅ Interactive lessons                     │
   │  ✅ Progress tracking                       │
   │  ✅ User authentication                     │
   │  ✅ Practice questions                      │
   └─────────────────────────────────────────────┘
```

### Development Flow (localhost)

```
                    localhost:4321 (Astro)
                            │
         User clicks CTA ───┘
                            │
                            ▼
                    localhost:5173 (React)
                    (No /app prefix in dev)
```

## 📁 Content Sources

### 1. Questions Data (from API)

- Fetched at build time from backend
- Generates 10,000+ question pages
- Auto-generates SEO slugs and metadata

### 2. meta.json (Curated SEO Data)

- Hand-crafted SEO metadata for courses & topics
- 10 courses (Quantitative Aptitude, Logical Reasoning, etc.)
- 140+ topics with optimized titles, descriptions, keywords

```
src/data/meta.json
├── site        → Site-wide metadata
├── pages       → Main page SEO (home, learn, practice)
├── courses     → Course-level SEO (quantitative-aptitude, cat, ssc)
└── topics      → Topic-level SEO (number-system, hcf-lcm, etc.)
```

## 🚀 Quick Start

### Development

```bash
# Terminal 1: Backend
cd backend && npm start
# Runs on port 8080

# Terminal 2: React App
cd frontend && npm run dev
# Runs on port 5173

# Terminal 3: Astro SEO Layer
cd frontend-astro && npm run dev
# Runs on port 4321
```

### Testing the Flow

1. Visit `http://localhost:4321` (Astro homepage)
2. Navigate to any question or topic page
3. Click "Start Learning" or "Solve Question"
4. You'll be redirected to `http://localhost:5173` (React app)

## 📂 File Structure

```
src/
├── data/
│   └── meta.json              # Curated SEO metadata
├── layouts/
│   └── BaseLayout.astro       # Shared layout
├── pages/
│   ├── index.astro            # Homepage
│   ├── learn/
│   │   ├── index.astro        # /learn page (courses list)
│   │   ├── [course].astro     # /learn/:course (from meta.json)
│   │   ├── [course]/
│   │   │   └── [topic].astro  # /learn/:course/:topic (from meta.json)
│   │   └── [exam]/
│   │       ├── index.astro    # /learn/:exam (from questions)
│   │       └── [topic].astro  # /learn/:exam/:topic (from questions)
│   ├── questions/
│   │   └── [slug].astro       # Individual question pages
│   └── sitemap.xml.ts         # Dynamic sitemap
├── utils/
│   ├── dataFetcher.ts         # API calls
│   ├── markdownRenderer.ts    # Markdown/LaTeX rendering
│   └── seoGenerator.ts        # SEO metadata generation
└── types.ts                   # TypeScript interfaces

public/
├── styles/main.css            # All styles
├── favicon.ico                # AptiDude favicon
├── logo_whitebg.png           # Logo
└── robots.txt                 # Crawler rules
```

## ⚙️ Environment Variables

### Development (.env.development)

```env
# No special config needed - defaults work for localhost
```

### Production (.env.production)

```env
# API for fetching questions during build
API_URL=https://api.aptidude.in

# React app URL (for CTAs)
PUBLIC_APP_URL=https://aptidude.in/app
```

## 🌐 Deployment (Vercel)

### Astro SEO Layer (frontend-astro)

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/$1" }]
}
```

### React App (frontend)

```json
// vercel.json
{
  "rewrites": [{ "source": "/app/(.*)", "destination": "/app/index.html" }]
}
```

**Or deploy as separate Vercel projects and use custom domains:**

- `aptidude.in` → Astro project
- `aptidude.in/app` → React project (set as base path)

## 🔍 SEO Strategy

| Page Type  | URL Pattern             | Source      | Priority |
| ---------- | ----------------------- | ----------- | -------- |
| Homepage   | `/`                     | index.astro | 1.0      |
| Learn Main | `/learn`                | index.astro | 0.95     |
| Courses    | `/learn/:course`        | meta.json   | 0.95     |
| Topics     | `/learn/:course/:topic` | meta.json   | 0.90     |
| Questions  | `/questions/:slug`      | API         | 0.70     |
| React App  | `/app/*`                | noindex     | -        |

## 🎯 Why This Architecture?

1. **SEO**: Search engines get pre-rendered HTML with all content
2. **Speed**: Static pages load instantly for users
3. **Interactivity**: React handles complex features (auth, progress, practice)
4. **Same Content**: Both layers show identical content (not cloaking)
5. **Scalability**: Astro builds handle 10k+ pages efficiently

## 📊 Build Stats

```
✅ Built in ~3-5 minutes:
   - 1 Homepage
   - 1 Learn page
   - 10 Course pages (from meta.json)
   - 140+ Topic pages (from meta.json)
   - 100+ Exam/Topic pages (from questions)
   - 10,000+ Question pages
   - 1 Sitemap with all URLs
```
