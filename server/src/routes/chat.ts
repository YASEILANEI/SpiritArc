import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import sql from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { aiChat } from '../services/ai-reading.js'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = Router()
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const cardsPath = path.join(__dirname, '..', 'data', 'cards.json')
const allCards: any[] = JSON.parse(readFileSync(cardsPath, 'utf-8'))
const MAX_MESSAGE_LENGTH = 1000
const HISTORY_LIMIT = 20

router.param('id', (req, res, next, id) => {
  if (!Number.isInteger(Number(id))) {
    res.status(400).json({ error: 'Invalid conversation id' })
    return
  }
  next()
})

function formatMessage(row: any) {
  return { id: row.id, role: row.role, content: row.content, createdAt: row.created_at, userRating: row.user_rating || null }
}

function formatConversation(row: any, messages: any[]) {
  return {
    id: row.id,
    readingId: row.reading_id,
    question: row.question,
    questionType: row.question_type,
    spreadType: row.spread_type,
    cards: typeof row.cards === 'string' ? JSON.parse(row.cards) : row.cards,
    readingResult: row.reading_result,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: messages.map(formatMessage),
  }
}

// Monday-based week bucket (YYYY-MM-DD) for the chat quota, computed in UTC so
// it stays consistent with the DB's CURRENT_DATE used for cleanup.
function weekStartKey(): string {
  const now = new Date()
  const offset = (now.getUTCDay() + 6) % 7 // Monday = 0
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - offset))
  const mm = String(monday.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(monday.getUTCDate()).padStart(2, '0')
  return `${monday.getUTCFullYear()}-${mm}-${dd}`
}

// Atomically reserve one weekly quota slot. The upsert's row lock serializes
// concurrent sends, so the check-and-increment can't be raced. Returns the new
// used count, or null when the limit is already exceeded — the over-limit
// rollback happens in the same transaction so the decrement is atomic with the
// increment.
async function reserveChatQuota(userId: number, weekStart: string, limit: number): Promise<number | null> {
  return await sql.begin(async tx => {
    const res = (await tx`
      INSERT INTO chat_usage (user_id, week_start, sent_count)
      VALUES (${userId}, ${weekStart}, 1)
      ON CONFLICT (user_id, week_start)
      DO UPDATE SET sent_count = chat_usage.sent_count + 1
      RETURNING sent_count
    `)[0] as { sent_count: number }
    if (res.sent_count > limit) {
      await tx`UPDATE chat_usage SET sent_count = sent_count - 1 WHERE user_id = ${userId} AND week_start = ${weekStart}`
      return null
    }
    return res.sent_count
  })
}

async function refundChatQuota(userId: number, weekStart: string): Promise<void> {
  try {
    await sql`UPDATE chat_usage SET sent_count = sent_count - 1 WHERE user_id = ${userId} AND week_start = ${weekStart}`
  } catch (err) {
    // Quota bookkeeping must not mask the primary response; a lost slot only
    // over-counts, which is the safe direction.
    console.error('Chat quota refund failed:', err)
  }
}

async function getOwnedReading(readingId: number, userId: number) {
  return (await sql`
    SELECT * FROM readings
    WHERE id = ${readingId} AND user_id = ${userId} AND deleted_at IS NULL
  `)[0] as any
}

async function getConversation(id: number, userId: number) {
  return (await sql`
    SELECT c.*, r.question, r.question_type, r.spread_type, r.cards, r.reading_result
    FROM chat_conversations c
    JOIN readings r ON r.id = c.reading_id
    WHERE c.id = ${id} AND c.user_id = ${userId} AND r.deleted_at IS NULL
  `)[0] as any
}

// Create or get the single conversation belonging to a reading.
router.post('/conversations', authMiddleware, async (req: Request, res: Response) => {
  const readingId = Number(req.body.readingId)
  if (!Number.isInteger(readingId)) {
    res.status(400).json({ error: '无效的占卜记录' })
    return
  }
  const reading = await getOwnedReading(readingId, req.user!.userId)
  if (!reading) {
    res.status(404).json({ error: '占卜记录不存在或无权访问' })
    return
  }
  const inserted = await sql`
    INSERT INTO chat_conversations (user_id, reading_id)
    VALUES (${req.user!.userId}, ${readingId})
    ON CONFLICT (user_id, reading_id) DO UPDATE SET updated_at = chat_conversations.updated_at
    RETURNING id
  `
  const conversation = await getConversation(inserted[0].id, req.user!.userId)
  const messages = await sql`
    SELECT id, role, content, created_at, user_rating FROM chat_messages
    WHERE conversation_id = ${conversation.id}
    ORDER BY created_at ASC, id ASC LIMIT 100
  `
  res.status(201).json(formatConversation(conversation, messages))
})

router.get('/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
  const conversation = await getConversation(Number(req.params.id), req.user!.userId)
  if (!conversation) {
    res.status(404).json({ error: '聊天会话不存在或无权访问' })
    return
  }
  const messages = await sql`
    SELECT id, role, content, created_at, user_rating FROM chat_messages
    WHERE conversation_id = ${conversation.id}
    ORDER BY created_at ASC, id ASC LIMIT 100
  `
  res.json(formatConversation(conversation, messages))
})

router.post('/conversations/:id/messages', authMiddleware, rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // Auth required — key by the authenticated user, not IP (avoids IPv6 keyGenerator warning)
  keyGenerator: (req: any) => String(req.user!.userId),
}), async (req: Request, res: Response) => {
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : ''
  if (!content) {
    res.status(400).json({ error: '消息不能为空' })
    return
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    res.status(400).json({ error: `消息不能超过 ${MAX_MESSAGE_LENGTH} 字` })
    return
  }

  const conversation = await getConversation(Number(req.params.id), req.user!.userId)
  if (!conversation) {
    res.status(404).json({ error: '聊天会话不存在或无权访问' })
    return
  }

  const role = req.user!.role
  const limit = role === 'admin' ? null : role === 'premium' ? 100 : 10
  const weekStart = weekStartKey()

  const history = await sql`
    SELECT role, content FROM chat_messages
    WHERE conversation_id = ${conversation.id}
    ORDER BY created_at DESC, id DESC LIMIT ${HISTORY_LIMIT}
  `
  const orderedHistory = [...history].reverse().map((message: any) => ({
    role: message.role as 'user' | 'assistant', content: message.content as string,
  }))
  const drawn = JSON.parse(conversation.cards)
  let fullCards: any[]
  try {
    fullCards = drawn.map((drawnCard: any) => {
      // Server-drawn readings store { cardId, position }, but offline readings
      // batch-synced via /readings/batch-sync store full card objects with `id`.
      const card = allCards.find(item => item.id === (drawnCard.cardId ?? drawnCard.id))
      if (!card) throw new Error('invalid cardId')
      return {
        ...card,
        position: drawnCard.position,
        meaning: drawnCard.position === 'up' ? card.meaningUp : card.meaningDown,
        spreadPosition: drawnCard.spreadPosition,
      }
    })
  } catch {
    res.status(400).json({ error: '占卜记录数据异常，无法继续聊天' })
    return
  }

  // Reserve the quota slot only after validation passes, so a rejected request
  // never consumes one. The upsert's row lock makes check-and-increment atomic
  // (a plain COUNT-then-INSERT let concurrent sends slip past the limit), and
  // counting chat_messages instead would let a conversation burn (CASCADE
  // delete) refund already-used quota.
  const reserved = limit === null ? 0 : await reserveChatQuota(req.user!.userId, weekStart, limit)
  if (limit !== null && reserved === null) {
    res.status(403).json({ error: `本周牌灵聊天次数已达上限（${limit}条）`, limit, used: limit, remaining: 0 })
    return
  }
  const reply = await aiChat(
    conversation.question_type,
    conversation.question,
    fullCards,
    conversation.reading_result,
    orderedHistory,
    content,
  )
  if (!reply) {
    if (limit !== null) await refundChatQuota(req.user!.userId, weekStart)
    res.status(502).json({ error: '牌灵暂时无法回应，请稍后重试' })
    return
  }

  let inserted: { user: any; assistant: any }
  try {
    inserted = await sql.begin(async tx => {
      const userMessage = await tx`
        INSERT INTO chat_messages (conversation_id, role, content)
        VALUES (${conversation.id}, 'user', ${content}) RETURNING id, role, content, created_at
      `
      const assistantMessage = await tx`
        INSERT INTO chat_messages (conversation_id, role, content)
        VALUES (${conversation.id}, 'assistant', ${reply}) RETURNING id, role, content, created_at
      `
      await tx`UPDATE chat_conversations SET updated_at = now() WHERE id = ${conversation.id}`
      return { user: userMessage[0], assistant: assistantMessage[0] }
    })
  } catch (err) {
    // No messages were persisted — return the reserved quota slot.
    if (limit !== null) await refundChatQuota(req.user!.userId, weekStart)
    throw err
  }
  res.status(201).json({
    userMessage: formatMessage(inserted.user),
    assistantMessage: formatMessage(inserted.assistant),
    quota: limit === null ? null : { limit, used: reserved!, remaining: limit - reserved! },
  })
})

// Set or clear a user rating on a message (up/down). Ownership checked via the conversation.
router.post('/messages/:messageId/feedback', authMiddleware, async (req: Request, res: Response) => {
  const messageId = Number(req.params.messageId)
  if (!Number.isInteger(messageId)) {
    res.status(400).json({ error: '无效的消息' })
    return
  }
  const rating = req.body.rating ?? null
  if (rating !== null && rating !== 'up' && rating !== 'down') {
    res.status(400).json({ error: '无效的评价' })
    return
  }
  const message = (await sql`
    SELECT cm.id FROM chat_messages cm
    JOIN chat_conversations cc ON cc.id = cm.conversation_id
    WHERE cm.id = ${messageId} AND cc.user_id = ${req.user!.userId}
  `)[0]
  if (!message) {
    res.status(404).json({ error: '消息不存在或无权访问' })
    return
  }
  await sql`UPDATE chat_messages SET user_rating = ${rating} WHERE id = ${messageId}`
  res.json({ ok: true })
})

router.delete('/conversations/:id', authMiddleware, async (req: Request, res: Response) => {
  const result = await sql`
    DELETE FROM chat_conversations WHERE id = ${Number(req.params.id)} AND user_id = ${req.user!.userId}
  `
  if (!result.count) {
    res.status(404).json({ error: '聊天会话不存在或无权访问' })
    return
  }
  res.json({ deleted: true })
})

export default router
