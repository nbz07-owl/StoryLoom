# Storyloom

An interactive children's picture-book studio that writes original stories, generates custom illustrations (`1K`, `2K`, `4K`) and animated video scenes for every page, reads each page aloud with expressive narration, exports structured storybook PDFs, and pairs young readers with a multi-turn Story Buddy companion.

---

## Features

- **Open Storybook Spread & Library**
  - Ships with three pre-loaded starter picture books (*The Clockwork Fox of Maple Hollow*, *Barnaby's Paper Boat Across the Sky*, and *Pip and the Lantern-Bug Orchestra*).
  - User-created stories, saved illustration plates, and generated video clips persist locally in browser `IndexedDB`.

- **Read-Aloud Audio Theater (`gemini-3.8-flash-tts`)**
  - Synthesizes expressive WAV narration (`audio/wav`) per page with five narrator voices (`Clara`, `Pip`, `Willow`, `Arthur`, `Bram`) and three storytelling tones (`Warm`, `Playful`, `Bedtime`).
  - Converts returned audio to `Blob` URLs with playback progress tracking, in-memory caching per `(page, voice, tone)`, and an **Auto-Read** mode that automatically flips pages when narration completes.

- **Per-Page Illustration Studio (`gemini-3-pro-image-preview`)**
  - Choose illustration resolution (**1K**, **2K**, or **4K**) directly from the reader toolbar or creation workshop.
  - Regenerate any page's artwork, edit the scene description or illustration medium (`Watercolor & Ink`, `Gouache Storybook`, `Pastel & Colored Pencil`, `Woodblock Folk Art`), batch-illustrate remaining pages, and switch between saved plate variations per page.

- **Animated Video Studio (`gemini-omni-1.2-flash`)**
  - Turn any page's painted illustration into an animated storybook clip via Image-to-Video (or generate Text-to-Video directly from the scene prompt) using the Gemini Interactions API (`ai.interactions.create`).
  - Configure video duration (`5s`, `8s`, `10s`), resolution (`360p`, `720p`, `1080p`), and aspect ratio (`16:9`, `9:16`), extend scenes seamlessly via `previous_interaction_id`, and switch between **Illustration** and **Animated Video** views or saved clips.

- **Storybook Workshop (`gemini-4-hydrogen` + `gemini-3-pro-image-preview`)**
  - Generate multi-page children's books (3–5 pages) tailored by reading age (`Ages 3–5`, `Ages 6–8`, `Ages 9–11`), main character name, and art medium, automatically painting a fresh illustration for every page—plus an optional toggle to animate Page 1 into a 5-second storybook video.

- **Structured PDF Storybook Export (`jsPDF`)**
  - Download any starter or generated book directly from the reader header (**Export PDF**) or library cards (**Download PDF**) as a formatted landscape A4 PDF featuring a framed cover page, two-page illustrated spreads, chapter prose, and the closing Story Heart takeaway.

- **Multi-Turn Story Buddy Chat**
  - Scrollable, context-aware chat drawer grounded in the active book and current page, with read-aloud playback on replies and four specialized role modes:
    - **Companion** (`gemini-4-hydrogen`) — friendly Q&A and story wonder
    - **Word Helper** (`gemini-3.1-flash-lite`) — fast word definitions and playful rhymes
    - **Co-Author** (`gemini-4-neon`) — interactive plot twists and alternate scenes
    - **Deep Guide** (`gemini-4-carbon`) — story morals, hidden clues, and riddles

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, jsPDF
- **Backend**: Node.js (v22+), Express, `@google/genai` SDK (`v1beta` server-side proxy & Interactions API)
- **Bundler & Dev Server**: Vite 8 (integrated via Express middleware and HTTP/WebSocket server on port `3000`)
- **Local Storage**: Browser IndexedDB for user-created books, generated illustrations, and video clips

---

## Getting Started

### Prerequisites

- **Node.js** `>= 22.0.0` (required for native TypeScript execution on `npm start`)
- A **Gemini API Key** from Google AI Studio (a billing-enabled key is recommended for `gemini-3-pro-image-preview`, `gemini-omni-1.2-flash`, `gemini-4-neon`, and `gemini-4-carbon`)

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and add your Gemini API key:

```bash
cp .env.example .env
```

```env
GEMINI_API_KEY="your_gemini_api_key_here"
APP_URL="http://localhost:3000"
```

> `.env` is ignored by `.gitignore` so your API key is never committed to GitHub.

### 3. Run in Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build & Run in Production

```bash
npm run build
NODE_ENV=production npm start
```

### Type Checking

```bash
npm run lint
```

---

## Server API Endpoints

All `@google/genai` requests run server-side inside `server.ts` on `v1beta` with transient retry handling:

| Method | Endpoint | Model | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | — | Health check |
| `POST` | `/api/stories/generate` | `gemini-4-hydrogen` | Generate structured multi-page story JSON |
| `POST` | `/api/illustrations/generate` | `gemini-3-pro-image-preview` | Generate page artwork at `1K`, `2K`, or `4K` |
| `POST` | `/api/videos/generate` | `gemini-omni-1.2-flash` | Generate or extend animated storybook video clips |
| `POST` | `/api/tts/speak` | `gemini-3.8-flash-tts` | Synthesize expressive `audio/wav` narration |
| `POST` | `/api/chat` | `gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-4-neon`, `gemini-4-carbon` | Multi-turn Story Buddy chat with conversation history |

---

## Project Structure

```text
├── server.ts                          # Express + HTTP/WS server, Vite middleware, and Gemini API routes
├── index.html                         # HTML entry point and font imports
├── metadata.json                      # App metadata and server-side capability flags
├── src/
│   ├── App.tsx                        # Root state, audio/video orchestration, PDF export, and chat state
│   ├── index.css                      # Tailwind CSS v4 theme configuration
│   ├── assets/images/                 # Starter storybook illustrations
│   ├── components/
│   │   ├── TopBar.tsx                 # Header navigation bar
│   │   ├── StorySpread.tsx            # Two-page spread, 1K/2K/4K studio, video studio, TTS & PDF export
│   │   ├── LibraryShelf.tsx           # Storybook library grid with PDF download & book removal
│   │   ├── CreateStorySection.tsx     # New story workshop with optional Page 1 video animation
│   │   └── StoryBuddyDrawer.tsx       # Multi-turn Story Buddy chat drawer with TTS reply playback
│   ├── data/starterStories.ts         # Pre-loaded starter books
│   ├── types/story.ts                 # Shared TypeScript types, model/voice/video configs
│   └── utils/
│       ├── exportPdf.ts               # Structured landscape A4 storybook PDF generator (jsPDF)
│       └── storage.ts                 # IndexedDB persistence helpers
├── .env.example                       # Environment variable template
└── package.json
```
