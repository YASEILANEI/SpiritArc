import { Router, Request, Response } from 'express'
import sql from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// GET /api/profile — get current user profile
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const user = (await sql`
    SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at, updated_at FROM users WHERE id = ${req.user!.userId}
  `)[0] as any

  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  res.json({
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    authProvider: user.auth_provider,
    role: user.role,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  })
})

// PUT /api/profile — update profile
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  const { displayName, avatarUrl } = req.body
  const userId = req.user!.userId

  await sql`
    UPDATE users SET display_name = COALESCE(${displayName ?? null}, display_name), avatar_url = COALESCE(${avatarUrl ?? null}, avatar_url), updated_at = now() WHERE id = ${userId}
  `

  const user = (await sql`
    SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at FROM users WHERE id = ${userId}
  `)[0] as any

  res.json({
    id: user.id,
    email: user.email,
    phone: user.phone,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    authProvider: user.auth_provider,
    role: user.role,
    createdAt: user.created_at,
  })
})

// GET /api/profile/subscription — get subscription status
router.get('/subscription', authMiddleware, async (req: Request, res: Response) => {
  const user = (await sql`SELECT role FROM users WHERE id = ${req.user!.userId}`)[0] as any
  const role = user?.role || 'free'

  let remaining = 0, limit = 0, period = ''
  if (role === 'admin') {
    remaining = Infinity
    limit = Infinity
    period = 'unlimited'
  } else if (role === 'premium') {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const monthlyCount = (await sql`
      SELECT COUNT(*)::int as count FROM readings WHERE user_id = ${req.user!.userId} AND reading_source = 'ai' AND created_at >= ${monthAgo}
    `)[0].count
    remaining = Math.max(0, 100 - monthlyCount)
    limit = 100
    period = 'monthly'
  } else {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const weeklyCount = (await sql`
      SELECT COUNT(*)::int as count FROM readings WHERE user_id = ${req.user!.userId} AND reading_source = 'ai' AND created_at >= ${weekAgo}
    `)[0].count
    remaining = Math.max(0, 3 - weeklyCount)
    limit = 3
    period = 'weekly'
  }

  res.json({
    role,
    features: {
      aiReading: role === 'premium' || role === 'admin',
      dailyLimit: role === 'free' ? 3 : Infinity,
    },
    aiQuota: { remaining, limit, period },
  })
})

export default router
