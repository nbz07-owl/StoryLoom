[README.md](https://github.com/user-attachments/files/35229030/README.md)
# Storyloom

An interactive children's picture-book studio that writes original stories, generates custom illustrations for every page at configurable resolution (`1K`, `2K`, `4K`), reads each page aloud with expressive narration, and pairs young readers with a multi-turn Story Buddy companion.

---

## Features

- **Open Storybook Spread & Library**
  - Ships with three pre-loaded starter picture books (*The Clockwork Fox of Maple Hollow*, *Barnaby's Paper Boat Across the Sky*, and *Pip and the Lantern-Bug Orchestra*).
  - Custom created stories and newly painted page illustrations persist locally in browser `IndexedDB`.

- **Read-Aloud Audio Theater (`gemini-3.8-flash-tts`)**
  - Synthesizes expressive WAV narration (`audio/wav`) per page with five narrator voices (`Clara`, `Pip`, `Willow`, `Arthur`, `Bram`) and three storytelling tones (`Warm`, `Playful`, `Bedtime`).
  - Includes playback scrubbing/progress tracking, audio caching per `(page, voice, tone)`, and an **Auto-Read** mode that automatically flips pages when narration completes.

- **Per-Page Illustration Studio (`gemini-3-pro-image-preview`)**
  - Choose illustration resolution (**1K**, **2K**, or **4K**) directly from the reader toolbar or creation workshop.
  - Regenerate any page's artwork, edit the scene description or illustration medium (`Watercolor & Ink`, `Gouache Storybook`, `Pastel & Colored Pencil`, `Woodblock Folk Art`), batch-illustrate remaining pages, and compare saved plate variations per page.

- **Storybook Workshop (`gemini-4-hydrogen` + `gemini-3-pro-image-preview`)**
  - Generate multi-page children's books (3–5 pages) tailored by reading age (`Ages 3–5`, `Ages 6–8`, `Ages 9–11`), main character name, and art medium, automatically painting a fresh illustration for every page.

- **Multi-Turn Story Buddy Chat**
  - Scrollable, context-aware chat drawer grounded in the active book and current page, with read-aloud playback on replies and four specialized role modes:
    - **Companion** (`gemini-4-hydrogen`) — friendly Q&A and story wonder
    - **Word Helper** (`gemini-3.1-flash-lite`) — fast word definitions and playful rhymes
    - **Co-Author** (`gemini-4-neon`) — interactive plot twists and alternate scenes
    - **Deep Guide** (`gemini-4-carbon`) — story morals, hidden clues, and riddles

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend**: Node.js (v22+), Express, `@google/genai` SDK (`v1beta` server-side proxy)
- **Bundler & Dev Server**: Vite 8 (integrated via Express middleware in development)
- **Local Storage**: Browser IndexedDB for user-created books and generated illustrations

---

## Getting Started

### Prerequisites

- **Node.js** `>= 22.0.0` (required for native TypeScript execution on `npm start`)
- A **Gemini API Key** from Google AI Studio (a billing-enabled key is recommended for `gemini-3-pro-image-preview`, `gemini-4-neon`, and `gemini-4-carbon`)

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

All `@google/genai` requests run server-side inside `server.ts`:

| Method | Endpoint | Model | Purpose |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | — | Health check |
| `POST` | `/api/stories/generate` | `gemini-4-hydrogen` | Generate structured multi-page story JSON |
| `POST` | `/api/illustrations/generate` | `gemini-3-pro-image-preview` | Generate page artwork at `1K`, `2K`, or `4K` |
| `POST` | `/api/tts/speak` | `gemini-3.8-flash-tts` | Synthesize expressive `audio/wav` narration |
| `POST` | `/api/chat` | `gemini-4-hydrogen`, `gemini-3.1-flash-lite`, `gemini-4-neon`, `gemini-4-carbon` | Multi-turn Story Buddy chat with conversation history |

---

## Project Structure

```text
├── server.ts                          # Express server, Vite middleware, and Gemini API routes
├── index.html                         # HTML entry point and font imports
├── src/
│   ├── App.tsx                        # Root state, audio playback, story & chat orchestration
│   ├── index.css                      # Tailwind CSS v4 theme configuration
│   ├── assets/images/                 # Starter storybook illustrations
│   ├── components/
│   │   ├── TopBar.tsx                 # Header navigation bar
│   │   ├── StorySpread.tsx            # Two-page picture book spread, 1K/2K/4K studio, TTS controls
│   │   ├── LibraryShelf.tsx           # Storybook library grid
│   │   ├── CreateStorySection.tsx     # New story creation workshop
│   │   └── StoryBuddyDrawer.tsx       # Multi-turn Story Buddy chat drawer
│   ├── data/starterStories.ts         # Pre-loaded starter books
│   ├── types/story.ts                 # Shared TypeScript types and model/voice configs
│   └── utils/storage.ts               # IndexedDB persistence helpers
├── .env.example                       # Environment variable template
└── package.json
```
