import { useState, useEffect } from 'react'
import { apiFetch } from '../api'

interface Props {
  onBack: () => void
}

const SETTING_LABELS: Record<string, string> = {
  OPENCODE_API_KEY: 'API Key',
  OPENCODE_BASE_URL: 'API 地址',
  AI_MODEL: '模型名称',
  AI_MAX_TOKENS: '最大 Token 数',
}

const SETTING_PLACEHOLDERS: Record<string, string> = {
  OPENCODE_API_KEY: 'sk-...',
  OPENCODE_BASE_URL: 'https://...',
  AI_MODEL: 'deepseek-v4-flash',
  AI_MAX_TOKENS: '4000',
}

export default function AdminSettingsPage({ onBack }: Props) {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    apiFetch('/admin/settings').then(res => {
      if (res.ok) return res.json()
    }).then(data => {
      if (data) setSettings(data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async (key: string, value: string) => {
    setSaving(key)
    setMessage('')
    try {
      const res = await apiFetch('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ key, value }),
      })
      if (res.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        setMessage(`${SETTING_LABELS[key] || key} 已更新`)
      } else {
        const err = await res.json().catch(() => ({ error: '保存失败' }))
        setMessage(err.error || '保存失败')
      }
    } catch {
      setMessage('保存失败')
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="w-full max-w-lg mx-auto">
        <button onClick={onBack} className="text-mystic-text/50 hover:text-mystic-gold transition-colors mb-4">
          ← 管理后台
        </button>
        <h2 className="text-2xl font-serif text-mystic-gold text-center mb-6">系统设置</h2>

        {loading ? (
          <p className="text-mystic-text/40 text-center py-8">加载中...</p>
        ) : (
          <div className="space-y-4">
            {Object.keys(SETTING_LABELS).map(key => (
              <SettingRow
                key={key}
                label={SETTING_LABELS[key]}
                value={settings[key] || ''}
                placeholder={SETTING_PLACEHOLDERS[key] || ''}
                isSensitive={key === 'OPENCODE_API_KEY'}
                saving={saving === key}
                onSave={(val) => handleSave(key, val)}
              />
            ))}
          </div>
        )}

        {message && (
          <p className="text-center text-sm text-mystic-gold mt-4">{message}</p>
        )}
      </div>
    </div>
  )
}

function SettingRow({ label, value, placeholder, isSensitive, saving, onSave }: {
  label: string
  value: string
  placeholder: string
  isSensitive: boolean
  saving: boolean
  onSave: (val: string) => void
}) {
  const [val, setVal] = useState(value)

  return (
    <div className="bg-mystic-card/80 rounded-xl p-4 border border-mystic-gold/20">
      <label className="block text-mystic-text/60 text-sm mb-2">{label}</label>
      <div className="flex gap-2">
        <input
          type={isSensitive ? 'password' : 'text'}
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 bg-mystic-bg border border-mystic-gold/20 rounded-lg text-sm
            text-mystic-text placeholder:text-mystic-text/30
            focus:outline-none focus:border-mystic-gold/50 transition-colors"
        />
        <button
          onClick={() => onSave(val)}
          disabled={saving || val === value}
          className="px-4 py-2 bg-mystic-gold text-mystic-bg rounded-lg text-sm
            hover:bg-yellow-500 transition-colors disabled:opacity-50 shrink-0"
        >
          {saving ? '...' : '保存'}
        </button>
      </div>
    </div>
  )
}
