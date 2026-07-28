import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'
import cardsRouter from './routes/cards.js'
import readingsRouter from './routes/readings.js'
import authRouter from './routes/auth.js'
import adminRouter from './routes/admin.js'
import profileRouter from './routes/profile.js'

const app = express()
const PORT = 3001

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : true,
  credentials: true,
}))
app.use(express.json({ limit: '50kb' }))
app.use(cookieParser())

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
  // SPA fallback: all non-API routes serve index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

// Global error handler (prevents stack trace leaks)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`🃏 Tarot API running at http://localhost:${PORT}`)
})
