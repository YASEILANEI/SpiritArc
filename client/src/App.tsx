import { useEffect, useRef, useState } from 'react'
import type { Reading, LocalReading, FeedbackReply } from './types'
import { READING_PAGES, usePageRouter, type Page } from './router'
import { clearCurrentReading, fetchReadingById, loadCurrentReading, saveCurrentReading } from './reading-store'
import { apiFetch, createReading, upgradeReading } from './api'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import NavBar from './components/NavBar'
import FeedbackReplyModal from './components/FeedbackReplyModal'
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
import FeedbackPage from './pages/FeedbackPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import AdminPage from './pages/AdminPage'
import AdminSettingsPage from './pages/AdminSettingsPage'
import AdminUsersPage from './pages/AdminUsersPage'
import AdminReadingsPage from './pages/AdminReadingsPage'
import AdminFeedbackPage from './pages/AdminFeedbackPage'

function AppContent() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { page, readingId, navigate } = usePageRouter()
  const [reading, setReading] = useState<Reading | LocalReading | null>(null)
  const [fromReadingResult, setFromReadingResult] = useState(false)
  const [unreadReplies, setUnreadReplies] = useState<FeedbackReply[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const checkedUnreadRef = useRef(false)
  const apiDone = useRef(false)
  const drawDone = useRef(false)
  const spreadTypeRef = useRef<'single' | 'three-card'>('single')
  const pendingReading = useRef<Reading | LocalReading | null>(null)

  const restoreSeq = useRef(0)
  const prevPageRef = useRef<Page | null>(null)
  const [restoringReading, setRestoringReading] = useState(false)

  // Persist the current reading to sessionStorage so result pages survive refresh.
  useEffect(() => {
    if (reading) saveCurrentReading(reading)
  }, [reading])

  // Derive fromReadingResult from where we came from, so popstate back also works.
  useEffect(() => {
    const prev = prevPageRef.current
    prevPageRef.current = page
    if (page === 'result') setFromReadingResult(prev === 'reading-result')
  }, [page])

  // Restore reading data when landing on result/reading-result without it in memory.
  useEffect(() => {
    if (isLoading) return
    if (!READING_PAGES.has(page)) { setRestoringReading(false); return }
    if (!readingId) { navigate('home', { replace: true }); return }
    if (reading && String(reading.id) === readingId) { setRestoringReading(false); return }
    setRestoringReading(true)
    const seq = ++restoreSeq.current
    const restore = async () => {
      const cached = loadCurrentReading()
      if (cached && String(cached.id) === readingId) return cached
      return fetchReadingById(readingId)
    }
    restore().then(r => {
      if (seq !== restoreSeq.current) return
      if (r) setReading(r)
      else navigate('home', { replace: true })
      setRestoringReading(false)
    })
  }, [page, readingId, reading, isLoading, navigate])

  // Auth guard: auth-gated pages reached while logged out → login (avoids blank screen).
  useEffect(() => {
    if (isLoading) return
    if ((page === 'profile' || page === 'ask' || page === 'feedback') && !isAuthenticated) {
      navigate('login', { replace: true })
    }
  }, [page, isLoading, isAuthenticated, navigate])

  // Reset unread state and allow re-check after logout
  useEffect(() => {
    if (isAuthenticated) return
    checkedUnreadRef.current = false
    setUnreadCount(0)
    setShowReplyModal(false)
  }, [isAuthenticated])

  // On login, check for admin replies the user hasn't seen yet and show the modal
  useEffect(() => {
    if (isLoading || !isAuthenticated || checkedUnreadRef.current) return
    checkedUnreadRef.current = true
    apiFetch('/feedback/unread')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.unread) && data.unread.length > 0) {
          setUnreadReplies(data.unread)
          setUnreadCount(data.unread.length)
          setShowReplyModal(true)
        }
      })
      .catch(() => {})
  }, [isLoading, isAuthenticated])

  const dismissReplyModal = () => setShowReplyModal(false)

  const readAllReplies = async () => {
    try {
      await apiFetch('/feedback/read-all', { method: 'POST' })
    } catch { /* ignore */ }
    setUnreadCount(0)
    setShowReplyModal(false)
  }

  const viewFeedbackReading = async (readingId: number) => {
    setShowReplyModal(false)
    const r = await fetchReadingById(String(readingId))
    if (r) {
      setReading(r)
      navigate('reading-result', { readingId: String(readingId) })
    }
  }

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
      const r = pendingReading.current
      if (r) {
        setReading(r)
        navigate('result', { replace: true, readingId: String(r.id) })
      } else {
        // API failed without a reading — don't land on a blank result page.
        goHome()
      }
    }
  }

  const handleStart = () => {
    if (!isAuthenticated) {
      navigate('login')
    } else {
      navigate('ask')
    }
  }

  const handleDraw = async (questionType: string, question: string, spreadType: 'single' | 'three-card') => {
    drawDone.current = false
    apiDone.current = false
    setFromReadingResult(false)
    spreadTypeRef.current = spreadType
    navigate('shuffle')

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

  const handleShuffleComplete = () => navigate('cut', { replace: true })
  const handleCutComplete = () => navigate('draw', { replace: true })

  const handleDrawComplete = () => {
    drawDone.current = true
    navigate('analyzing', { replace: true })
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
    clearCurrentReading()
  }

  const goHome = () => {
    resetReading()
    navigate('home', { replace: true })
  }

  const handleAdminNavigate = (sub: string) => {
    navigate(`admin-${sub}` as Page)
  }

  // Admin pages guard
  const isAdmin = user?.role === 'admin'
  const adminPages: Page[] = ['admin', 'admin-settings', 'admin-users', 'admin-readings', 'admin-feedback']
  if (adminPages.includes(page) && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-mystic-bg">
        <p className="text-red-400/80 mb-2">⚠ 无权限访问</p>
        <button onClick={() => navigate('home')} className="text-mystic-gold hover:underline text-sm">
          返回首页
        </button>
      </div>
    )
  }

  // Pages that show the top NavBar
  const navBarPages = new Set<Page>(['home', 'history', 'profile', 'about', 'about-product', 'support', 'feedback', 'result', 'reading-result'])

  const handleNavigate = (target: string) => {
    if (target === 'home') goHome()
    else navigate(target as Page)
  }

  return (
    <div className="min-h-screen bg-mystic-bg">
      {navBarPages.has(page) && (
        <NavBar
          currentPage={page}
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
          isAuthenticated={isAuthenticated}
          onLogin={() => navigate('login')}
          unreadReplies={unreadCount}
        />
      )}

      {/* Auth pages */}
      {page === 'login' && (
        <LoginPage
          onSwitchToRegister={() => navigate('register', { replace: true })}
          onSuccess={() => navigate('home', { replace: true })}
        />
      )}
      {page === 'register' && (
        <RegisterPage
          onSwitchToLogin={() => navigate('login', { replace: true })}
          onSuccess={() => navigate('home', { replace: true })}
        />
      )}

      {/* Authenticated pages */}
      {page === 'home' && (
        <HomePage
          onStart={handleStart}
          onHistory={() => navigate('history')}
          user={user}
        />
      )}
      {page === 'profile' && isAuthenticated && (
        <ProfilePage onBack={() => navigate('home')} />
      )}
      {page === 'about' && (
        <AboutPage onBack={() => navigate('home')} />
      )}
      {page === 'about-product' && (
        <AboutProductPage onBack={() => navigate('home')} />
      )}
      {page === 'support' && (
        <SupportPage />
      )}
      {page === 'feedback' && (
        <FeedbackPage onBack={() => navigate('home')} />
      )}
      {page === 'ask' && isAuthenticated && (
        <AskPage onDraw={handleDraw} onBack={() => navigate('home')} />
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
      {restoringReading && (
        <div className="min-h-screen flex items-center justify-center bg-mystic-bg">
          <div className="w-8 h-8 border-2 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin" />
        </div>
      )}
      {page === 'result' && reading && (
        <ResultPage
          reading={reading}
          onBack={() => navigate('history', { replace: true })}
          onHome={goHome}
          onShowReadingResult={() => navigate('reading-result', { readingId: String(reading.id) })}
          onUpgradeReading={handleUpgradeReading}
          defaultFlipped={fromReadingResult}
        />
      )}
      {page === 'reading-result' && reading && (
        <ReadingResultPage
          reading={reading}
          onBackToResult={() => { setFromReadingResult(true); navigate('result', { replace: true, readingId: String(reading.id) }) }}
          onHome={goHome}
        />
      )}
      {page === 'history' && (
        <HistoryPage
          onBack={() => navigate('home')}
          onSelect={(r) => { setReading(r); navigate('result', { readingId: String(r.id) }) }}
          onSelectResult={(r) => { setReading(r); navigate('reading-result', { readingId: String(r.id) }) }}
        />
      )}

      {/* Admin pages */}
      {page === 'admin' && (
        <AdminPage onNavigate={handleAdminNavigate} onBack={() => navigate('home')} />
      )}
      {page === 'admin-settings' && (
        <AdminSettingsPage onBack={() => navigate('admin', { replace: true })} />
      )}
      {page === 'admin-users' && (
        <AdminUsersPage onBack={() => navigate('admin', { replace: true })} />
      )}
      {page === 'admin-readings' && (
        <AdminReadingsPage onBack={() => navigate('admin', { replace: true })} />
      )}
      {page === 'admin-feedback' && (
        <AdminFeedbackPage onBack={() => navigate('admin', { replace: true })} />
      )}

      {/* Unread admin reply modal */}
      {showReplyModal && (
        <FeedbackReplyModal
          replies={unreadReplies}
          onClose={dismissReplyModal}
          onRead={readAllReplies}
          onViewReading={viewFeedbackReading}
        />
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
