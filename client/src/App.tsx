import { useState, useRef } from 'react'
import type { Reading, LocalReading } from './types'
import { createReading } from './api'
import HomePage from './pages/HomePage'
import AskPage from './pages/AskPage'
import ShufflePage from './pages/ShufflePage'
import CutPage from './pages/CutPage'
import DrawPage from './pages/DrawPage'
import ResultPage from './pages/ResultPage'
import ReadingResultPage from './pages/ReadingResultPage'
import HistoryPage from './pages/HistoryPage'

type Page = 'home' | 'ask' | 'shuffle' | 'cut' | 'draw' | 'analyzing' | 'result' | 'reading-result' | 'history'

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [reading, setReading] = useState<Reading | LocalReading | null>(null)
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
    setPage('shuffle')

    // Background API call — AI generates while user does shuffle → cut → draw
    createReading({ questionType, question, spreadType }).then(result => {
      pendingReading.current = result
      apiDone.current = true
      tryShowResult()
    })
  }

  const handleShuffleComplete = () => {
    setPage('cut')
  }

  const handleCutComplete = () => {
    setPage('draw')
  }

  const handleDrawComplete = () => {
    drawDone.current = true
    setPage('analyzing')
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
          spreadType={spreadTypeRef.current}
          onComplete={handleDrawComplete}
        />
      )}
      {page === 'analyzing' && (
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="w-16 h-16 border-2 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin mb-8" />
          <h2 className="text-xl font-serif text-mystic-gold mb-3">牌灵正在分析你的占卜</h2>
          <p className="text-mystic-text/40 text-sm mb-12">请稍候，解读即将呈现...</p>

          <div className="grid grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-full bg-mystic-card/60 border border-mystic-gold/20 flex items-center justify-center"
                style={{
                  animation: `pulse 1.5s ease-in-out ${i * 0.3}s infinite`,
                }}
              >
                <span className="text-mystic-gold/60 text-lg">✦</span>
              </div>
            ))}
          </div>
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; transform: scale(0.9); }
              50% { opacity: 1; transform: scale(1.1); }
            }
          `}</style>

          <p className="mt-12 text-mystic-text/30 text-xs text-center max-w-xs leading-relaxed">
            你的问题已被接收，牌灵正在结合塔罗牌义与你的具体情况进行解读
          </p>
        </div>
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
