# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Root — orchestrates both packages
npm run build  # client build → server build (both with --include=dev)
npm run start  # node server/dist/index.js
npm run dev    # server dev only

# Client (React + Vite)
cd client && npm run dev     # dev server on :5173 (proxies /api → :3001)
cd client && npm run build   # tsc + vite build → client/dist
cd client && npm run preview # preview production build

# Server (Express + Neon Postgres)
cd server && npm run dev     # dev with tsx watch on :3001
cd server && npm run build   # tsc + copies src/data/cards.json → dist/data
cd server && npm start       # node dist/index.js (serves client/dist in prod)
```

Both must run simultaneously in dev. Vite proxies `/api` to `localhost:3001`. There is no test suite and no linter configured.

## Environment Variables

Create `server/.env` and copy `server/.env.example`. **`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` are required — the server throws at startup if any is missing** (no safe defaults). The DB is remote (Neon), so there is no local-dev fallback.

```bash
# Neon Postgres connection (required). Dev uses the dev branch, prod uses main.
DATABASE_URL=postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/spiritarc
PG_SCHEMA=public

# JWT secrets (required, generate with: openssl rand -base64 48)
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Admin auto-seed on first run (idempotent; upgrades existing user to admin)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# AI reading API — API key is env-only, NOT stored in the DB
OPENCODE_API_KEY=sk-xxx
OPENCODE_BASE_URL=https://opencode.ai/zen/go/v1

# Runtime
NODE_ENV=development   # 'production' enables static client serving + secure cookies
PORT=3001
CORS_ORIGIN=http://localhost:5173   # REQUIRED in production or server throws; comma-separated allowed origins
```

## Architecture

Monorepo with two packages. The server is **ESM** (`"type": "module"`) — all relative imports use explicit `.js` extensions and new files must use ESM syntax.

```
client/     React SPA (Vite + TailwindCSS + TypeScript, CommonJS)
server/     Express REST API (postgres.js + TypeScript, ESM)
```

### Server Structure

```
server/src/
  index.ts                Express app: helmet CSP, CORS, cookieParser, trust proxy, /health, route mount, prod static serving
  db/index.ts             postgres.js client + schema creation + settings/admin seeding (runs at import)
  middleware/
    auth.ts               authMiddleware (Bearer), optionalAuth, requireRole
  routes/
    readings.ts           CRUD readings, draw cards, batch ops, AI upgrade (quota checks)
    cards.ts              GET /api/cards (list all / get by id)
    auth.ts               Register/login/refresh/logout/me
    admin.ts              Stats, user/reading CRUD, settings, feedback (admin-only)
    profile.ts            Profile + subscription/quota
    feedback.ts           User feedback submit/list/unread + rate limiting
  services/
    ai-reading.ts         AI reading via OpenAI-compatible API (deepseek-v4-flash)
    template-reading.ts   Fallback template reading from card interpretation data
  utils/
    jwt.ts                Access token (15min) + refresh token (7d) helpers
  data/                   cards.json (read via fs at module load in cards.ts & readings.ts)
```

### Database (Neon Postgres via `postgres.js`)

`db/index.ts` exports the `sql` tagged-template client (`postgres(url, { ssl: 'require' })`) and **creates the schema on startup with `CREATE TABLE IF NOT EXISTS`** — there is no migration framework. All queries in routes/services are async tagged templates (`await sql\`SELECT ...\``); transactions use `sql.begin(tx => ...)`; array params use `sql(ids)`.

**`users`**: id (SERIAL PK), email (TEXT UNIQUE, nullable), phone (TEXT UNIQUE, nullable), password_hash, display_name, avatar_url, auth_provider (default `'local'`), auth_provider_id, role (`free`|`premium`|`admin`), accepted_terms_version, accepted_terms_at, created_at (TIMESTAMPTZ), updated_at

**`refresh_tokens`**: id, user_id (FK), token (TEXT UNIQUE), expires_at (TIMESTAMPTZ), created_at

**`readings`**: id, question_type, question, cards (TEXT JSON), spread_type, reading_result, reading_source (`template`|`ai`), user_id (FK), is_public (SMALLINT 1/0), created_at, deleted_at (soft delete), hidden_at. Indexes on user_id, created_at, reading_source. No FK ON DELETE CASCADE — hard-deleting a user manually deletes their tokens + readings + feedback first (see admin route).

**`feedback`**: id, user_id (FK NOT NULL), reading_id (FK, `ON DELETE SET NULL`), content (TEXT), reply (TEXT), status (`open`|`processed`), replied_at, user_seen_at, created_at. Partial index on `(user_id) WHERE reply IS NOT NULL AND user_seen_at IS NULL` powers the unread-reply check. Admin hard-delete of a user deletes their feedback rows explicitly.

**`settings`** (key-value): key (PK), value, updated_at. Startup-seeded with `ON CONFLICT DO NOTHING` so admin edits persist. Stored keys: OPENCODE_BASE_URL, AI_MODEL (`deepseek-v4-flash`), AI_MAX_TOKENS (`4000`). **OPENCODE_API_KEY is intentionally not stored in the DB** — `ai-reading.ts` reads it from `process.env` only; the admin settings route filters it out and the admin UI has no field for it.

Startup also deletes expired refresh tokens and idempotently seeds/upgrades the admin account from `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

### Key Server Behaviors

- **Auth middleware**: `authMiddleware` verifies Bearer token into `req.user`. `requireRole(...roles)` wraps auth and, for tokens issued before the `role` claim existed, falls back to querying the user's current role from the DB.
- **Registration**: `POST /api/auth/register` requires `acceptedTerms === true` and enforces password strength (≥8 chars, ≥1 uppercase, ≥1 digit) server-side. Stores `accepted_terms_version`/`accepted_terms_at` on the user. The `users` table columns are added via `ALTER TABLE ... IF NOT EXISTS` at startup (same pattern as the feedback columns).
- **Feedback**: `POST /api/feedback` (auth) is rate-limited per **user** via `keyGenerator: req.user.userId` (10/15min) — not per IP, because `index.ts` sets `trust proxy: 1` for Render. Associating a reading validates ownership + `deleted_at IS NULL`. `GET /api/feedback/unread` returns replies with `reply IS NOT NULL AND user_seen_at IS NULL`; `POST /api/feedback/read-all` marks them seen. Reverting a feedback to `open` in the admin route clears `reply`/`replied_at` so old replies can't re-surface as unread.
- **Readings creation**: `POST /api/readings` requires auth. Draws via Fisher-Yates on the 78 cards, stores only the drawn metadata (cardId/position/spreadPosition) as JSON in `cards`, and always uses `templateReading()` at creation. The AI upgrade endpoint reconstructs full card objects from that JSON before calling `aiReading()`.
- **`GET /api/readings/options`**: lightweight list (id/question/seq) of the caller's own non-deleted readings for the feedback association dropdown. Must stay registered before `GET /:id` so `/options` isn't swallowed by the id param.
- **Numeric `:id` validation**: `router.param('id')` in readings.ts and admin.ts rejects non-numeric ids with 400 — a bare `Number('abc')` → `NaN` would otherwise propagate into the SQL params and 500.
- **AI reading**: `aiReading()` builds a Chinese prompt, calls `{OPENCODE_BASE_URL}/chat/completions` (30s timeout), strips markdown italics/lists but keeps `### ` headers, and returns `null` on any failure (route responds 502). Settings are read DB-first with env fallback, except the API key.
- **Production mode** (`NODE_ENV=production`): serves `client/dist` statically and falls back to `index.html` for non-`/api` GETs (Express 5 middleware, not a wildcard route). Requires `CORS_ORIGIN`.
- **Quota**: free = 3 AI readings/week, premium = 100/month, admin unlimited — enforced via `COUNT(*)::int` queries filtered by `reading_source = 'ai'` and a date window.
- **Soft delete vs hide**: `deleted_at` = user-deleted (kept for stats), `hidden_at` = user-hidden from own list; admins see everything. Hard delete only via admin API.

### Client

```
client/src/
  contexts/AuthContext.tsx       Auth state, JWT management, session auto-restore
  components/                    NavBar (dropdown), BackButton, PageContainer, FeedbackReplyModal, LegalModal
  pages/                         Page components (analyzing rendered inline in App.tsx); FeedbackPage, AdminFeedbackPage
  router.ts                      usePageRouter: URL-driven routing via history API (parsePath/buildPath)
  reading-store.ts               Current-reading persistence + restore (sessionStorage → API fallback)
  api.ts                         apiFetch wrapper + offline localStorage fallback
  api/auth.ts                    Refresh and logout endpoints
  utils/reading-generator.ts     Client-side template reading generator (offline fallback)
  data/cards.json                Static 78-card JSON (identical copy on server — keep in sync)
  types.ts                       TarotCard, DrawnCard, Reading, LocalReading, User, etc.
```

`api.ts`'s `apiFetch()` auto-attaches the Bearer header, and on 401 acquires a mutex (`_refreshPromise`) to prevent concurrent refresh storms, retries once, then calls `_onAuthExpired`. `createReading()` falls back to localStorage **only on network errors** — a server rejection (e.g. quota exceeded) surfaces the error instead of silently creating a local reading.

### Page Routing

App.tsx uses `usePageRouter()` from `router.ts` (history API + `pushState`, no React Router) instead of a `useState<Page>` state machine. The URL drives which page renders; browser back/forward works via a `popstate` listener. Static pages map 1:1 to paths (`/`, `/ask`, `/history`, `/login`, `/profile`, `/about`, `/about-product`, `/support`, `/feedback`, `/admin`, `/admin/settings`, `/admin/users`, `/admin/readings`, `/admin/feedback`); result pages carry the id in the URL (`/result/:id`, `/reading-result/:id`).

```
reading flow:  home → ask → shuffle → cut → draw → analyzing → result → reading-result
               ↑                                                           |
               +--------------------------- history ------------------------+
               |
               +--- login → register (auth flow)
               |
               +--- profile, feedback, about, about-product, support

admin pages:   admin, admin-settings, admin-users, admin-readings, admin-feedback
```

Key behaviors:
- `handleStart()` routes to `login` if unauthenticated, otherwise `ask`
- Flow pages (`shuffle`/`cut`/`draw`/`analyzing`) navigate with `replace: true` so they never enter history; direct URL entry to one normalizes back to `/` because flow state is lost
- `result`/`reading-result` survive refresh: App restores the reading via `reading-store.ts` (sessionStorage first, then `fetchReadingById` → API for server ids / localStorage for `local_` ids); an unrecoverable id normalizes to home
- NavBar rendered only on `{home, history, profile, feedback, about, about-product, support, result, reading-result}`; reading flow pages intentionally hide it for immersion
- On login App fetches `/feedback/unread` once and shows a `FeedbackReplyModal` if the admin has replied; the red NavBar badge on 意见反馈 stays until the user explicitly reads all. Viewing a reply's linked reading does **not** auto-mark-read.
- Admin pages show "unauthorized" unless `user.role === 'admin'`
- Unauthenticated users can still create offline readings (localStorage fallback); after login `migrateLocalReadings()` pushes them via `POST /api/readings/batch-sync`

### Auth System

- **Dual-token JWT**: access token (15min, Bearer header) + refresh token (7d, httpOnly cookie `refreshToken`, path `/api/auth`, secure in prod). Cookies require `credentials: 'include'` on every fetch.
- **Token rotation**: on refresh, the old refresh token is deleted from DB and a new one issued.
- **`AuthContext`**: manages `{user, accessToken, isAuthenticated, isLoading}`; auto-restores session on mount via `POST /api/auth/refresh`.
- **Terms of service**: registration requires an `acceptedTerms` flag (client shows a `LegalModal` with 用户协议/隐私政策 before the checkbox can be checked). Enforced server-side; there is no re-consent flow for existing users yet.

### AI Settings Flow

Admin settings page edits OPENCODE_BASE_URL, AI_MODEL, AI_MAX_TOKENS in the DB. OPENCODE_API_KEY is configured only via `server/.env` (or Render env vars). When the AI call runs, base URL/model/max tokens resolve DB-first (falling back to env), while the API key comes strictly from env.

### Data Flow

1. AskPage collects `{questionType, question, spreadType}`
2. App calls `createReading()` in api.ts (fires immediately, runs in background)
3. User progresses through ShufflePage → CutPage → DrawPage while API call is in-flight
4. `createReading()` tries POST /api/readings:
   - **Online**: server draws cards → templateReading() → stores in Postgres → returns Reading with template readingResult
   - **Offline** (network error only): client draws from local cards.json → generateLocalReading() → saves to localStorage → returns LocalReading
5. Once both `apiDone` and `drawDone` flags are true, navigate to ResultPage via `analyzing` page
6. ResultPage shows cards one by one (click to flip → reveal interpretation)
7. User can choose "AI 塔罗牌灵解读" (upgrade to AI) or "查看完整解读" (view template) — AI upgrade calls `POST /api/readings/:id/ai-reading`
8. ReadingResultPage parses `### ` sections from readingResult, polls `/api/readings/:id` every 2s if result is still empty
9. HistoryPage merges server readings + localStorage readings, supports batch hide/delete

### Key Design Decisions

- **Offline-first**: `api.ts` catches fetch errors and falls back to localStorage. Local readings use ISO timestamps as IDs with `local_` prefix.
- **Dual JSON**: `cards.json` lives in both client and server — client uses it for local draws, server for API draws. Keep in sync.
- **Concurrent API + animation**: `createReading()` fires during ShufflePage. Three `useRef` flags (`shuffleDone`, `apiDone`, `drawDone`) coordinate the race between API response and user finishing cut/draw steps.
- **CSS animations only**: Flip (`rotateY(180deg)` with `perspective: 1000px`), shuffle (3 sets of keyframes), cut (cubic-bezier bounce), fadeIn. No JS animation libraries.
- **Card interpretation**: Each card has pre-authored `interpretation.{up,down}` with sections: coreMeaning, love, career, finance, health, advice. ResultPage conditionally shows sections based on questionType.
- **Tailwind custom theme**: `mystic-bg`, `mystic-card`, `mystic-gold`, `mystic-text`, `mystic-accent` via tailwind.config.js.
- **Spread types**: `single` (1 card) and `three-card` (past/present/future). Draw logic: Fisher-Yates shuffle array → slice N → assign random position (up/down, 50/50).
- **Subscription tiers**: `free` (3 AI readings/week), `premium` (100/month), `admin` (unlimited). Quota tracked via `COUNT` queries with date range filtering in route layer.

### Admin API

All routes under `/api/admin`, require `role === 'admin'`:
- `GET /api/admin/stats` — total users, readings, today's readings, active users, AI vs template counts
- `GET /api/admin/users` (paginated + search) | `GET|PUT|DELETE /api/admin/users/:id` (role change, hard delete)
- `GET|DELETE /api/admin/readings[/:id]` — all readings including deleted/hidden, hard delete
- `GET /api/admin/feedback` (paginated + status filter) | `PUT /:id/reply` | `PUT /:id/status` (revert to open clears reply) | `DELETE /:id`
- `GET|PUT /api/admin/settings` — AI config (OPENCODE_BASE_URL, AI_MODEL, AI_MAX_TOKENS; API key is env-only)

### Batch Operations

- `POST /api/readings/batch-sync` — push local readings to server after login (wrapped in a transaction)
- `POST /api/readings/batch-delete` — soft delete multiple own readings
- `POST /api/readings/batch-hide` / `batch-unhide` — toggle visibility of own readings
