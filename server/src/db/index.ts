import postgres from 'postgres'
import bcrypt from 'bcryptjs'

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL must be set in environment variables')
}

// Neon requires TLS
const sql = postgres(url, { ssl: 'require' })

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT,
    avatar_url TEXT,
    auth_provider TEXT DEFAULT 'local',
    auth_provider_id TEXT,
    role TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS readings (
    id SERIAL PRIMARY KEY,
    question_type TEXT,
    question TEXT,
    cards TEXT NOT NULL,
    spread_type TEXT DEFAULT 'single',
    reading_result TEXT,
    reading_source TEXT DEFAULT 'template',
    user_id INTEGER REFERENCES users(id),
    is_public SMALLINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    hidden_at TIMESTAMPTZ
  )
`

// Create indexes for performance
await sql`CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id)`
await sql`CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at)`
await sql`CREATE INDEX IF NOT EXISTS idx_readings_source ON readings(reading_source)`

// Settings table for admin-configurable options
await sql`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
  )
`

// User feedback table
await sql`
  CREATE TABLE IF NOT EXISTS feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    reading_id INTEGER REFERENCES readings(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    reply TEXT,
    status TEXT DEFAULT 'open',
    replied_at TIMESTAMPTZ,
    user_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
  )
`

// Tarot spirit chat tables
// ON DELETE CASCADE: burning a conversation (or an admin hard-deleting a reading
// / user) must not trip an FK violation in the delete paths.
await sql`
  CREATE TABLE IF NOT EXISTS chat_conversations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_id INTEGER NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, reading_id)
  )
`
await sql`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
  )
`
await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at)`
await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages(conversation_id, role, created_at)`
await sql`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS user_rating TEXT`

// chat_conversations may already exist (from an earlier deploy) without the
// cascade FK actions, which made admin hard-deletes fail with an FK violation.
// Rebuild the constraints only when they aren't cascade yet, so startup doesn't
// churn constraint metadata on every boot for already-fixed databases.
const userFk = (await sql`SELECT confdeltype FROM pg_constraint WHERE conname = 'chat_conversations_user_id_fkey' AND conrelid = 'chat_conversations'::regclass`)[0] as { confdeltype: string } | undefined
if (userFk?.confdeltype !== 'c') {
  await sql`ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_user_id_fkey`
  await sql`ALTER TABLE chat_conversations ADD CONSTRAINT chat_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
}
const readingFk = (await sql`SELECT confdeltype FROM pg_constraint WHERE conname = 'chat_conversations_reading_id_fkey' AND conrelid = 'chat_conversations'::regclass`)[0] as { confdeltype: string } | undefined
if (readingFk?.confdeltype !== 'c') {
  await sql`ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_reading_id_fkey`
  await sql`ALTER TABLE chat_conversations ADD CONSTRAINT chat_conversations_reading_id_fkey FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE`
}

// Weekly spirit-chat quota counter. Lives independently of chat_messages so that
// burning a conversation (hard delete + CASCADE) can't refund already-used quota.
await sql`
  CREATE TABLE IF NOT EXISTS chat_usage (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    week_start DATE NOT NULL,
    sent_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, week_start)
  )
`

// Column additions for existing tables (CREATE IF NOT EXISTS won't add columns)
await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reply TEXT`
await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ`
await sql`ALTER TABLE feedback ADD COLUMN IF NOT EXISTS user_seen_at TIMESTAMPTZ`
await sql`CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status)`
await sql`CREATE INDEX IF NOT EXISTS idx_feedback_unread ON feedback(user_id) WHERE reply IS NOT NULL AND user_seen_at IS NULL`
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_version TEXT`
await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ`
// Seed default settings (preserve any admin-modified values)
const defaultSettings: [string, string][] = [
  ['OPENCODE_BASE_URL', process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1'],
  ['AI_MODEL', 'deepseek-v4-flash'],
  ['AI_MAX_TOKENS', '4000'],
  ['PROMO_FIRST_100_TAKEN', '0'], // 前 100 名注册活动已发放的 premium 名额
]
for (const [key, value] of defaultSettings) {
  await sql`INSERT INTO settings (key, value) VALUES (${key}, ${value}) ON CONFLICT (key) DO NOTHING`
}

// Clean up expired refresh tokens on startup
const cleaned = await sql`DELETE FROM refresh_tokens WHERE expires_at <= now()`
if (cleaned.count > 0) {
  console.log(`🧹 Cleaned ${cleaned.count} expired refresh tokens`)
}

// Housekeeping for the weekly chat quota — drop stale buckets
await sql`DELETE FROM chat_usage WHERE week_start < CURRENT_DATE - INTERVAL '8 weeks'`

// Seed admin account from env
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
if (adminEmail && adminPassword) {
  const existing = await sql`SELECT id, role FROM users WHERE email = ${adminEmail}`
  const user = existing[0] as { id: number; role: string } | undefined
  if (!user) {
    const hash = bcrypt.hashSync(adminPassword, 10)
    await sql`INSERT INTO users (email, password_hash, display_name, role) VALUES (${adminEmail}, ${hash}, 'Admin', 'admin')`
    console.log('✅ Admin account created')
  } else if (user.role !== 'admin') {
    await sql`UPDATE users SET role = 'admin' WHERE id = ${user.id}`
    console.log('✅ Existing user upgraded to admin')
  } else {
    console.log('✅ Admin account ready')
  }
}

export default sql
