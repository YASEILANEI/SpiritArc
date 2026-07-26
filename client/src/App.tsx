import { useState, useRef } from 'react'
import type { Reading, LocalReading } from './types'
import { createReading } from './api'
import HomePage from './pages/HomePage'
import AskPage from './pages/AskPage'
import ShufflePage from './pages/ShufflePage'
import ResultPage from './pages/ResultPage'
import HistoryPage from './pages/HistoryPage'

type Page = 'home' | 'ask' | 'shuffle' | 'result' | 'history'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [reading, setReading] = useState<Reading | LocalReading | null>(null)
  const shuffleDone = useRef(false)
  const apiDone = useRef(false)
  const pendingReading = useRef<Reading | LocalReading | null>(null)

  const tryShowResult = () => {
    if (shuffleDone.current && apiDone.current) {
      setReading(pendingReading.current)
      setPage('result')
    }
  }

  const handleStart = () => setPage('ask')

  const handleDraw = async (questionType: string, question: string, spreadType: 'single' | 'three-card') => {
    apiDone.current = false
    shuffleDone.current = false
    setPage('shuffle')

    const result = await createReading({ questionType, question, spreadType })
    pendingReading.current = result
    apiDone.current = true
    tryShowResult()
  }

  return (
    <div className="min-h-screen bg-mystic-bg">
      {page === 'home' && (
        <HomePage onStart={handleStart} onHistory={() => setPage('history')} />
      )}
      {page === 'ask' && (
        <AskPage onDraw={handleDraw} onBack={() => setPage('home')} />
      )}
      {page === 'shuffle' && (
        <ShufflePage onComplete={() => {
          shuffleDone.current = true
          tryShowResult()
        }} />
      )}
      {page === 'result' && reading && (
        <ResultPage
          reading={reading}
          onBack={() => setPage('history')}
          onHome={() => { setReading(null); pendingReading.current = null; setPage('home') }}
        />
      )}
      {page === 'history' && (
        <HistoryPage
          onBack={() => setPage('home')}
          onSelect={(r) => { setReading(r); setPage('result') }}
        />
      )}
    </div>
  )
}
