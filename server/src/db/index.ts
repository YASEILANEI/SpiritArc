import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '..', 'data', 'tarot.db')

const db = new Database(dbPath)

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

export default db
