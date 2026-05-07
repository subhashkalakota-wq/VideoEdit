# VideoAI Parser — AI Video Editing Command Engine

> Convert natural language video editing instructions into precise, structured JSON operations — instantly.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12-ff0055)

---

## 🚀 Getting Started

```bash
cd videoai-pro
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## ✨ Features

- **25+ Supported Actions** — trim, cut, speed, blur, filters, effects, text, subtitles, music, and more
- **Compound Presets** — say "cinematic", "vlog style", or "viral" → expands into multiple atomic actions
- **Confidence Scores** — every action includes a 0–1 confidence score
- **Parse History** — last 20 parses saved in local storage, restorable with one click
- **Dual View Mode** — switch between syntax-highlighted Raw JSON and Visual Card view
- **Copy & Download** — one-click JSON copy to clipboard or download as `.json`
- **Aurora UI** — animated glassmorphism dark theme with Framer Motion micro-animations

---

## 🔌 REST API

### `POST /api/parse`
```json
// Request
{ "instruction": "make it cinematic and add slow motion in the middle" }

// Response
{
  "actions": [
    { "action": "apply_filter", "parameters": { "filter_name": "cinematic" }, "confidence": 0.95 },
    { "action": "zoom",         "parameters": { "start": 0, "end": "video_duration", "level": 1.05 }, "confidence": 0.88 },
    { "action": "color_correction", "parameters": { "brightness": 1.05, "contrast": 1.1, "saturation": 1.2 }, "confidence": 0.92 },
    { "action": "change_speed", "parameters": { "factor": 0.5, "start": "midpoint - 5", "end": "midpoint + 5" }, "confidence": 0.9 }
  ],
  "instruction": "make it cinematic and add slow motion in the middle",
  "parsedAt": "2026-05-04T05:28:07.633Z",
  "processingMs": 1
}
```

### `GET /api/actions`
Returns metadata for all 25+ supported actions.

### `GET /api/examples`
Returns 8 example prompts with tags.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **Animations** | Framer Motion 12 |
| **State** | Zustand 5 (with persistence) |
| **Validation** | Zod 4 |
| **Notifications** | React Hot Toast |
| **Icons** | Lucide React |

---

## 📁 Project Structure

```
app/
  layout.tsx         ← Root layout + fonts + toaster
  page.tsx           ← Main page (Hero + Sections + Parser)
  globals.css        ← Design tokens + aurora + glassmorphism
  api/
    parse/route.ts   ← POST /api/parse (main parser)
    actions/route.ts ← GET /api/actions
    examples/route.ts← GET /api/examples

components/
  Navbar.tsx         ← Sticky glass navigation
  Hero.tsx           ← Animated hero + live preview card
  HowItWorks.tsx     ← 3-step animated timeline
  SupportedActions.tsx ← Action chips by category
  ParserInterface.tsx  ← Split-pane parser (main feature)
  JsonViewer.tsx     ← Syntax-highlighted JSON + visual view
  ActionCard.tsx     ← Individual action breakdown card
  HistoryPanel.tsx   ← Parse history with restore/delete
  ExampleChips.tsx   ← Quick-fill example buttons
  Footer.tsx         ← Quick reference + footer

lib/
  types.ts           ← All TypeScript types
  parser.ts          ← Rule-based NLP parser engine
  actions-data.ts    ← Action metadata + examples
  utils.ts           ← Utility functions

hooks/
  useParseHistory.ts ← Zustand store (localStorage persistent)
```
