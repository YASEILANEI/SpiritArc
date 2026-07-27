import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import db from '../db/index.js'
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

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, phone, password, displayName } = req.body
    if ((!email && !phone) || !password) {
      res.status(400).json({ error: '邮箱或手机号、密码为必填项' })
      return
    }
    if (password.length < 6) {
      res.status(400).json({ error: '密码至少需要6个字符' })
      return
    }

    // Check email uniqueness
    if (email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
      if (existing) {
        res.status(409).json({ error: '该邮箱已被注册' })
        return
      }
    }

    // Check phone uniqueness
    if (phone) {
      const existing = db.prepare('SELECT id FROM users WHERE phone = ?').get(phone)
      if (existing) {
        res.status(409).json({ error: '该手机号已被注册' })
        return
      }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const defaultName = displayName || (email ? email.split('@')[0] : phone)
    const result = db.prepare(
      'INSERT INTO users (email, phone, password_hash, display_name) VALUES (?, ?, ?, ?)'
    ).run(email || null, phone || null, passwordHash, defaultName)

    const userId = result.lastInsertRowid as number
    const payload: TokenPayload = { userId, email: email || '', phone, role: 'free' }
    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(userId, refreshToken, expiresAt)

    const user = db.prepare(
      'SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at FROM users WHERE id = ?'
    ).get(userId) as any

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

    const user = db.prepare(
      'SELECT id, email, phone, password_hash, display_name, avatar_url, auth_provider, role, created_at FROM users WHERE email = ? OR phone = ?'
    ).get(account, account) as any

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

    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(user.id, refreshToken, expiresAt)

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
router.post('/refresh', (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[REFRESH_COOKIE]
    if (!token) {
      res.status(401).json({ error: '未提供刷新令牌' })
      return
    }

    const stored = db.prepare(
      'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > datetime(\'now\')'
    ).get(token) as any

    if (!stored) {
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
      res.status(401).json({ error: '刷新令牌无效或已过期' })
      return
    }

    const payload = verifyRefreshToken(token)
    if (!payload) {
      db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token)
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
      res.status(401).json({ error: '刷新令牌无效' })
      return
    }

    // Rotate refresh token
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token)

    // Look up current user to get up-to-date role
    const user = db.prepare('SELECT id, email, phone, role FROM users WHERE id = ?').get(payload.userId) as any
    if (!user) {
      res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
      res.status(401).json({ error: '用户不存在' })
      return
    }

    const tokenPayload: TokenPayload = { userId: user.id, email: user.email || '', phone: user.phone, role: user.role }
    const newRefreshToken = generateRefreshToken(tokenPayload)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
    ).run(payload.userId, newRefreshToken, expiresAt)

    const newAccessToken = generateAccessToken(tokenPayload)

    res.cookie(REFRESH_COOKIE, newRefreshToken, REFRESH_COOKIE_OPTIONS)
    res.json({ accessToken: newAccessToken })
  } catch (err) {
    console.error('Refresh error:', err)
    res.status(500).json({ error: '刷新失败' })
  }
})

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE]
  if (token) {
    db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token)
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = db.prepare(
    'SELECT id, email, phone, display_name, avatar_url, auth_provider, role, created_at FROM users WHERE id = ?'
  ).get(req.user!.userId) as any

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
