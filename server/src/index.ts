import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
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
app.use(express.json())
app.use(cookieParser())

app.use('/api/auth', authRouter)
app.use('/api/profile', profileRouter)
app.use('/api/admin', adminRouter)
app.use('/api/cards', cardsRouter)
app.use('/api/readings', readingsRouter)

app.listen(PORT, () => {
  console.log(`🃏 Tarot API running at http://localhost:${PORT}`)
})
