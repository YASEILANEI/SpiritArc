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
        if (!req.user) {
          res.status(401).json({ error: '未提供认证令牌' })
          return
        }
        // Always read the role from the DB: the JWT claim can be up to 15
        // minutes stale, so a demoted admin would otherwise keep access until
        // the next token refresh. A deleted user must be rejected outright.
        const user = (await sql`SELECT role FROM users WHERE id = ${req.user.userId}`)[0] as any
        if (!user) {
          res.status(401).json({ error: '用户不存在' })
          return
        }
        const role = user.role
        if (!roles.includes(role)) {
          res.status(403).json({ error: '无权限访问' })
          return
        }
        req.user.role = role
        next()
      } catch (err) {
        console.error('requireRole error:', err)
        res.status(500).json({ error: '服务器内部错误' })
      }
    })
  }
}
