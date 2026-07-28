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

## Environment Variables

Create `server/.env` (optional in dev, all vars have safe defaults):

```bash
# JWT secrets (required in production)
JWT_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Admin auto-seed on first run
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# AI reading API (also configurable via admin panel > settings)
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1

# Production
NODE_ENV=production
CLIENT_URL=https://your-domain.com
```

## Architecture

Monorepo with two packages:

```
client/     React SPA (Vite + TailwindCSS + TypeScript)
server/     Express REST API (better-sqlite3 + TypeScript)
```

### Client Structure

```
client/src/
  contexts/
    AuthContext.tsx       Auth state, JWT management, session auto-restore
  components/
    NavBar.tsx            Top navigation bar (brand, nav links, auth toggle)
    BackButton.tsx        Reusable back navigation
    PageContainer.tsx     Layout wrapper (centered, max-w-lg)
  pages/
    HomePage.tsx          Landing page with start/history buttons
    AskPage.tsx           Question type, spread type, free-text input
    ShufflePage.tsx       Shuffle animation with cycling card names (1.5s)
    CutPage.tsx           Cut animation with interaction (1.2s)
    DrawPage.tsx          Tap to select cards from 78-card grid
    ResultPage.tsx        Flip-to-reveal cards, template/AI choice modal
    ReadingResultPage.tsx Parsed markdown reading display, polls if AI pending
    HistoryPage.tsx       Paginated reading list, batch hide/delete
    LoginPage.tsx         Email/phone + password login
    RegisterPage.tsx      Registration form
    ProfilePage.tsx       Display name, subscription info, logout
    AboutPage.tsx         Personal intro of the developer
    AboutProductPage.tsx  Product info (origin, philosophy, features, credits)
    SupportPage.tsx       Donation page with expandable WeChat/Alipay QR codes
    AdminPage.tsx         Dashboard with stats + module links
    AdminSettingsPage.tsx AI model/key config
    AdminUsersPage.tsx    User management table
    AdminReadingsPage.tsx All-readings table
  api.ts                  Server API client + offline localStorage fallback
  api/auth.ts             Refresh and logout endpoints
  types.ts                TarotCard, DrawnCard, Reading, LocalReading, User, etc.
  utils/
    reading-generator.ts  Client-side template reading generator (offline fallback)
  data/                   Static 78-card JSON (identical copy on server)
```

### Server Structure

```
server/src/
  index.ts                Express app, CORS, JSON body parser, port 3001
  db/index.ts             SQLite init, schema migrations, admin seeding
  middleware/
    auth.ts               JWT verification + role-based authorization
  routes/
    readings.ts           CRUD readings, draw cards, batch ops, AI upgrade
    cards.ts              GET /api/cards (list all / get by id)
    auth.ts               Register/login/refresh/logout/me
    admin.ts              Stats, user/reading CRUD, settings (admin-only)
    profile.ts            User profile + subscription/quota
  services/
    ai-reading.ts         AI reading via OpenAI-compatible API (deepseek-v4-flash)
    template-reading.ts   Fallback template reading from card interpretation data
  utils/
    jwt.ts                Access token (15min) + refresh token (7d) helpers
  data/                   cards.json + tarot.db (SQLite, auto-created)
```

### Page State Machine

App.tsx uses `useState<Page>` (no React Router) with 19 states. The `analyzing` page is rendered inline in App.tsx (spinner, no separate page component). `login` and `register` are actual page components.

```
reading flow:  home → ask → shuffle → cut → draw → analyzing → result → reading-result
               ↑                                                           |
               +--------------------------- history ------------------------+
               |
               +--- login → register (auth flow)
               |
               +--- profile, about, about-product, support

admin pages:   admin, admin-settings, admin-users, admin-readings
```

Key behaviors:
- `handleStart()` routes to `login` if unauthenticated, otherwise `ask`
- NavBar rendered only on `{home, history, profile, about, about-product, support, result, reading-result}`; reading flow pages intentionally hide it for immersion
- Admin pages show "unauthorized" unless `user.role === 'admin'`
- Unauthenticated users can still create offline readings (localStorage fallback)

### Auth System

- **Dual-token JWT**: access token (15min, Bearer header) + refresh token (7d, httpOnly cookie, path `/api/auth`)
- **Token rotation**: on refresh, old refresh token is deleted from DB and a new one is issued
- **`AuthContext`**: manages `{user, accessToken, isAuthenticated, isLoading}`; auto-restores session on mount via `POST /api/auth/refresh`
- **`apiFetch()` wrapper** in `api.ts`: auto-attaches Bearer header; on 401, acquires a mutex (`_refreshPromise`) to prevent concurrent refresh storms, retries once on success, calls `_onAuthExpired` on failure
- Guest flow: unauthenticated users can start the app, create local readings, and later migrate readings to server via `POST /api/readings/batch-sync`

### Database Schema (SQLite via better-sqlite3, WAL mode)

**`users`**: id, email (UNIQUE, nullable), phone (UNIQUE, nullable), password_hash, display_name, avatar_url, auth_provider (default `'local'`), role (`free`|`premium`|`admin`), created_at, updated_at

**`refresh_tokens`**: id, user_id (FK), token (UNIQUE), expires_at, created_at

**`readings`**: id, question_type, question, cards (JSON), spread_type, reading_result, reading_source (`template`|`ai`), user_id (FK), is_public, created_at, deleted_at (soft delete), hidden_at

**`settings`** (key-value): key (PK), value, updated_at. Defaults: OPENCODE_API_KEY, OPENCODE_BASE_URL, AI_MODEL (`deepseek-v4-flash`), AI_MAX_TOKENS (`4000`)

Migration pattern: uses `pragma_table_info` detection to gradually add columns — no migration framework.

### Key Design Decisions

- **Offline-first**: `api.ts` catches fetch errors and falls back to localStorage. Local readings use ISO timestamps as IDs with `local_` prefix.
- **Dual JSON**: `cards.json` lives in both client and server — client uses it for local draws, server for API draws. Keep in sync.
- **Concurrent API + animation**: `createReading()` fires during ShufflePage. Three `useRef` flags (`shuffleDone`, `apiDone`, `drawDone`) coordinate the race between API response and user finishing cut/draw steps.
- **CSS animations only**: Flip (`rotateY(180deg)` with `perspective: 1000px`), shuffle (3 sets of keyframes), cut (cubic-bezier bounce), fadeIn. No JS animation libraries.
- **Card interpretation**: Each card has pre-authored `interpretation.{up,down}` with sections: coreMeaning, love, career, finance, health, advice. ResultPage conditionally shows sections based on questionType.
- **Tailwind custom theme**: `mystic-bg`, `mystic-card`, `mystic-gold`, `mystic-text`, `mystic-accent` via tailwind.config.js.
- **Spread types**: `single` (1 card) and `three-card` (past/present/future). Draw logic: Fisher-Yates shuffle array → slice N → assign random position (up/down, 50/50).
- **AI reading**: Server calls deepseek-v4-flash via OpenAI-compatible API (`OPENCODE_API_KEY` + `OPENCODE_BASE_URL` in .env or DB settings). Falls back to template reading if API unavailable.
- **Reading upgrade flow**: readings are created with template text by default. User can request AI upgrade via `POST /api/readings/:id/ai-reading` — route checks quota, calls `aiReading()`, returns 502 on failure.
- **Subscription tiers**: `free` (3 AI readings/week), `premium` (100/month), `admin` (unlimited). Quota tracked via `COUNT` queries with date range filtering in route layer.
- **Soft delete**: readings have `deleted_at` (user-deleted) and `hidden_at` (user-hidden). Admin sees all. Hard delete only via admin API.

### Data Flow

1. AskPage collects `{questionType, question, spreadType}`
2. App calls `createReading()` in api.ts (fires immediately, runs in background)
3. User progresses through ShufflePage → CutPage → DrawPage while API call is in-flight
4. `createReading()` tries POST /api/readings:
   - **Online**: server draws cards → calls templateReading() → stores in SQLite → returns Reading with readingResult (template source)
   - **Offline**: client draws from local cards.json → generateLocalReading() → saves to localStorage → returns LocalReading
5. Once both `apiDone` and `drawDone` flags are true, navigate to ResultPage via `analyzing` page
6. ResultPage shows cards one by one (click to flip → reveal interpretation)
7. User can choose "AI 塔罗牌灵解读" (upgrade to AI) or "查看完整解读" (view template) — AI upgrade calls `POST /api/readings/:id/ai-reading`
8. ReadingResultPage parses `### ` sections from readingResult, polls `/api/readings/:id` every 2s if result is still empty
9. HistoryPage merges server readings + localStorage readings, supports batch hide/delete

### Admin API

All routes under `/api/admin`, require `role === 'admin'`:
- `GET /api/admin/stats` — total users, readings, today's readings, active users, AI vs template counts
- `GET|PUT /api/admin/users[/:id]` — paginated user list with search, role change, hard delete
- `GET|POST /api/admin/readings[/:id]` — all readings including deleted/hidden, hard delete
- `GET|PUT /api/admin/settings` — AI config (OPENCODE_API_KEY, OPENCODE_BASE_URL, AI_MODEL, AI_MAX_TOKENS)

### Batch Operations

- `POST /api/readings/batch-sync` — push local readings to server after login
- `POST /api/readings/batch-delete` — soft delete multiple readings
- `POST /api/readings/batch-hide` / `batch-unhide` — toggle visibility
