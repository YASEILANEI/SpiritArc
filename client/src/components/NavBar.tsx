import { useEffect, useRef, useState } from 'react'

interface NavBarProps {
  currentPage: string
  onNavigate: (page: string) => void
  isAdmin: boolean
  isAuthenticated: boolean
  onLogin?: () => void
  unreadReplies?: number
}

interface NavChild { page: string; label: string; icon: string }
interface NavLinkItem { kind: 'link'; page: string; label: string; icon: string }
interface NavDropdownItem { kind: 'dropdown'; label: string; icon: string; children: NavChild[] }
type NavItem = NavLinkItem | NavDropdownItem

const NAV_ITEMS: NavItem[] = [
  { kind: 'link', page: 'home', label: '牌灵首页', icon: '✧' },
  { kind: 'link', page: 'history', label: '占卜历史', icon: '⟡' },
  { kind: 'link', page: 'feedback', label: '意见反馈', icon: '✉' },
  { kind: 'link', page: 'support', label: '支持一下', icon: '♥' },
  { kind: 'dropdown', label: '关于', icon: 'ℹ', children: [
    { page: 'about', label: '关于我们', icon: '✦' },
    { page: 'about-product', label: '关于产品', icon: '✦' },
  ]},
]

const LINK_BASE = 'relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm whitespace-nowrap'

function linkClass(active: boolean) {
  return `${LINK_BASE} ${
    active
      ? 'text-mystic-gold [text-shadow:0_0_12px_rgba(201,168,76,0.5)]'
      : 'text-mystic-text/50 hover:text-mystic-text/80'
  }`
}

function NavDropdown({
  item,
  currentPage,
  isOpen,
  onOpen,
  onClose,
  onNavigate,
}: {
  item: NavDropdownItem
  currentPage: string
  isOpen: boolean
  onOpen: () => void
  onClose: () => void
  onNavigate: (page: string) => void
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const closeTimer = useRef<number | null>(null)

  // Close when clicking anywhere outside the trigger + panel.
  useEffect(() => {
    if (!isOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [isOpen, onClose])

  // Clear the close timer on unmount so a pending close can't fire later.
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }, [])

  // The panel sits flush under the trigger (rect.bottom) with its own top
  // padding, so there's no dead zone between them. The timer only guards fast
  // diagonal moves that momentarily leave the wrapper before landing on the panel.
  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
  }
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(onClose, 150)
  }

  const open = () => {
    cancelClose()
    if (!isOpen) {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (rect) {
        // Clamp to viewport so the panel can't overflow the right edge (it's min-w-[160px])
        const panelWidth = 160
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - panelWidth - 8))
        setPos({ top: rect.bottom, left })
      }
    }
    onOpen()
  }

  const active = item.children.some(c => c.page === currentPage)

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
    >
      <button
        onClick={() => (isOpen ? onClose() : open())}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={linkClass(active)}
      >
        <span>{item.icon}</span>
        <span>{item.label}</span>
        <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && pos && (
        <div
          role="menu"
          className="fixed z-50 min-w-[160px] bg-mystic-card/95 backdrop-blur border border-mystic-gold/20 rounded-xl shadow-xl pt-2 pb-1.5 px-1.5"
          style={{ top: pos.top, left: pos.left }}
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          {item.children.map(child => (
            <button
              key={child.page}
              role="menuitem"
              onClick={() => onNavigate(child.page)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm w-full text-left transition-all
                ${child.page === currentPage
                  ? 'text-mystic-gold [text-shadow:0_0_12px_rgba(201,168,76,0.5)] bg-mystic-gold/10'
                  : 'text-mystic-text/60 hover:text-mystic-text/90 hover:bg-mystic-gold/5'
                }`}
            >
              <span>{child.icon}</span>
              <span>{child.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function NavBar({ currentPage, onNavigate, isAdmin, isAuthenticated, onLogin, unreadReplies = 0 }: NavBarProps) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)

  const handleNavigate = (page: string) => {
    setOpenMenu(null)
    onNavigate(page)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-mystic-bg/80 backdrop-blur-md border-b border-transparent"
      style={{
        borderImage: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent) 1',
      }}
    >
      <div className="max-w-6xl mx-auto h-full flex items-center justify-center px-8">
        {/* Brand */}
        <button
          onClick={() => onNavigate('home')}
          className="text-mystic-gold font-serif text-base tracking-wide hover:opacity-80 transition-opacity shrink-0 mr-4"
        >
          <span className="text-mystic-gold font-serif text-lg tracking-wide hover:opacity-80 transition-opacity shrink-0 mr-3 flex items-baseline gap-2">
            <span>✦ 牌灵</span>
            <span className="hidden sm:inline text-[10px] text-mystic-gold/40 tracking-widest">SpiritArc</span>
          </span>
        </button>

        {/* Navigation */}
        <div className="flex items-center gap-4 overflow-x-auto flex-nowrap" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {NAV_ITEMS.map(item => {
            if (item.kind === 'dropdown') {
              return (
                <NavDropdown
                  key={item.label}
                  item={item}
                  currentPage={currentPage}
                  isOpen={openMenu === item.label}
                  onOpen={() => setOpenMenu(item.label)}
                  onClose={() => setOpenMenu(null)}
                  onNavigate={handleNavigate}
                />
              )
            }
            const isActive = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={linkClass(isActive)}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {item.page === 'feedback' && unreadReplies > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>
            )
          })}

          {isAuthenticated ? (
            <button
              onClick={() => onNavigate('profile')}
              className={linkClass(currentPage === 'profile')}
            >
              <span>◎</span>
              <span>个人中心</span>
            </button>
          ) : onLogin && (
            <button
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm whitespace-nowrap
                text-mystic-text/50 hover:text-mystic-gold"
            >
              <span>→</span>
              <span>登录</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className={linkClass(currentPage.startsWith('admin'))}
            >
              <span>⚙</span>
              <span>管理后台</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
