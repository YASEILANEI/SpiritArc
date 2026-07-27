import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cardsRouter from './routes/cards.js'
import readingsRouter from './routes/readings.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.use('/api/cards', cardsRouter)
app.use('/api/readings', readingsRouter)

app.listen(PORT, () => {
  console.log(`🃏 Tarot API running at http://localhost:${PORT}`)
})
