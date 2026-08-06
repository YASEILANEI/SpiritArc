import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

interface Stats {
  totalUsers: number
  totalReadings: number
  todayReadings: number
  activeUsers: number
  aiReadings: number
  templateReadings: number
}

interface Props {
  onNavigate: (page: string) => void
  onBack: () => void
}

export default function AdminPage({ onNavigate, onBack }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/admin/stats')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setStats(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <button onClick={onBack} className="text-mystic-text/50 hover:text-mystic-gold transition-colors mb-4">
          ← 返回
        </button>
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-6">管理后台</h2>

        {/* Stats at top */}
        {loading ? (
          <p className="text-mystic-text/40 text-center py-8">加载中...</p>
        ) : stats ? (
          <div className="grid grid-cols-3 gap-2 mb-8">
            <div className="bg-mystic-card/80 rounded-xl p-3 border border-mystic-gold/20 text-center">
              <div className="text-xl text-mystic-gold font-serif">{stats.totalUsers}</div>
              <div className="text-mystic-text/40 text-[10px] mt-0.5">总用户</div>
            </div>
            <div className="bg-mystic-card/80 rounded-xl p-3 border border-mystic-gold/20 text-center">
              <div className="text-xl text-mystic-gold font-serif">{stats.totalReadings}</div>
              <div className="text-mystic-text/40 text-[10px] mt-0.5">总占卜</div>
            </div>
            <div className="bg-mystic-card/80 rounded-xl p-3 border border-mystic-gold/20 text-center">
              <div className="text-xl text-mystic-gold font-serif">{stats.activeUsers}</div>
              <div className="text-mystic-text/40 text-[10px] mt-0.5">活跃用户</div>
            </div>
            <div className="bg-mystic-card/80 rounded-xl p-3 border border-green-500/20 text-center">
              <div className="text-xl text-green-400/80 font-serif">{stats.aiReadings}</div>
              <div className="text-mystic-text/40 text-[10px] mt-0.5">牌灵解读</div>
            </div>
            <div className="bg-mystic-card/80 rounded-xl p-3 border border-mystic-text/10 text-center">
              <div className="text-xl text-mystic-text/60 font-serif">{stats.templateReadings}</div>
              <div className="text-mystic-text/40 text-[10px] mt-0.5">模板解读</div>
            </div>
            <div className="bg-mystic-card/80 rounded-xl p-3 border border-blue-500/20 text-center">
              <div className="text-xl text-blue-400/80 font-serif">{stats.todayReadings}</div>
              <div className="text-mystic-text/40 text-[10px] mt-0.5">今日占卜</div>
            </div>
          </div>
        ) : (
          <p className="text-red-400/80 text-center py-8 mb-8">加载统计数据失败</p>
        )}

        {/* Admin modules */}
        <div className="text-sm text-mystic-text/40 mb-3 font-serif">功能管理</div>
        <div className="space-y-3">
          <button
            onClick={() => onNavigate('users')}
            className="w-full text-left bg-mystic-card/80 rounded-xl p-4 border border-mystic-gold/20
              hover:border-mystic-gold/40 transition-all flex items-center gap-3"
          >
            <span className="text-xl">👥</span>
            <div>
              <div className="text-mystic-gold font-serif text-sm">用户管理</div>
              <div className="text-mystic-text/40 text-xs mt-0.5">查看和管理所有注册用户</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('readings')}
            className="w-full text-left bg-mystic-card/80 rounded-xl p-4 border border-mystic-gold/20
              hover:border-mystic-gold/40 transition-all flex items-center gap-3"
          >
            <span className="text-xl">📋</span>
            <div>
              <div className="text-mystic-gold font-serif text-sm">占卜记录</div>
              <div className="text-mystic-text/40 text-xs mt-0.5">查看和管理所有占卜记录</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('feedback')}
            className="w-full text-left bg-mystic-card/80 rounded-xl p-4 border border-mystic-gold/20
              hover:border-mystic-gold/40 transition-all flex items-center gap-3"
          >
            <span className="text-xl">✉</span>
            <div>
              <div className="text-mystic-gold font-serif text-sm">反馈管理</div>
              <div className="text-mystic-text/40 text-xs mt-0.5">查看和处理用户反馈</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('settings')}
            className="w-full text-left bg-mystic-card/80 rounded-xl p-4 border border-mystic-gold/20
              hover:border-mystic-gold/40 transition-all flex items-center gap-3"
          >
            <span className="text-xl">⚙</span>
            <div>
              <div className="text-mystic-gold font-serif text-sm">系统设置</div>
              <div className="text-mystic-text/40 text-xs mt-0.5">配置 AI 模型、API Key 等参数</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
