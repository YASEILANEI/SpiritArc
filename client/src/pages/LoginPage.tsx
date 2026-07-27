import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { migrateLocalReadings } from '../api'

interface Props {
  onSwitchToRegister: () => void
  onSuccess: () => void
}

export default function LoginPage({ onSwitchToRegister, onSuccess }: Props) {
  const { login } = useAuth()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(account, password)
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
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-2">登录</h2>
        <p className="text-mystic-text/40 text-sm text-center mb-8">
          登录后保存你的占卜记录到云端
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-mystic-text/60 text-sm mb-1">邮箱 / 手机号</label>
            <input
              type="text"
              value={account}
              onChange={e => setAccount(e.target.value)}
              placeholder="请输入邮箱或手机号"
              required
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
              placeholder="••••••"
              required
              className="w-full px-4 py-3 bg-mystic-card border border-mystic-gold/20 rounded-lg
                text-mystic-text placeholder:text-mystic-text/30
                focus:outline-none focus:border-mystic-gold/50 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-mystic-gold text-mystic-bg rounded-full font-serif
              hover:bg-yellow-500 transition-all duration-300 shadow-lg shadow-mystic-gold/20
              disabled:opacity-50"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="mt-6 text-center text-mystic-text/40 text-sm">
          还没有账号？
          <button
            onClick={onSwitchToRegister}
            className="text-mystic-gold hover:underline ml-1"
          >
            注册
          </button>
        </p>
      </div>
    </div>
  )
}
