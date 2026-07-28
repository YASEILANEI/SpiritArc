import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import bcrypt from 'bcryptjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data', 'tarot.db')

const db = new Database(dbPath)

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password_hash TEXT,
    display_name TEXT,
    avatar_url TEXT,
    auth_provider TEXT DEFAULT 'local',
    auth_provider_id TEXT,
    role TEXT DEFAULT 'free',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_type TEXT,
    question TEXT,
    cards TEXT NOT NULL,
    spread_type TEXT DEFAULT 'single',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// Migration: add reading_result and reading_source columns if not present
const hasResultCol = db.prepare(
  "SELECT name FROM pragma_table_info('readings') WHERE name = 'reading_result'"
).get()
if (!hasResultCol) {
  db.exec("ALTER TABLE readings ADD COLUMN reading_result TEXT")
  db.exec("ALTER TABLE readings ADD COLUMN reading_source TEXT DEFAULT 'template'")
}

// Migration: add user_id and is_public to readings
const hasUserIdCol = db.prepare(
  "SELECT name FROM pragma_table_info('readings') WHERE name = 'user_id'"
).get()
if (!hasUserIdCol) {
  db.exec("ALTER TABLE readings ADD COLUMN user_id INTEGER REFERENCES users(id)")
  db.exec("ALTER TABLE readings ADD COLUMN is_public INTEGER DEFAULT 1")
}

// Migration: add phone to users
const hasPhoneCol = db.prepare(
  "SELECT name FROM pragma_table_info('users') WHERE name = 'phone'"
).get()
if (!hasPhoneCol) {
  db.exec("ALTER TABLE users ADD COLUMN phone TEXT")
}
// Add unique index on phone (separate from ALTER to support existing tables)
db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`)

// Create indexes for performance
db.exec(`CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at)`)
db.exec(`CREATE INDEX IF NOT EXISTS idx_readings_source ON readings(reading_source)`)

// Migration: add deleted_at for soft delete
const hasDeletedAt = db.prepare(
  "SELECT name FROM pragma_table_info('readings') WHERE name = 'deleted_at'"
).get()
if (!hasDeletedAt) {
  db.exec("ALTER TABLE readings ADD COLUMN deleted_at DATETIME")
}

// Migration: add hidden_at for user-hide (admin still sees)
const hasHiddenAt = db.prepare(
  "SELECT name FROM pragma_table_info('readings') WHERE name = 'hidden_at'"
).get()
if (!hasHiddenAt) {
  db.exec("ALTER TABLE readings ADD COLUMN hidden_at DATETIME")
}

// Create settings table for admin-configurable options
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)
// Seed default settings
const settingCount = (db.prepare('SELECT COUNT(*) as count FROM settings').get() as any).count
if (settingCount === 0) {
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
  insertSetting.run('OPENCODE_BASE_URL', process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1')
  insertSetting.run('AI_MODEL', 'deepseek-v4-flash')
  insertSetting.run('AI_MAX_TOKENS', '4000')
}

// Clean up expired refresh tokens on startup
const cleaned = db.prepare(
  "DELETE FROM refresh_tokens WHERE expires_at <= datetime('now')"
).run()
if (cleaned.changes > 0) {
  console.log(`🧹 Cleaned ${cleaned.changes} expired refresh tokens`)
}

// Seed admin account from env
const adminEmail = process.env.ADMIN_EMAIL
const adminPassword = process.env.ADMIN_PASSWORD
if (adminEmail && adminPassword) {
  const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(adminEmail) as any
  if (!existing) {
    const hash = bcrypt.hashSync(adminPassword, 10)
    db.prepare(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(adminEmail, hash, 'Admin', 'admin')
    console.log('✅ Admin account created')
  } else if (existing.role !== 'admin') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('admin', existing.id)
    console.log('✅ Existing user upgraded to admin')
  } else {
    console.log('✅ Admin account ready')
  }
}

export default db
