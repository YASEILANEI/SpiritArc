import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiFetch } from '../api'
import PageContainer from '../components/PageContainer'

interface Props {
  onBack: () => void
}

export default function ProfilePage({ onBack }: Props) {
  const { user, logout } = useAuth()
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [subscription, setSubscription] = useState<{ role: string; features: { aiReading: boolean; dailyLimit: number }; aiQuota: { remaining: number; limit: number; period: string } } | null>(null)

  useEffect(() => {
    apiFetch('/profile/subscription').then(res => {
      if (res.ok) return res.json()
    }).then(data => {
      if (data) setSubscription(data)
    }).catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const res = await apiFetch('/profile', {
        method: 'PUT',
        body: JSON.stringify({ displayName }),
      })
      if (res.ok) {
        setMessage('已保存')
      } else {
        setMessage('保存失败')
      }
    } catch {
      setMessage('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[70vh]">
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-8">个人资料</h2>

        {/* Profile form */}
        <div className="w-full bg-mystic-card/80 rounded-xl p-5 border border-mystic-gold/20 space-y-4 mb-6">
          <div>
            <label className="block text-mystic-text/60 text-sm mb-1">邮箱</label>
            <p className="text-mystic-text/80">{user?.email || '未设置'}</p>
          </div>
          {user?.phone && (
            <div>
              <label className="block text-mystic-text/60 text-sm mb-1">手机号</label>
              <p className="text-mystic-text/80">{user.phone}</p>
            </div>
          )}
          <div>
            <label className="block text-mystic-text/60 text-sm mb-1">昵称</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 bg-mystic-bg border border-mystic-gold/20 rounded-lg
                text-mystic-text focus:outline-none focus:border-mystic-gold/50 transition-colors"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2 bg-mystic-gold text-mystic-bg rounded-full text-sm
              hover:bg-yellow-500 transition-colors disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {message && (
            <p className="text-center text-sm text-mystic-gold">{message}</p>
          )}
        </div>

        {/* Subscription info */}
        <div className="w-full bg-mystic-card/80 rounded-xl p-5 border border-mystic-gold/20 space-y-3 mb-6">
          <h3 className="text-mystic-gold font-serif">会员信息</h3>
          {subscription ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-mystic-text/60">当前等级</span>
                <span className={subscription.role === 'premium' ? 'text-mystic-gold' : 'text-mystic-text/80'}>
                  {subscription.role === 'premium' ? 'Premium 会员' : '免费用户'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-mystic-text/60">牌灵解读</span>
                <span className={
                  subscription.role === 'admin'
                    ? 'text-purple-400/80'
                    : subscription.features.aiReading
                      ? 'text-green-400/80'
                      : 'text-mystic-text/40'
                }>
                  {subscription.role === 'admin'
                    ? '无限制'
                    : subscription.aiQuota.period === 'monthly'
                      ? `本月剩余 ${subscription.aiQuota.remaining} 次`
                      : `本周剩余 ${subscription.aiQuota.remaining} 次`
                  }
                </span>
              </div>
            </div>
          ) : (
            <p className="text-mystic-text/40 text-sm">加载中...</p>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); onBack() }}
          className="w-full py-2.5 border border-red-500/30 text-red-400/80 rounded-full text-sm
            hover:bg-red-900/20 transition-colors"
        >
          退出登录
        </button>
      </div>
    </PageContainer>
  )
}
