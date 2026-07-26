import { Router } from 'express'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cardsPath = path.join(__dirname, '..', 'data', 'cards.json')
const cards = JSON.parse(readFileSync(cardsPath, 'utf-8'))

const router = Router()

// GET /api/cards — get all cards
router.get('/', (_req, res) => {
  res.json(cards)
})

// GET /api/cards/:id — get single card
router.get('/:id', (req, res) => {
  const card = cards.find((c: { id: number }) => c.id === Number(req.params.id))
  if (!card) {
    res.status(404).json({ error: 'Card not found' })
    return
  }
  res.json(card)
})

export default router
