# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Client (React + Vite)
cd client && npm run dev     # dev server on :5173
cd client && npm run build   # tsc + production build
cd client && npm run preview # preview production build

# Server (Express + SQLite)
cd server && npm run dev     # dev with tsx watch on :3001
cd server && npm run build   # tsc
cd server && npm start       # run compiled JS
```

Both must run simultaneously in dev. Vite proxies `/api` to `localhost:3001`.

## Architecture

Monorepo with two packages:

```
client/     React SPA (Vite + TailwindCSS + TypeScript)
server/     Express REST API (better-sqlite3 + TypeScript)
```

### Client Structure
```
client/src/
  pages/          Page components (state machine, not React Router)
    HomePage.tsx          Start page
    AskPage.tsx           Question type/spread type input
    ShufflePage.tsx       Shuffle animation (1.5s)
    CutPage.tsx           Cut animation (1.2s)
    DrawPage.tsx          Pick cards from 78-card grid
    ResultPage.tsx        Flip cards → reveal interpretation
    ReadingResultPage.tsx Full AI/template reading display
    HistoryPage.tsx       Past readings list
  api.ts          Server API client + offline localStorage fallback
  types.ts        TarotCard, DrawnCard, Reading, LocalReading, etc.
  utils/
    reading-generator.ts  Client-side reading text generator (offline fallback)
  data/           Static 78-card JSON (identical copy on server)
```

### Server Structure
```
server/src/
  index.ts          Express app, CORS, JSON body parser, port 3001
  db/index.ts       SQLite init (readings table + schema migrations)
  routes/
    readings.ts     POST/GET readings (draw cards, AI/template reading, format response)
    cards.ts        GET /api/cards (list all / get by id)
  services/
    ai-reading.ts      AI-powered reading via OpenAI-compatible API (deepseek-v4-flash)
    template-reading.ts  Fallback template-based reading from card interpretation data
  data/             cards.json + tarot.db (SQLite, auto-created)
```

### Page State Machine

App.tsx uses `useState<Page>` (no React Router) with 9 states:

```
home → ask → shuffle → cut → draw → analyzing → result → reading-result
                                            ↑         |
                                            |         v
                                            +---history
```

### Key Design Decisions

- **Offline-first**: `api.ts` catches fetch errors and falls back to localStorage. Local readings use ISO timestamps as IDs with `local_` prefix.
- **Dual JSON**: `cards.json` lives in both client and server — client uses it for local draws, server for API draws. Keep in sync.
- **Concurrent API + animation**: `createReading()` fires during ShufflePage. Three `useRef` flags (`shuffleDone`, `apiDone`, `drawDone`) coordinate the race between API response and user finishing cut/draw steps.
- **CSS animations only**: Flip (`rotateY(180deg)` with `perspective: 1000px`), shuffle (3 sets of keyframes), cut (cubic-bezier bounce), fadeIn. No JS animation libraries.
- **Card interpretation**: Each card has pre-authored `interpretation.{up,down}` with sections: coreMeaning, love, career, finance, health, advice. ResultPage conditionally shows sections based on questionType.
- **Tailwind custom theme**: `mystic-bg`, `mystic-card`, `mystic-gold`, `mystic-text`, `mystic-accent` via tailwind.config.js.
- **Spread types**: `single` (1 card) and `three-card` (past/present/future). Draw logic: shuffle array → slice N → assign random position (up/down, 50/50).
- **AI reading**: Server calls deepseek-v4-flash via OpenAI-compatible API (`OPENCODE_API_KEY` + `OPENCODE_BASE_URL` in .env). Falls back to template reading if API unavailable or fails. Template reading is also the client-side offline fallback.

### Data Flow

1. AskPage collects `{questionType, question, spreadType}`
2. App calls `createReading()` in api.ts (fires immediately, runs in background)
3. User progresses through ShufflePage → CutPage → DrawPage while API call is in-flight
4. `createReading()` tries POST /api/readings:
   - **Online**: server draws cards → calls aiReading() (or templateReading() on failure) → stores in SQLite → returns Reading with readingResult
   - **Offline**: client draws from local cards.json → generateLocalReading() → saves to localStorage → returns LocalReading
5. Once both apiDone and drawDone flags are true, navigate to ResultPage
6. ResultPage shows cards one by one (click to flip → reveal interpretation)
7. "查看完整解读" → ReadingResultPage (parses `### ` sections from readingResult, polls /api/readings/:id if result is still empty)
8. HistoryPage merges server readings + localStorage readings
