import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import path from 'path'
import { fileURLToPath } from 'url'
import cardsRouter from './routes/cards.js'
import readingsRouter from './routes/readings.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import profileRouter from './routes/profile.js'

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

// CORS: must be configured in production
const corsOrigin = process.env.CORS_ORIGIN
if (!corsOrigin && process.env.NODE_ENV === 'production') {
  throw new Error('CORS_ORIGIN must be set in production environment')
}
app.use(cors({
  origin: (corsOrigin || 'http://localhost:5173').split(','),
  credentials: true,
}))

app.use(express.json({ limit: '500kb' }))
app.use(cookieParser())

// Health check for Render
app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/admin', adminRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/readings', readingsRouter)

// Production: serve client static files
if (process.env.NODE_ENV === 'production') {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist')
  app.use(express.static(clientDist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`🃏 Tarot API running at http://localhost:${PORT}`)
})
