import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import sql from '../db/index.js'
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from '../utils/jwt.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const REFRESH_COOKIE = 'refreshToken'
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
}

const CURRENT_TERMS_VERSION = '1.0'

// Input validators
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[\d\-+() ]{7,20}$/

function sanitize(str: string): string {
  return str.replace(/<[^>]*>/g, '').trim()
}

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, phone, password, displayName, acceptedTerms } = req.body

    // Require at least one identifier + password
    if ((!email && !phone) || !password) {
      res.status(400).json({ error: '邮箱或手机号、密码为必填项' })
      return
    }

    // Email format check
    if (email && !EMAIL_RE.test(email)) {
      res.status(400).json({ error: '邮箱格式不正确' })
      return
    }

    // Phone format check
    if (phone && !PHONE_RE.test(phone)) {
      res.status(400).json({ error: '手机号格式不正确' })
      return
    }

    // Password strength
    if (password.length < 8) {
      res.status(400).json({ error: '密码至少需要 8 个字符' })
      return
    }
    if (password.length > 128) {
      res.status(400).json({ error: '密码不能超过 128 个字符' })
      return
    }
    if (!/[A-Z]/.test(password)) {
      res.status(400).json({ error: '密码需要至少一个大写字母' })
      return
    }
    if (!/[0-9]/.test(password)) {
      res.status(400).json({ error: '密码需要至少一个数字' })
      return
    }

    // Terms-of-service consent required
    if (acceptedTerms !== true) {
      res.status(400).json({ error: '请先阅读并同意用户协议和隐私政策' })
      return
    }

    // Check uniqueness (unified error to prevent enumeration)
    if (email) {
      const existing = await sql`SELECT id FROM users WHERE email = ${email}`
      if (existing.length > 0) {
        res.status(409).json({ error: '该账号已被注册' })
        return
      }
    }
    if (phone) {
      const existing = await sql`SELECT id FROM users WHERE phone = ${phone}`
      if (existing.length > 0) {
        res.status(409).json({ error: '该账号已被注册' })
        return
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const safeDisplayName = sanitize(displayName || (email ? email.split('@')[0] : phone || ''))

    // 前 100 名注册用户自动升级 premium：原子自增领取名额序号
    const seq = await sql`
      INSERT INTO settings (key, value) VALUES ('PROMO_FIRST_100_TAKEN', '1')
      ON CONFLICT (key) DO UPDATE SET value = (settings.value::int + 1)::text
      RETURNING value::int
    `
    const role = (seq[0].value as number) <= 100 ? 'premium' : 'free'

    const result = await sql`
      INSERT INTO users (email, phone, password_hash, display_name, accepted_terms_version, accepted_terms_at, role)
      VALUES (${email || null}, ${phone || null}, ${passwordHash}, ${safeDisplayName}, ${CURRENT_TERMS_VERSION}, now(), ${role})
      RETURNING id
    `
    const userId = result[0].id as number
    const payload: TokenPayload = { userId, email: email || '', phone, role }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await sql`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (${userId}, ${refreshToken}, ${expiresAt})`

    const user = (await sql`
      SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at FROM users WHERE id = ${userId}
    `)[0] as any

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS)
    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        authProvider: user.auth_provider,
        role: user.role,
        createdAt: user.created_at,
      },
      accessToken,
    })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { account, password } = req.body
    if (!account || !password) {
      res.status(400).json({ error: '账号和密码为必填项' })
      return
    }

    const rows = await sql`
      SELECT id, email, phone, password_hash, display_name, avatar_url, auth_provider, role, created_at FROM users WHERE email = ${account} OR phone = ${account}
    `
    const user = rows[0] as any

    if (!user) {
      res.status(401).json({ error: '账号或密码错误' })
      return
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ error: '账号或密码错误' })
      return
    }

    const payload: TokenPayload = { userId: user.id, email: user.email || '', phone: user.phone, role: user.role }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    await sql`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (${user.id}, ${refreshToken}, ${expiresAt})`

    res.cookie(REFRESH_COOKIE, refreshToken, REFRESH_COOKIE_OPTIONS)
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
      },
      accessToken,
    })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// POST /api/auth/refresh
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (!token) {
      res.status(401).json({ error: '未提供刷新令牌' })
      return
    }

    const stored = (await sql`SELECT * FROM refresh_tokens WHERE token = ${token} AND expires_at > now()`)[0] as any

    if (!stored) {
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
      res.status(401).json({ error: '刷新令牌无效或已过期' })
      return
    }

    const payload = verifyRefreshToken(token)
    if (!payload) {
      await sql`DELETE FROM refresh_tokens WHERE token = ${token}`
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
      res.status(401).json({ error: '刷新令牌无效' })
      return
    }

    // Rotate refresh token
    await sql`DELETE FROM refresh_tokens WHERE token = ${token}`

    // Look up current user to get up-to-date role
    const user = (await sql`SELECT id, email, phone, role FROM users WHERE id = ${payload.userId}`)[0] as any
    if (!user) {
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
      res.status(401).json({ error: '用户不存在' })
      return
    }

    const tokenPayload: TokenPayload = { userId: user.id, email: user.email || '', phone: user.phone, role: user.role }
    const newRefreshToken = generateRefreshToken(tokenPayload)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    await sql`INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (${payload.userId}, ${newRefreshToken}, ${expiresAt})`

    const newAccessToken = generateAccessToken(tokenPayload)

    res.cookie(REFRESH_COOKIE, newRefreshToken, REFRESH_COOKIE_OPTIONS)
    res.json({ accessToken: newAccessToken })
  } catch (err) {
    console.error('Refresh error:', err)
    res.status(500).json({ error: '刷新失败' })
  }
})

// POST /api/auth/logout
router.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE]
  if (token) {
    await sql`DELETE FROM refresh_tokens WHERE token = ${token}`
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = (await sql`
    SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at FROM users WHERE id = ${req.user!.userId}
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
  })
})

export default router
