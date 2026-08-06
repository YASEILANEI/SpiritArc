import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { migrateLocalReadings } from '../api'
import LegalModal from '../components/LegalModal'

const PASSWORD_REQUIREMENTS = [
  { test: (p: string) => p.length >= 8, label: '至少 8 个字符' },
  { test: (p: string) => p.length <= 128, label: '不超过 128 个字符' },
  { test: (p: string) => /[A-Z]/.test(p), label: '包含一个大写字母' },
  { test: (p: string) => /[0-9]/.test(p), label: '包含一个数字' },
]

interface Props {
  onSwitchToLogin: () => void
  onSuccess: () => void
}

export default function RegisterPage({ onSwitchToLogin, onSuccess }: Props) {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [openDoc, setOpenDoc] = useState<'terms' | 'privacy' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email && !phone) {
      setError('邮箱和手机号至少填一个')
      return
    }
    if (password.length < 8) {
      setError('密码至少需要 8 个字符')
      return
    }
    if (password.length > 128) {
      setError('密码不能超过 128 个字符')
      return
    }
    if (!/[A-Z]/.test(password)) {
      setError('密码需要至少一个大写字母')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('密码需要至少一个数字')
      return
    }
    if (!accepted) {
      setError('请先阅读并同意用户协议和隐私政策')
      return
    }
    setLoading(true)
    try {
      await register(email || undefined, phone || undefined, password, displayName || undefined, accepted)
      await migrateLocalReadings()
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={onSuccess}
          className="text-mystic-text/50 hover:text-mystic-gold transition-colors mb-2"
        >
          ← 返回
        </button>
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-2">注册</h2>
        <p className="text-mystic-text/40 text-sm text-center mb-8">
          创建账号，随时查阅你的占卜记录
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-mystic-text/60 text-sm mb-1">邮箱 <span className="text-mystic-text/30">（选填，与手机号至少填一个）</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
                text-mystic-text placeholder:text-mystic-text/30
                focus:outline-none focus:border-mystic-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-mystic-text/60 text-sm mb-1">手机号 <span className="text-mystic-text/30">（选填）</span></label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="请输入手机号"
              className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
                text-mystic-text placeholder:text-mystic-text/30
                focus:outline-none focus:border-mystic-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-mystic-text/60 text-sm mb-1">昵称（选填）</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="如何称呼你？"
              className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
                text-mystic-text placeholder:text-mystic-text/30
                focus:outline-none focus:border-mystic-gold/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-mystic-text/60 text-sm mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              minLength={8}
              maxLength={128}
              className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
                text-mystic-text placeholder:text-mystic-text/30
                focus:outline-none focus:border-mystic-gold/50 transition-colors"
            />
            <ul className="mt-2 space-y-1">
              {PASSWORD_REQUIREMENTS.map(req => {
                const passed = req.test(password)
                return (
                  <li
                    key={req.label}
                    className={`text-xs flex items-center gap-1.5 transition-colors ${
                      passed ? 'text-emerald-400' : 'text-mystic-text/40'
                    }`}
                  >
                    <span>{passed ? '✓' : '○'}</span>
                    {req.label}
                  </li>
                )
              })}
            </ul>
          </div>
          <label className="flex items-start gap-2 text-sm text-mystic-text/60 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={accepted}
              onChange={e => setAccepted(e.target.checked)}
              className="mt-0.5 accent-mystic-gold"
            />
            <span>
              我已阅读并同意
              <button type="button" onClick={() => setOpenDoc('terms')} className="text-mystic-gold hover:underline">
                《用户协议》
              </button>
              和
              <button type="button" onClick={() => setOpenDoc('privacy')} className="text-mystic-gold hover:underline">
                《隐私政策》
              </button>
            </span>
          </label>
          <button
            type="submit"
            disabled={loading || !accepted}
            className="w-full py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif
              hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-mystic-gold/20
              disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="mt-6 text-center text-mystic-text/40 text-sm">
          已有账号？
          <button
            onClick={onSwitchToLogin}
            className="text-mystic-gold hover:underline ml-1"
          >
            登录
          </button>
        </p>
      </div>

      {openDoc && <LegalModal doc={openDoc} onClose={() => setOpenDoc(null)} />}
    </div>
  )
}
