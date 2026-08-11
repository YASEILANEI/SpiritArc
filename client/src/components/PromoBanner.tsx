import { useEffect, useState } from 'react'
import { apiFetch } from '../api'
import type { User } from '../types'

interface PromoStatus {
  total: number
  taken: number
  remaining: number
}

interface Props {
  user: User | null
  onRegister: () => void
}

export default function PromoBanner({ user, onRegister }: Props) {
  const [status, setStatus] = useState<PromoStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    apiFetch('/promo/first100')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setStatus(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (user || !status || status.remaining <= 0) return null

  return (
    <div className="w-full max-w-lg mx-auto mt-8 bg-mystic-card/60 rounded-xl p-4 border border-mystic-gold/40 shadow-lg shadow-mystic-gold/10 text-center">
      <p className="text-sm font-serif text-mystic-gold">
        ✦ 前 {status.total} 名注册用户 · 免费升级 Premium 会员
      </p>
      <p className="mt-1 text-xs text-mystic-text/50">
        仅剩 <span className="text-mystic-gold font-medium">{status.remaining}</span> 个名额
      </p>
      <button
        onClick={onRegister}
        className="mt-3 px-6 py-2 bg-mystic-gold text-mystic-bg rounded-full font-serif text-sm hover:bg-yellow-500 transition-all duration-300"
      >
        立即注册
      </button>
    </div>
  )
}
