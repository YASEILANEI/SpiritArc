import { Router, Request, Response } from 'express'
import sql from '../db/index.js'
import { requireRole } from '../middleware/auth.js'

const router = Router()

// All admin routes require admin role
router.use(requireRole('admin'))

// GET /api/admin/stats — total counts (including soft-deleted)
router.get('/stats', async (_req: Request, res: Response) => {
  const totalUsers = (await sql`SELECT COUNT(*)::int as count FROM users`)[0].count
  const totalReadings = (await sql`SELECT COUNT(*)::int as count FROM readings`)[0].count
  const todayReadings = (await sql`SELECT COUNT(*)::int as count FROM readings WHERE created_at::date = CURRENT_DATE`)[0].count
  const activeUsers = (await sql`SELECT COUNT(DISTINCT user_id)::int as count FROM readings WHERE user_id IS NOT NULL`)[0].count

  const sourceStats = await sql`SELECT reading_source, COUNT(*)::int as count FROM readings WHERE reading_source IS NOT NULL GROUP BY reading_source`

  const aiCount = sourceStats.find((s: any) => s.reading_source === 'ai')?.count || 0
  const templateCount = sourceStats.find((s: any) => s.reading_source === 'template')?.count || 0

  res.json({
    totalUsers,
    totalReadings,
    todayReadings,
    activeUsers,
    aiReadings: aiCount,
    templateReadings: templateCount,
  })
})

// GET /api/admin/users
router.get('/users', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20))
  const offset = (page - 1) * limit
  const search = (req.query.search as string) || ''

  const searchCond = search
    ? sql`WHERE email LIKE ${`%${search}%`} OR phone LIKE ${`%${search}%`} OR display_name LIKE ${`%${search}%`}`
    : sql``

  const total = (await sql`SELECT COUNT(*)::int as count FROM users ${searchCond}`)[0].count
  const users = await sql`
    SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at, updated_at FROM users ${searchCond} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
  `

  res.json({
    users: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      displayName: u.display_name,
      avatarUrl: u.avatar_url,
      authProvider: u.auth_provider,
      role: u.role,
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// GET /api/admin/users/:id
router.get('/users/:id', async (req: Request, res: Response) => {
  const user = (await sql`SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at, updated_at FROM users WHERE id = ${Number(req.params.id)}`)[0] as any

  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  const readings = await sql`SELECT id, question_type, question, spread_type, reading_source, created_at FROM readings WHERE user_id = ${user.id} ORDER BY created_at DESC LIMIT 50`

  res.json({
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      authProvider: user.auth_provider,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
    readings: readings.map((r: any) => ({
      id: r.id,
      questionType: r.question_type,
      question: r.question,
      spreadType: r.spread_type,
      readingSource: r.reading_source,
      createdAt: r.created_at,
    })),
  })
})

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', async (req: Request, res: Response) => {
  const targetId = Number(req.params.id)
  const { role } = req.body

  if (targetId === req.user!.userId) {
    res.status(400).json({ error: '不能修改自己的角色' })
    return
  }

  if (!['free', 'premium', 'admin'].includes(role)) {
    res.status(400).json({ error: '无效的角色' })
    return
  }

  await sql`UPDATE users SET role = ${role}, updated_at = now() WHERE id = ${targetId}`
  res.json({ ok: true })
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req: Request, res: Response) => {
  const targetId = Number(req.params.id)

  if (targetId === req.user!.userId) {
    res.status(400).json({ error: '不能删除自己的账号' })
    return
  }

  await sql`DELETE FROM refresh_tokens WHERE user_id = ${targetId}`
  await sql`DELETE FROM readings WHERE user_id = ${targetId}`
  await sql`DELETE FROM users WHERE id = ${targetId}`
  res.json({ ok: true })
})

// GET /api/admin/readings
router.get('/readings', async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 8))
  const offset = (page - 1) * limit

  const total = (await sql`SELECT COUNT(*)::int as count FROM readings`)[0].count
  const readings = await sql`
    SELECT r.id, r.question_type, r.question, r.spread_type, r.reading_source, r.user_id, r.is_public, r.created_at, r.deleted_at, r.hidden_at, u.display_name
    FROM readings r LEFT JOIN users u ON r.user_id = u.id ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}
  `

  res.json({
    readings: readings.map((r: any) => ({
      id: r.id,
      questionType: r.question_type,
      question: r.question?.slice(0, 100),
      spreadType: r.spread_type,
      readingSource: r.reading_source,
      userId: r.user_id,
      userName: r.display_name || `用户 #${r.user_id}`,
      isPublic: !!r.is_public,
      createdAt: r.created_at,
      isDeleted: !!r.deleted_at,
      isHidden: !!r.hidden_at,
    })),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  })
})

// POST /api/admin/readings/batch-delete
router.post('/readings/batch-delete', async (req: Request, res: Response) => {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: '请提供要删除的记录 ID' })
    return
  }
  await sql`DELETE FROM readings WHERE id IN ${sql(ids)}`
  res.json({ deleted: ids.length })
})

// DELETE /api/admin/readings/:id
router.delete('/readings/:id', async (req: Request, res: Response) => {
  await sql`DELETE FROM readings WHERE id = ${Number(req.params.id)}`
  res.json({ ok: true })
})

// GET /api/admin/readings/:id — get full reading details (admin view)
router.get('/readings/:id', async (req: Request, res: Response) => {
  const reading = (await sql`SELECT * FROM readings WHERE id = ${Number(req.params.id)}`)[0] as any
  if (!reading) {
    res.status(404).json({ error: '记录不存在' })
    return
  }
  res.json({ readingResult: reading.reading_result || '' })
})

// GET /api/admin/settings — get all settings (API key redacted for security)
router.get('/settings', async (_req: Request, res: Response) => {
  const rows = await sql`SELECT key, value FROM settings`
  const settings: Record<string, string> = {}
  for (const row of rows) {
    if (row.key === 'OPENCODE_API_KEY') continue // no longer stored in DB
    settings[row.key] = row.value
  }
  res.json(settings)
})

// PUT /api/admin/settings — update settings
router.put('/settings', async (req: Request, res: Response) => {
  const { key, value } = req.body
  if (!key) {
    res.status(400).json({ error: '请提供 key' })
    return
  }
  const allowedKeys = ['OPENCODE_BASE_URL', 'AI_MODEL', 'AI_MAX_TOKENS']
  if (!allowedKeys.includes(key)) {
    res.status(400).json({ error: '不允许修改该设置' })
    return
  }
  await sql`INSERT INTO settings (key, value, updated_at) VALUES (${key}, ${String(value)}, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`
  res.json({ ok: true })
})

export default router
