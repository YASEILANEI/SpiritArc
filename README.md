<p align="center">
  <h1 align="center">SpiritArc · 牌灵占卜</h1>
  <p align="center">A modern tarot reading web app with AI-powered interpretations</p>
  <p align="center">
    <strong>English</strong> · <a href="README.zh-CN.md">中文</a>
  </p>
  <p align="center">
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#quick-start">Quick Start</a> •
    <a href="#project-structure">Structure</a> •
    <a href="#api-overview">API</a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white" alt="TypeScript 7" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="TailwindCSS 3" />
  <img src="https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/Postgres-336791?logo=postgresql&logoColor=white" alt="Postgres" />
  <img src="https://img.shields.io/badge/JWT-auth-orange?logo=jsonwebtokens&logoColor=white" alt="JWT" />
</p>

---

SpiritArc is a complete tarot reading web application with a dark, mystical UI. Users draw cards from the 78-card Rider-Waite-Smith tarot deck, receive template-based interpretations instantly, and can optionally upgrade to AI-powered readings via the deepseek-v4-flash model. The app supports offline-first usage, user authentication, subscription tiers, and a full admin panel.

## Features

- **78-card Rider-Waite-Smith deck** — both single-card and three-card (past/present/future) spreads
- **AI-powered interpretations** — click "AI 塔罗牌灵解读" to upgrade any reading; powered by deepseek-v4-flash via OpenAI-compatible API
- **Spirit chat** — multi-turn follow-up with the AI spirit around your spread; the spirit is voiced by the whole spread, supports copy and up/down feedback, and wipes the conversation on exit (private burn-after-reading)
- **Recent updates** — homepage changelog section plus a fixed top banner highlighting the latest feature, so users always know what's new
- **Offline-first** — unauthenticated users can create readings stored in localStorage, then migrate to server after registration
- **Immersive reading flow** — animated shuffle, cut, and card-draw steps with pure CSS animations (no JS animation libraries)
- **Card flip to reveal** — tap each card to see its interpretation with a CSS 3D flip animation
- **User authentication** — dual-token JWT (15min access + 7d refresh with rotation), email/phone registration
- **Privacy by default** — readings are private; only the owner can view them (no public sharing)
- **Subscription tiers** — free (3 AI readings/week), premium (100/month), admin (unlimited)
- **Admin panel** — dashboard with stats, user management, reading management, AI settings configuration
- **Responsive design** — mobile-first with TailwindCSS custom dark theme
- **Chinese language UI** — full Chinese interface

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 7, Vite 8, TailwindCSS 3 |
| Backend | Express 5, TypeScript, Neon Postgres (postgres.js) |
| Auth | Dual-token JWT (access + refresh with rotation), bcryptjs |
| AI | OpenAI-compatible API via deepseek-v4-flash |
| Animations | Pure CSS (rotateY flip, keyframe shuffle, cubic-bezier bounce cut) |
| Routing | URL-driven routing (history API), no React Router |

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/YASEILANEI/-SpiritArc.git
cd -SpiritArc

# Install client dependencies
cd client && npm install

# Install server dependencies
cd ../server && npm install

# (Optional) Set up environment variables
cp .env.example server/.env
```

### Development

Both client and server must run simultaneously. The Vite dev server proxies `/api` requests to `localhost:3001`.

```bash
# Terminal 1 — Server (Express, port 3001)
cd server
npm run dev

# Terminal 2 — Client (Vite, port 5173)
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

### Production Build

```bash
# Build client
cd client && npm run build

# Build server
cd ../server && npm run build

# Run server (serves static client files in production)
cd ../server && npm start
```

## Environment Variables

Create `server/.env`. **`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` are required — the server throws at startup if any is missing.**

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Neon Postgres connection string | — |
| `JWT_SECRET` | Access token signing secret | — |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | — |
| `ADMIN_EMAIL` | Auto-seeded admin email on first run | — |
| `ADMIN_PASSWORD` | Auto-seeded admin password | — |
| `OPENCODE_API_KEY` | API key for AI readings (env-only, not stored in DB) | — |
| `OPENCODE_BASE_URL` | API base URL for AI provider | `https://opencode.ai/zen/go/v1` |
| `NODE_ENV` | Environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origin (production, required) | — |

AI configuration can also be managed at runtime via the admin panel **Settings** page.

## Project Structure

```
├── client/                    # React SPA (Vite + TailwindCSS + TypeScript)
│   └── src/
│       ├── components/        # NavBar, BackButton, PageContainer
│       ├── contexts/          # AuthContext (JWT management)
│       ├── pages/             # Page components (URL-driven routing)
│       ├── utils/             # reading-generator (offline fallback)
│       ├── data/              # cards.json (78-card dataset), recent-updates.ts (changelog)
│       └── api/               # auth helpers (refresh, logout)
│
├── server/                    # Express REST API (Neon Postgres + TypeScript)
│   └── src/
│       ├── db/                # Schema creation, settings, admin seeding (runs at startup)
│       ├── middleware/        # JWT auth, role-based authorization
│       ├── routes/            # auth, cards, readings, spirit chat, feedback, admin
│       ├── services/          # ai-reading/ai-chat, template-reading
│       ├── utils/             # JWT helpers
│       └── data/              # cards.json
│
├── generate-cards.mjs         # Cards JSON generator
└── download-images.sh         # Rider-Waite-Smith image downloader
```

### Reading Flow

```
home → ask → shuffle → cut → draw → analyzing → result → reading-result → spirit chat
  ↑                                                                         |
  +------------------------------- history ---------------------------------+
  |
  ├── login → register (auth)
  ├── profile, about, support
  └── admin, admin-settings, admin-users, admin-readings
```

## API Overview

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/auth/register` | Register | — |
| POST | `/api/auth/login` | Login | — |
| POST | `/api/auth/refresh` | Refresh tokens | Cookie |
| POST | `/api/auth/logout` | Logout | Cookie |
| GET | `/api/auth/me` | Current user | Bearer |
| GET | `/api/cards` | List all 78 cards | — |
| GET | `/api/cards/:id` | Single card details | — |
| POST | `/api/readings` | Create reading (draw + template) | Bearer |
| GET | `/api/readings` | List user readings | Bearer |
| GET | `/api/readings/:id` | Get single reading (owner only) | Bearer |
| POST | `/api/readings/:id/ai-reading` | Upgrade to AI interpretation | Bearer |
| POST | `/api/readings/batch-sync` | Migrate local readings | Bearer |
| POST | `/api/chat/conversations` | Create/get spirit chat conversation | Bearer |
| GET | `/api/chat/conversations/:id` | Get conversation + messages | Bearer |
| GET | `/api/promo/first100` | First-100 promo remaining slots | — |
| POST | `/api/chat/conversations/:id/messages` | Send a chat message | Bearer |
| DELETE | `/api/chat/conversations/:id` | Delete conversation (exit-to-burn) | Bearer |
| GET | `/api/profile` | User profile | Bearer |
| GET | `/api/profile/subscription` | Quota info | Bearer |
| GET | `/api/admin/stats` | Dashboard stats | Admin |
| GET/PUT | `/api/admin/settings` | AI config | Admin |

## Card Imagery

This project uses the **Rider-Waite-Smith** tarot deck, whose artwork by Pamela Colman Smith (1878–1951) is in the **public domain** worldwide. Card images can be downloaded using `download-images.sh`, which fetches them from public domain repositories.

## License

This project is licensed under the MIT License. The Rider-Waite-Smith card imagery is in the public domain.
