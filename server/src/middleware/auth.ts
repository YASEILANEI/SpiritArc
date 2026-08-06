import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js'
import sql from '../db/index.js'

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供认证令牌' })
    return
  }

  const token = header.slice(7)
  const payload = verifyAccessToken(token)
  if (!payload) {
    res.status(401).json({ error: '令牌无效或已过期' })
    return
  }

  req.user = payload
  next()
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice(7)
    const payload = verifyAccessToken(token)
    if (payload) {
      req.user = payload
    }
  }
  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    authMiddleware(req, res, async () => {
      try {
        const role = req.user?.role
        // Backward compat: old tokens without role — query DB
        if (!role && req.user) {
          const user = (await sql`SELECT role FROM users WHERE id = ${req.user.userId}`)[0] as any
          if (user) {
            req.user.role = user.role
          }
        }
        if (!req.user?.role || !roles.includes(req.user.role)) {
          res.status(403).json({ error: '无权限访问' })
          return
        }
        next()
      } catch (err) {
        console.error('requireRole error:', err)
        res.status(500).json({ error: '服务器内部错误' })
      }
    })
  }
}
