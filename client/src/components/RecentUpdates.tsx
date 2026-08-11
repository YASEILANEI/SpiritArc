import { useState } from 'react'
import { RECENT_UPDATES, type RecentUpdate, type UpdateTag } from '../data/recent-updates'

const MAX_VISIBLE = 3

const TAG_META: Record<UpdateTag, { icon: string; label: string; badgeClass: string }> = {
  feature: {
    icon: '✦',
    label: '新功能',
    badgeClass: 'bg-mystic-gold/20 text-mystic-gold border-mystic-gold/30',
  },
  improvement: {
    icon: '↑',
    label: '改进',
    badgeClass: 'bg-mystic-accent/20 text-mystic-accent border-mystic-accent/40',
  },
  fix: {
    icon: '✚',
    label: '修复',
    badgeClass: 'bg-yellow-900/30 text-yellow-400/80 border-yellow-700/30',
  },
  security: {
    icon: '❖',
    label: '安全',
    badgeClass: 'bg-red-900/20 text-red-400/80 border-red-500/20',
  },
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

interface Props {
  updates?: RecentUpdate[]
  className?: string
}

export default function RecentUpdates({ updates = RECENT_UPDATES, className = '' }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (updates.length === 0) return null

  const hasMore = updates.length > MAX_VISIBLE
  const visible = expanded ? updates : updates.slice(0, MAX_VISIBLE)

  return (
    <section id="recent-updates" className={className}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-mystic-gold/60 text-base">✦</span>
        <h3 className="text-base font-serif text-mystic-gold">更新日志</h3>
      </div>
      <div className="w-full h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent mb-5" />

      <ul className="space-y-3">
        {visible.map((u) => {
          const meta = TAG_META[u.tag]
          return (
            <li key={u.date + u.title}>
              <article className="bg-mystic-card/60 rounded-xl p-4 border border-mystic-gold/10 hover:border-mystic-gold/30 transition-all">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                    {meta.icon} {meta.label}
                  </span>
                  <time className="text-xs text-mystic-text/30" dateTime={u.date}>
                    {formatDate(u.date)}
                  </time>
                </div>
                <h4 className="text-sm font-serif text-mystic-text">{u.title}</h4>
                {u.desc && (
                  <p className="mt-1 text-xs text-mystic-text/50 leading-relaxed">{u.desc}</p>
                )}
              </article>
            </li>
          )
        })}
      </ul>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-4 text-xs text-mystic-text/50 hover:text-mystic-gold transition-colors"
        >
          {expanded ? '收起' : `查看全部（${updates.length} 条）`}
        </button>
      )}
    </section>
  )
}
