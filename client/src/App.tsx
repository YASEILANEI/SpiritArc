import { useState, useRef } from 'react'
import type { Reading, LocalReading } from './types'
import { createReading, upgradeReading } from './api'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import HomePage from './pages/HomePage'
import AskPage from './pages/AskPage'
import ShufflePage from './pages/ShufflePage'
import CutPage from './pages/CutPage'
import DrawPage from './pages/DrawPage'
import ResultPage from './pages/ResultPage'
import ReadingResultPage from './pages/ReadingResultPage'
import HistoryPage from './pages/HistoryPage'
import AboutPage from './pages/AboutPage'
import AboutProductPage from './pages/AboutProductPage'
import SupportPage from './pages/SupportPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminReadingsPage from './pages/AdminReadingsPage'

type Page = 'home' | 'ask' | 'shuffle' | 'cut' | 'draw' | 'analyzing' | 'result' | 'reading-result' | 'history'
  | 'login' | 'register' | 'profile' | 'about' | 'about-product' | 'support' | 'admin' | 'admin-settings' | 'admin-users' | 'admin-readings'

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const [page, setPage] = useState<Page>('home')
  const [reading, setReading] = useState<Reading | LocalReading | null>(null)
  const [fromReadingResult, setFromReadingResult] = useState(false)
  const apiDone = useRef(false)
  const drawDone = useRef(false)
  const spreadTypeRef = useRef<'single' | 'three-card'>('single')
  const pendingReading = useRef<Reading | LocalReading | null>(null)

  // Show loading screen while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mystic-bg">
        <div className="w-8 h-8 border-2 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin" />
      </div>
    )
  }

  const tryShowResult = () => {
    if (apiDone.current && drawDone.current) {
      setReading(pendingReading.current)
      setPage('result')
    }
  }

  const handleStart = () => {
    if (!isAuthenticated) {
      setPage('login')
    } else {
      setPage('ask')
    }
  }

  const handleDraw = async (questionType: string, question: string, spreadType: 'single' | 'three-card') => {
    drawDone.current = false
    apiDone.current = false
    setFromReadingResult(false)
    spreadTypeRef.current = spreadType
    setPage('shuffle')

    createReading({ questionType, question, spreadType }).then(result => {
      pendingReading.current = result
      apiDone.current = true
      tryShowResult()
    }).catch(() => {
      if (!apiDone.current) {
        apiDone.current = true
        tryShowResult()
      }
    })
  }

  const handleShuffleComplete = () => setPage('cut')
  const handleCutComplete = () => setPage('draw')

  const handleDrawComplete = () => {
    drawDone.current = true
    setPage('analyzing')
    tryShowResult()
  }

  const handleUpgradeReading = async (id: number): Promise<Reading> => {
    const updated = await upgradeReading(id)
    setReading(updated)
    return updated
  }

  const resetReading = () => {
    setReading(null)
    pendingReading.current = null
  }

  const goHome = () => {
    resetReading()
    setPage('home')
  }

  const handleAdminNavigate = (sub: string) => {
    setPage(`admin-${sub}` as Page)
  }

  // Admin pages guard
  const isAdmin = user?.role === 'admin'
  const adminPages: Page[] = ['admin', 'admin-settings', 'admin-users', 'admin-readings']
  if (adminPages.includes(page) && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mystic-bg">
        <p className="text-red-400/80 mb-2">⚠ 无权限访问</p>
        <button onClick={() => setPage('home')} className="text-mystic-gold hover:underline text-sm">
          返回首页
        </button>
      </div>
    )
  }

  // Pages that show the top NavBar
  const navBarPages = new Set<Page>(['home', 'history', 'profile', 'about', 'about-product', 'support', 'result', 'reading-result'])

  const handleNavigate = (target: string) => {
    if (target === 'home') goHome()
    else setPage(target as Page)
  }

  return (
    <div className="min-h-screen bg-mystic-bg">
      {navBarPages.has(page) && (
        <NavBar
          currentPage={page}
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
          isAuthenticated={isAuthenticated}
          onLogin={() => setPage('login')}
        />
      )}

      {/* Auth pages */}
      {page === 'login' && (
        <LoginPage
          onSwitchToRegister={() => setPage('register')}
          onSuccess={() => setPage('home')}
        />
      )}
      {page === 'register' && (
        <RegisterPage
          onSwitchToLogin={() => setPage('login')}
          onSuccess={() => setPage('home')}
        />
      )}

      {/* Authenticated pages */}
      {page === 'home' && (
        <HomePage
          onStart={handleStart}
          onHistory={() => setPage('history')}
          user={user}
        />
      )}
      {page === 'profile' && isAuthenticated && (
        <ProfilePage onBack={() => setPage('home')} />
      )}
      {page === 'about' && (
        <AboutPage onBack={() => setPage('home')} />
      )}
      {page === 'about-product' && (
        <AboutProductPage onBack={() => setPage('home')} />
      )}
      {page === 'support' && (
        <SupportPage />
      )}
      {page === 'ask' && isAuthenticated && (
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
          onHome={goHome}
          onShowReadingResult={() => setPage('reading-result')}
          onUpgradeReading={handleUpgradeReading}
          defaultFlipped={fromReadingResult}
        />
      )}
      {page === 'reading-result' && reading && (
        <ReadingResultPage
          reading={reading}
          onBackToResult={() => { setFromReadingResult(true); setPage('result') }}
          onHome={goHome}
        />
      )}
      {page === 'history' && (
        <HistoryPage
          onBack={() => setPage('home')}
          onSelect={(r) => { setReading(r); setPage('result') }}
          onSelectResult={(r) => { setReading(r); setPage('reading-result') }}
        />
      )}

      {/* Admin pages */}
      {page === 'admin' && (
        <AdminPage onNavigate={handleAdminNavigate} onBack={() => setPage('home')} />
      )}
      {page === 'admin-settings' && (
        <AdminSettingsPage onBack={() => setPage('admin')} />
      )}
      {page === 'admin-users' && (
        <AdminUsersPage onBack={() => setPage('admin')} />
      )}
      {page === 'admin-readings' && (
        <AdminReadingsPage onBack={() => setPage('admin')} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
