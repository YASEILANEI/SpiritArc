import jwt from 'jsonwebtoken'

const ACCESS_SECRET = process.env.JWT_SECRET
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in production')
  }
  console.warn('⚠️  WARNING: JWT_SECRET or JWT_REFRESH_SECRET not set. Using weak dev fallback.')
}

const ACCESS_SECRET_KEY = ACCESS_SECRET || 'tarot-access-secret-dev'
const REFRESH_SECRET_KEY = REFRESH_SECRET || 'tarot-refresh-secret-dev'
const ACCESS_EXPIRY = '15m'
const REFRESH_EXPIRY = '7d'

export interface TokenPayload {
  userId: number
  email: string
  phone?: string
  role: string
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET_KEY, { expiresIn: ACCESS_EXPIRY })
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_SECRET_KEY, { expiresIn: REFRESH_EXPIRY })
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET_KEY) as TokenPayload
  } catch {
    return null
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET_KEY) as TokenPayload
  } catch {
    return null
  }
}
