import { Router } from 'express'
import sql from '../db/index.js'

const router = Router()

const PROMO_TOTAL = 100

// GET /api/promo/first100 — 前 100 名注册活动剩余名额（公开）
router.get('/first100', async (_req, res) => {
  try {
    const row = (await sql`SELECT value FROM settings WHERE key = 'PROMO_FIRST_100_TAKEN'`)[0]
    const taken = Number(row?.value ?? '0')
    res.json({
      total: PROMO_TOTAL,
      taken,
      remaining: Math.max(0, PROMO_TOTAL - taken),
    })
  } catch (err) {
    console.error('Promo status error:', err)
    res.status(500).json({ error: '服务器内部错误' })
  }
})

export default router
