import { Router } from 'express'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import db from '../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cardsPath = path.join(__dirname, '..', 'data', 'cards.json')
const allCards: any[] = JSON.parse(readFileSync(cardsPath, 'utf-8'))

const router = Router()

const SPREAD_POSITIONS: Record<string, string[]> = {
  'three-card': ['past', 'present', 'future'],
}

// POST /api/readings — create a new reading
router.post('/', (req, res) => {
  const { questionType = 'general', question = '', spreadType = 'single' } = req.body
  const drawCards = drawSpread(spreadType, allCards)

  const stmt = db.prepare(
    'INSERT INTO readings (question_type, question, cards, spread_type) VALUES (?, ?, ?, ?)'
  )
  const result = stmt.run(questionType, question, JSON.stringify(drawCards), spreadType)

  const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(result.lastInsertRowid) as any
  res.status(201).json(formatReading(reading, allCards))
})

// GET /api/readings — get reading history
router.get('/', (_req, res) => {
  const readings = db.prepare('SELECT * FROM readings ORDER BY created_at DESC LIMIT 50').all() as any[]
  res.json(readings.map(r => formatReading(r, allCards)))
})

// GET /api/readings/:id — get single reading
router.get('/:id', (req, res) => {
  const reading = db.prepare('SELECT * FROM readings WHERE id = ?').get(Number(req.params.id)) as any
  if (!reading) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }
  res.json(formatReading(reading, allCards))
})

function spreadCardIds(spread: string): number {
  switch (spread) {
    case 'single': return 1
    case 'three-card': return 3
    default: return 1
  }
}

function drawSpread(spread: string, cards: any[]): { cardId: number; position: 'up' | 'down'; spreadPosition?: string }[] {
  const count = spreadCardIds(spread)
  const shuffled = [...cards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map((c, i) => ({
    cardId: c.id,
    position: Math.random() < 0.5 ? 'up' : 'down',
    ...(SPREAD_POSITIONS[spread] ? { spreadPosition: SPREAD_POSITIONS[spread][i] } : {}),
  }))
}

function formatReading(reading: any, allCards: any[]) {
  const drawn = JSON.parse(reading.cards)
  return {
    id: reading.id,
    questionType: reading.question_type,
    question: reading.question,
    spreadType: reading.spread_type,
    cards: drawn.map((d: { cardId: number; position: string; spreadPosition?: string }) => {
      const card = allCards.find(c => c.id === d.cardId)
      return {
        ...card,
        position: d.position,
        meaning: d.position === 'up' ? card.meaningUp : card.meaningDown,
        spreadPosition: d.spreadPosition,
      }
    }),
    createdAt: reading.created_at,
  }
}

export default router
