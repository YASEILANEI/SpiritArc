import { useState, useRef } from 'react'
import type { Reading, LocalReading, DrawnCard } from './types'
import { createReading } from './api'
import HomePage from './pages/HomePage'
import AskPage from './pages/AskPage'
import ShufflePage from './pages/ShufflePage'
import CutPage from './pages/CutPage'
import DrawPage from './pages/DrawPage'
import ResultPage from './pages/ResultPage'
import ReadingResultPage from './pages/ReadingResultPage'
import HistoryPage from './pages/HistoryPage'

type Page = 'home' | 'ask' | 'shuffle' | 'cut' | 'draw' | 'result' | 'reading-result' | 'history'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [reading, setReading] = useState<Reading | LocalReading | null>(null)
  const [drawCards, setDrawCards] = useState<DrawnCard[] | undefined>(undefined)
  const shuffleDone = useRef(false)
  const apiDone = useRef(false)
  const drawDone = useRef(false)
  const spreadTypeRef = useRef<'single' | 'three-card'>('single')
  const pendingReading = useRef<Reading | LocalReading | null>(null)

  const tryShowResult = () => {
    if (apiDone.current && drawDone.current) {
      setReading(pendingReading.current)
      setPage('result')
    }
  }

  const handleStart = () => setPage('ask')

  const handleDraw = async (questionType: string, question: string, spreadType: 'single' | 'three-card') => {
    drawDone.current = false
    apiDone.current = false
    spreadTypeRef.current = spreadType
    setDrawCards(undefined)
    setPage('shuffle')

    // Background API call — AI generates while user does shuffle → cut → draw
    createReading({ questionType, question, spreadType }).then(result => {
      pendingReading.current = result
      setDrawCards(result.cards)
      apiDone.current = true
      tryShowResult()
    })
  }

  const handleShuffleComplete = () => {
    setPage('cut')
  }

  const handleCutComplete = () => {
    setPage('draw')
    // If API already finished, cards are ready
    if (pendingReading.current) {
      setDrawCards(pendingReading.current.cards)
    }
  }

  const handleDrawComplete = () => {
    drawDone.current = true
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
        <ShufflePage onComplete={handleShuffleComplete} />
      )}
      {page === 'cut' && (
        <CutPage onComplete={handleCutComplete} />
      )}
      {page === 'draw' && (
        <DrawPage
          cards={drawCards}
          spreadType={spreadTypeRef.current}
          onComplete={handleDrawComplete}
        />
      )}
      {page === 'result' && reading && (
        <ResultPage
          reading={reading}
          onBack={() => setPage('history')}
          onHome={() => { setReading(null); pendingReading.current = null; setPage('home') }}
          onShowReadingResult={() => setPage('reading-result')}
        />
      )}
      {page === 'reading-result' && reading && (
        <ReadingResultPage
          reading={reading}
          onBackToResult={() => setPage('result')}
          onHome={() => { setReading(null); pendingReading.current = null; setPage('home') }}
        />
      )}
      {page === 'history' && (
        <HistoryPage
          onBack={() => setPage('home')}
          onSelect={(r) => { setReading(r); setPage('result') }}
          onSelectResult={(r) => { setReading(r); setPage('reading-result') }}
        />
      )}
    </div>
  )
}
