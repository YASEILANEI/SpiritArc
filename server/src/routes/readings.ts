import { Router } from 'express'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sql from '../db/index.js'
import { templateReading } from '../services/template-reading.js'
import { aiReading } from '../services/ai-reading.js'
import { authMiddleware, optionalAuth } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cardsPath = path.join(__dirname, '..', 'data', 'cards.json')
const allCards: any[] = JSON.parse(readFileSync(cardsPath, 'utf-8'))

const router = Router()

// Non-numeric :id would become NaN in the SQL params below and 500 — reject early.
router.param('id', (req, res, next, id) => {
  if (!Number.isInteger(Number(id))) {
    res.status(400).json({ error: 'Invalid reading id' })
    return
  }
  next()
})

const SPREAD_POSITIONS: Record<string, string[]> = {
  'three-card': ['past', 'present', 'future'],
}

const VALID_SPREADS = ['single', 'three-card']
const VALID_QUESTION_TYPES = ['general', 'love', 'career', 'finance', 'health']

// POST /api/readings — create a new reading
router.post('/', authMiddleware, async (req, res) => {
  const { questionType = 'general', question = '', spreadType = 'single', isPublic = true } = req.body
  if (!VALID_SPREADS.includes(spreadType)) {
    res.status(400).json({ error: `Invalid spreadType. Must be one of: ${VALID_SPREADS.join(', ')}` })
    return
  }
  if (!VALID_QUESTION_TYPES.includes(questionType)) {
    res.status(400).json({ error: `Invalid questionType. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}` })
    return
  }
  const drawCards = drawSpread(spreadType, allCards)

  // Always use template reading at creation; users can upgrade to AI later
  const fullCards = drawCards.map((d: any) => {
    const card = allCards.find(c => c.id === d.cardId)
    return {
      ...card,
      position: d.position,
      meaning: d.position === 'up' ? card.meaningUp : card.meaningDown,
      spreadPosition: d.spreadPosition,
    }
  })
  const { result: readingResult, source: readingSource } = templateReading(questionType, question, fullCards)

  const inserted = await sql`
    INSERT INTO readings (question_type, question, cards, spread_type, reading_result, reading_source, user_id, is_public)
    VALUES (${questionType}, ${question}, ${JSON.stringify(drawCards)}, ${spreadType}, ${readingResult}, ${readingSource}, ${req.user!.userId}, ${isPublic ? 1 : 0})
    RETURNING id
  `
  const readingId = inserted[0].id as number
  const reading = (await sql`SELECT * FROM readings WHERE id = ${readingId}`)[0] as any
  res.status(201).json(formatReading(reading, allCards))
})

// POST /api/readings/:id/ai-reading — upgrade template reading to AI (weekly limited for free users)
router.post('/:id/ai-reading', authMiddleware, async (req, res) => {
  const reading = (await sql`SELECT * FROM readings WHERE id = ${Number(req.params.id)}`)[0] as any
  if (!reading) {
    res.status(404).json({ error: '占卜记录不存在' })
    return
  }
  if (reading.user_id !== req.user!.userId) {
    res.status(403).json({ error: '无权操作该记录' })
    return
  }
  // Already AI — return existing
  if (reading.reading_source === 'ai' && reading.reading_result) {
    res.json(formatReading(reading, allCards))
    return
  }
  // Check usage limit based on role
  const role = req.user!.role
  if (role !== 'admin') {
    if (role === 'premium') {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const monthlyCount = (await sql`
        SELECT COUNT(*)::int as count FROM readings WHERE user_id = ${req.user!.userId} AND reading_source = 'ai' AND created_at >= ${monthAgo}
      `)[0].count
      if (monthlyCount >= 100) {
        res.status(403).json({ error: '本月牌灵解读次数已达上限（100次）', limit: 100, remaining: 0 })
        return
      }
    } else {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const weeklyCount = (await sql`
        SELECT COUNT(*)::int as count FROM readings WHERE user_id = ${req.user!.userId} AND reading_source = 'ai' AND created_at >= ${weekAgo}
      `)[0].count
      if (weeklyCount >= 3) {
        res.status(403).json({ error: '本周牌灵解读次数已达上限（3次）', limit: 3, remaining: 0 })
        return
      }
    }
  }
  // Reconstruct full card data for AI reading
  const drawn = JSON.parse(reading.cards)
  const fullCards = drawn.map((d: { cardId: number; position: string; spreadPosition?: string }) => {
    const card = allCards.find((c: any) => c.id === d.cardId)
    return {
      ...card,
      position: d.position,
      meaning: d.position === 'up' ? card.meaningUp : card.meaningDown,
      spreadPosition: d.spreadPosition,
    }
  })
  const aiResult = await aiReading(reading.question_type, reading.question, fullCards)
  if (!aiResult) {
    res.status(502).json({ error: '牌灵解读生成失败，请稍后重试' })
    return
  }
  await sql`UPDATE readings SET reading_result = ${aiResult.result}, reading_source = ${aiResult.source} WHERE id = ${reading.id}`
  // Re-fetch updated reading
  const updated = (await sql`SELECT * FROM readings WHERE id = ${reading.id}`)[0] as any
  res.json(formatReading(updated, allCards))
})

// POST /api/readings/batch-sync — push local readings to server after login
router.post('/batch-sync', authMiddleware, async (req, res) => {
  const { readings } = req.body
  if (!Array.isArray(readings) || readings.length === 0) {
    res.status(400).json({ error: '请提供有效的占卜记录列表' })
    return
  }

  let imported = 0
  await sql.begin(async tx => {
    for (const r of readings) {
      await tx`INSERT INTO readings (question_type, question, cards, spread_type, reading_result, reading_source, user_id, is_public)
        VALUES (${r.questionType || 'general'}, ${r.question || ''}, ${JSON.stringify(r.cards || [])}, ${r.spreadType || 'single'}, ${r.readingResult || null}, ${r.readingSource || 'template'}, ${req.user!.userId}, 0)`
      imported++
    }
  })
  res.json({ imported })
})

// POST /api/readings/batch-delete — soft delete multiple readings
router.post('/batch-delete', authMiddleware, async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: '请提供要删除的记录 ID' })
    return
  }
  // Only delete own readings
  const result = await sql`UPDATE readings SET deleted_at = now() WHERE id IN ${sql(ids)} AND user_id = ${req.user!.userId}`
  res.json({ deleted: result.count })
})

// POST /api/readings/batch-hide — hide multiple readings from user view
router.post('/batch-hide', authMiddleware, async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: '请提供要隐藏的记录 ID' })
    return
  }
  const result = await sql`UPDATE readings SET hidden_at = now() WHERE id IN ${sql(ids)} AND user_id = ${req.user!.userId}`
  res.json({ hidden: result.count })
})

// POST /api/readings/batch-unhide — unhide multiple readings
router.post('/batch-unhide', authMiddleware, async (req, res) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: '请提供要取消隐藏的记录 ID' })
    return
  }
  const result = await sql`UPDATE readings SET hidden_at = NULL WHERE id IN ${sql(ids)} AND user_id = ${req.user!.userId}`
  res.json({ unhidden: result.count })
})

// GET /api/readings — get reading history (own readings only)
// ?filter=hidden — show hidden readings instead of active ones
router.get('/', authMiddleware, async (req, res) => {
  const showHidden = req.query.filter === 'hidden'
  const readings = showHidden
    ? await sql`SELECT * FROM readings WHERE user_id = ${req.user!.userId} AND hidden_at IS NOT NULL AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`
    : await sql`SELECT * FROM readings WHERE user_id = ${req.user!.userId} AND hidden_at IS NULL AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 50`
  res.json(readings.map(r => formatReading(r, allCards)))
})

// GET /api/readings/:id — get single reading
router.get('/:id', optionalAuth, async (req, res) => {
  const reading = (await sql`SELECT * FROM readings WHERE id = ${Number(req.params.id)}`)[0] as any
  if (!reading) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }
  // Check access: owner can see all, others can only see public
  if (reading.user_id !== req.user?.userId && !reading.is_public) {
    res.status(403).json({ error: '无权访问该记录' })
    return
  }
  res.json(formatReading(reading, allCards))
})

// PUT /api/readings/:id/privacy — toggle public/private
router.put('/:id/privacy', authMiddleware, async (req, res) => {
  const { isPublic } = req.body
  const reading = (await sql`SELECT * FROM readings WHERE id = ${Number(req.params.id)}`)[0] as any
  if (!reading) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }
  if (reading.user_id !== req.user!.userId) {
    res.status(403).json({ error: '仅可修改自己的记录' })
    return
  }
  await sql`UPDATE readings SET is_public = ${isPublic ? 1 : 0} WHERE id = ${Number(req.params.id)}`
  res.json({ ok: true })
})

// DELETE /api/readings/:id — soft-delete a reading
router.delete('/:id', authMiddleware, async (req, res) => {
  const reading = (await sql`SELECT * FROM readings WHERE id = ${Number(req.params.id)}`)[0] as any
  if (!reading) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }
  if (reading.user_id !== req.user!.userId) {
    res.status(403).json({ error: '仅可删除自己的记录' })
    return
  }
  // Soft delete — keep record for stats
  await sql`UPDATE readings SET deleted_at = now() WHERE id = ${Number(req.params.id)}`
  res.json({ ok: true })
})

// POST /api/readings/:id/hide — hide a reading from user view (admin still sees)
router.post('/:id/hide', authMiddleware, async (req, res) => {
  const reading = (await sql`SELECT * FROM readings WHERE id = ${Number(req.params.id)}`)[0] as any
  if (!reading) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }
  if (reading.user_id !== req.user!.userId) {
    res.status(403).json({ error: '无权操作该记录' })
    return
  }
  await sql`UPDATE readings SET hidden_at = now() WHERE id = ${Number(req.params.id)}`
  res.json({ ok: true })
})

// POST /api/readings/:id/unhide — unhide a reading
router.post('/:id/unhide', authMiddleware, async (req, res) => {
  const reading = (await sql`SELECT * FROM readings WHERE id = ${Number(req.params.id)}`)[0] as any
  if (!reading) {
    res.status(404).json({ error: 'Reading not found' })
    return
  }
  if (reading.user_id !== req.user!.userId) {
    res.status(403).json({ error: '无权操作该记录' })
    return
  }
  await sql`UPDATE readings SET hidden_at = NULL WHERE id = ${Number(req.params.id)}`
  res.json({ ok: true })
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
  // Fisher-Yates shuffle
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
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
      if (!card) {
        return {
          id: d.cardId,
          nameCn: '未知',
          nameEn: 'Unknown',
          arcana: 'major',
          keywords: [],
          meaningUp: '',
          meaningDown: '',
          description: '',
          imageUrl: '',
          interpretation: { up: { coreMeaning: '', love: '', career: '', finance: '', health: '', advice: '' }, down: { coreMeaning: '', love: '', career: '', finance: '', health: '', advice: '' } },
          position: d.position,
          meaning: '',
          spreadPosition: d.spreadPosition,
        }
      }
      return {
        ...card,
        position: d.position,
        meaning: d.position === 'up' ? card.meaningUp : card.meaningDown,
        spreadPosition: d.spreadPosition,
      }
    }),
    createdAt: reading.created_at,
    readingResult: reading.reading_result,
    readingSource: reading.reading_source,
    userId: reading.user_id,
    isPublic: !!reading.is_public,
  }
}

export default router
