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
  pages/      Page components (Home → Ask → Shuffle → Result → History)
  api.ts      Server API client + offline localStorage fallback
  types.ts    TarotCard, DrawnCard, Reading, LocalReading
  data/       Static 78-card JSON (identical copy on server)
```

Page flow is linear: Home → Ask → Shuffle → Result. History is accessible from Home.

### Server Structure
```
server/src/
  index.ts        Express app, CORS, JSON body parser
  db/index.ts     SQLite init (readings table)
  routes/
    readings.ts   POST/GET readings (draw cards, format response)
    cards.ts      GET /api/cards (list all / get by id)
```

### Key Design Decisions

- **Offline-first**: `api.ts` catches fetch errors and falls back to localStorage. Local readings use ISO timestamps as IDs with `local_` prefix.
- **Dual JSON**: `cards.json` lives in both client and server — client uses it for local draws, server for API draws. Keep in sync.
- **Flip animation**: CSS 3D transforms (`rotateY(180deg)`) with `perspective: 1000px`. No JS animation libraries.
- **Card interpretation**: Each card has pre-authored `interpretation.{up,down}` with sections for coreMeaning, love, career, finance, health, advice. ResultPage conditionally shows sections based on questionType.
- **Tailwind custom theme**: `mystic-bg`, `mystic-card`, `mystic-gold`, `mystic-text` colors via tailwind.config.js.
- **Spread types**: `single` (1 card) and `three-card` (past/present/future). Draw logic: shuffle array → slice N → assign random position (up/down).

### Data Flow

1. AskPage collects `{questionType, question, spreadType}`
2. App calls `createReading()` in api.ts → tries POST /api/readings
3. On success: server draws cards, stores in SQLite, returns Reading
4. On failure: client draws from local cards.json, saves to localStorage, returns LocalReading
5. ShufflePage plays 2.5s animation while API call is in-flight (parallel)
6. ResultPage shows cards one by one (click to flip → reveal interpretation)
7. HistoryPage merges server readings + localStorage readings
