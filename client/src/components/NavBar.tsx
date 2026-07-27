interface NavBarProps {
  currentPage: string
  onNavigate: (page: string) => void
  isAdmin: boolean
  isAuthenticated: boolean
  onLogin?: () => void
}

const NAV_ITEMS = [
  { page: 'home', label: '牌灵首页', icon: '✧' },
  { page: 'history', label: '占卜历史', icon: '⟡' },
  { page: 'about', label: '关于我们', icon: 'ℹ' },
  { page: 'support', label: '支持一下', icon: '♥' },
] as const

export default function NavBar({ currentPage, onNavigate, isAdmin, isAuthenticated, onLogin }: NavBarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-mystic-bg/80 backdrop-blur-md border-b border-transparent"
      style={{
        borderImage: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.3), transparent) 1',
      }}
    >
      <div className="max-w-4xl mx-auto h-full flex items-center justify-center px-8">
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
        <div className="flex items-center gap-3 overflow-x-auto flex-nowrap" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {NAV_ITEMS.map(item => {
            const isActive = currentPage === item.page
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm whitespace-nowrap
                  ${isActive
                    ? 'text-mystic-gold [text-shadow:0_0_12px_rgba(201,168,76,0.5)]'
                    : 'text-mystic-text/50 hover:text-mystic-text/80'
                  }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            )
          })}

          {isAuthenticated ? (
            <button
              onClick={() => onNavigate('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm whitespace-nowrap
                ${currentPage === 'profile'
                  ? 'text-mystic-gold [text-shadow:0_0_12px_rgba(201,168,76,0.5)]'
                  : 'text-mystic-text/50 hover:text-mystic-text/80'
                }`}
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-sm whitespace-nowrap
                ${currentPage.startsWith('admin')
                  ? 'text-mystic-gold [text-shadow:0_0_12px_rgba(201,168,76,0.5)]'
                  : 'text-mystic-text/50 hover:text-mystic-text/80'
                }`}
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
