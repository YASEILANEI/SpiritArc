import jwt from 'jsonwebtoken'

if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production')
}
const ACCESS_SECRET = process.env.JWT_SECRET || 'tarot-access-secret-dev'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'tarot-refresh-secret-dev'
const ACCESS_EXPIRY = '15m'
const REFRESH_EXPIRY = '7d'

export interface TokenPayload {
  userId: number
  email: string
  phone?: string
  role: string
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY })
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRY })
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as TokenPayload
  } catch {
    return null
  }
}
