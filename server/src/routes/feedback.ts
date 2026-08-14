import { Router, Request, Response } from 'express'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import sql from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// Authenticated-only, rate-limited per user (not per IP) to prevent feedback spam
router.post('/', authMiddleware, rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  // express-rate-limit v8 requires the ipKeyGenerator helper when falling back
  // to req.ip — otherwise it raises ERR_ERL_KEY_GEN_IPV6 at runtime.
  keyGenerator: (req: any) => req.user?.userId ? String(req.user.userId) : ipKeyGenerator(req),
}), async (req: Request, res: Response) => {
  const content = (req.body.content || '').trim()
  if (!content) {
    res.status(400).json({ error: '反馈内容不能为空' })
    return
  }
  if (content.length > 2000) {
    res.status(400).json({ error: '反馈内容不能超过 2000 字' })
    return
  }

  let readingId: number | null = null
  const rawReadingId = req.body.readingId
  if (rawReadingId !== undefined && rawReadingId !== null && rawReadingId !== '') {
    if (!Number.isInteger(Number(rawReadingId))) {
      res.status(400).json({ error: '无效的占卜记录' })
      return
    }
    readingId = Number(rawReadingId)
    // Must own the reading and it must not be soft-deleted; hidden is allowed
    const reading = (await sql`
      SELECT id FROM readings WHERE id = ${readingId} AND user_id = ${req.user!.userId} AND deleted_at IS NULL
    `)[0]
    if (!reading) {
      res.status(400).json({ error: '占卜记录不存在或无权关联' })
      return
    }
  }

  const inserted = await sql`
    INSERT INTO feedback (user_id, reading_id, content)
    VALUES (${req.user!.userId}, ${readingId}, ${content})
    RETURNING id
  `
  res.status(201).json({ ok: true, id: inserted[0].id })
})

// GET /api/feedback — current user's feedback history with admin replies
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const rows = await sql`
    SELECT f.id, f.content, f.status, f.reply, f.replied_at, f.reading_id, f.created_at, r.question
    FROM feedback f
    LEFT JOIN readings r ON f.reading_id = r.id
    WHERE f.user_id = ${req.user!.userId}
    ORDER BY f.created_at DESC LIMIT 50
  `
  res.json(rows.map((f: any) => ({
    id: f.id,
    content: f.content,
    status: f.status,
    reply: f.reply,
    repliedAt: f.replied_at,
    readingId: f.reading_id,
    readingQuestion: f.question,
    createdAt: f.created_at,
  })))
})

// GET /api/feedback/unread — replied feedback the user hasn't seen yet
router.get('/unread', authMiddleware, async (req: Request, res: Response) => {
  const rows = await sql`
    SELECT f.id, f.content, f.reply, f.replied_at, f.reading_id, f.created_at, r.question
    FROM feedback f
    LEFT JOIN readings r ON f.reading_id = r.id
    WHERE f.user_id = ${req.user!.userId} AND f.reply IS NOT NULL AND f.user_seen_at IS NULL
    ORDER BY f.created_at DESC LIMIT 20
  `
  res.json({
    unread: rows.map((f: any) => ({
      id: f.id,
      content: f.content,
      reply: f.reply,
      repliedAt: f.replied_at,
      readingId: f.reading_id,
      readingQuestion: f.question,
      createdAt: f.created_at,
    })),
  })
})

// POST /api/feedback/read-all — mark all unread replies as seen
router.post('/read-all', authMiddleware, async (req: Request, res: Response) => {
  const result = await sql`
    UPDATE feedback SET user_seen_at = now()
    WHERE user_id = ${req.user!.userId} AND reply IS NOT NULL AND user_seen_at IS NULL
  `
  res.json({ updated: result.count })
})

export default router
