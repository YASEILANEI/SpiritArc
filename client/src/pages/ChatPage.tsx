import { useEffect, useRef, useState } from 'react'
import {
  createChatConversation,
  deleteChatConversation,
  sendChatMessage,
  setMessageFeedback,
  type ChatConversation,
  type ChatMessage,
} from '../api'

interface Props {
  readingId: string
  onBack: () => void
  onDeleted: () => void
}

const suggestions = ['他现在真正顾虑的是什么？', '我应该主动联系他吗？', '这段关系接下来最大的阻碍是什么？', '我现在最应该做什么？']

// Lightweight **bold** rendering — never use dangerouslySetInnerHTML.
function renderRich(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-mystic-gold font-semibold">{part.slice(2, -2)}</strong>
      : part,
  )
}

const magicPhrases = [
  '牌灵正在感受你的能量……',
  '牌灵正在翻阅命运之书……',
  '牌灵正与星辰对话……',
  '牌灵凝望着牌面密语……',
  '牌灵正在连接牌阵的脉动……',
]

function ThinkingIndicator() {
  const [phraseIndex, setPhraseIndex] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setPhraseIndex(i => (i + 1) % magicPhrases.length), 3000)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-mystic-gold/80 text-base leading-none mt-1">✦</span>
      <div className="flex flex-col">
        <div className="flex items-center gap-1 py-1.5">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-mystic-gold/70"
              style={{ animation: `spirit-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <p className="text-xs text-mystic-text/40 leading-none">{magicPhrases[phraseIndex]}</p>
      </div>
    </div>
  )
}

export default function ChatPage({ readingId, onBack, onDeleted }: Props) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [remaining, setRemaining] = useState<number | null>(null)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!/^\d+$/.test(readingId)) {
      setError('这次阅读暂不支持牌灵聊天')
      setLoading(false)
      return
    }
    createChatConversation(Number(readingId))
      .then(setConversation)
      .catch(err => setError(err instanceof Error ? err.message : '聊天加载失败'))
      .finally(() => setLoading(false))
  }, [readingId])

  // Auto-scroll to bottom on new messages / thinking state
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [conversation?.messages.length, sending])

  const send = async () => {
    const content = input.trim()
    if (!content || sending || !conversation) return
    // Optimistic UI: render the user's message immediately, before the AI reply returns.
    const optimistic: ChatMessage = {
      id: `pending_${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      userRating: null,
    }
    setSending(true)
    setError('')
    setConversation(current => current ? { ...current, messages: [...current.messages, optimistic] } : current)
    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
    try {
      const result = await sendChatMessage(conversation.id, content)
      setConversation(current => current ? {
        ...current,
        updatedAt: result.assistantMessage.createdAt,
        messages: current.messages
          .map(m => m.id === optimistic.id ? result.userMessage : m)
          .concat([result.assistantMessage]),
      } : current)
      setRemaining(result.quota?.remaining ?? null)
    } catch (err) {
      // Remove the optimistic message so a failed send doesn't linger as if sent.
      setConversation(current => current ? {
        ...current,
        messages: current.messages.filter(m => m.id !== optimistic.id),
      } : current)
      setError(err instanceof Error ? err.message : '牌灵暂时无法回应')
    } finally {
      setSending(false)
    }
  }

  // Leaving a non-empty conversation is permanent — confirm and wipe the session.
  const leave = () => {
    if (conversation && conversation.messages.length > 0) {
      setShowLeaveConfirm(true)
    } else {
      onBack()
    }
  }

  const confirmLeave = async () => {
    setShowLeaveConfirm(false)
    if (conversation) {
      try {
        await deleteChatConversation(conversation.id)
      } catch { /* best-effort — still leave even if cleanup fails */ }
    }
    onDeleted()
  }

  const rate = async (message: ChatMessage, rating: 'up' | 'down') => {
    if (typeof message.id !== 'number') return
    const next = message.userRating === rating ? null : rating
    const original = message.userRating
    setConversation(current => current ? {
      ...current,
      messages: current.messages.map(m => m.id === message.id ? { ...m, userRating: next } : m),
    } : current)
    try {
      await setMessageFeedback(message.id, next)
    } catch (err) {
      setConversation(current => current ? {
        ...current,
        messages: current.messages.map(m => m.id === message.id ? { ...m, userRating: original } : m),
      } : current)
      setError(err instanceof Error ? err.message : '评价失败')
    }
  }

  const copy = async (message: ChatMessage) => {
    if (typeof message.id !== 'number') return
    try {
      await navigator.clipboard.writeText(message.content)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = message.content
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopiedId(message.id)
    window.setTimeout(() => setCopiedId(current => current === message.id ? null : current), 1500)
  }

  if (loading) {
    return <div className="h-[100dvh] flex items-center justify-center bg-mystic-bg"><div className="w-8 h-8 border-2 border-mystic-gold/30 border-t-mystic-gold rounded-full animate-spin" /></div>
  }

  return (
    <div
      className="h-[100dvh] flex flex-col"
      style={{
        background: 'radial-gradient(ellipse at 50% -10%, rgba(201,168,76,0.07), transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(107,91,141,0.07), transparent 50%), #0a0a1a',
      }}
    >
      {/* Top bar */}
      <header className="flex items-center gap-2 px-3 py-3 shrink-0">
        <button onClick={leave} aria-label="返回解读" className="text-mystic-text/60 hover:text-mystic-gold px-1 text-lg leading-none">←</button>
        <div className="flex-1 min-w-0 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-mystic-gold text-sm">✦</span>
            <span className="font-serif text-mystic-gold text-sm tracking-wide">牌灵</span>
          </div>
          {conversation && (
            <p className="text-[11px] text-mystic-text/40 truncate mt-0.5 px-2">{conversation.question || '结合本次牌阵继续追问'}</p>
          )}
        </div>
        <span className="w-8 shrink-0" />
      </header>
      <div className="h-px bg-gradient-to-r from-transparent via-mystic-gold/25 to-transparent shrink-0" />

      {/* Message stream */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto overscroll-behavior-contain">
        <div className="max-w-xl mx-auto px-4 py-4">
          {error && (
            <p className="text-sm text-red-400/80 bg-red-900/10 border border-red-400/20 rounded-xl p-3 mb-4">{error}</p>
          )}

          {conversation && conversation.messages.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center text-center py-16">
              <div className="text-5xl text-mystic-gold/70 mb-5">✦</div>
              <h2 className="font-serif text-mystic-gold text-2xl tracking-wide mb-3">牌灵对话</h2>
              <p className="text-mystic-text/50 text-sm leading-relaxed max-w-xs mb-7">
                我是由这组牌共同形成的声音。你可以继续询问，但请记住，我呈现的是牌面中的趋势与提醒，而不是替你决定现实。
              </p>
              <div className="flex flex-wrap justify-center gap-2 w-full max-w-sm">
                {suggestions.map(s => (
                  <button key={s} onClick={() => setInput(s)} className="text-xs text-mystic-gold/80 border border-mystic-gold/25 rounded-full px-3 py-2 hover:bg-mystic-gold/10">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {conversation?.messages.map(message => (
            message.role === 'user' ? (
              <div key={message.id} className="flex justify-end mb-4">
                <div className="max-w-[85%] bg-mystic-gold text-mystic-bg rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-lg shadow-mystic-gold/10">
                  {message.content}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex items-start gap-2.5 mb-4 animate-fadeIn">
                <span className="text-mystic-gold/80 text-base leading-none mt-1 shrink-0">✦</span>
                <div className="flex-1 min-w-0">
                  <div className="bg-mystic-card/40 border border-mystic-gold/10 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="text-sm leading-relaxed whitespace-pre-wrap text-mystic-text/80">{renderRich(message.content)}</div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 pl-1 text-mystic-text/35">
                    <button
                      onClick={() => copy(message)}
                      className={`text-[11px] rounded-md px-1.5 py-0.5 transition-colors ${copiedId === message.id ? 'text-mystic-gold' : 'hover:text-mystic-gold hover:bg-mystic-gold/10'}`}
                    >
                      {copiedId === message.id ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={() => rate(message, 'up')}
                      aria-label="有用"
                      className={`text-sm leading-none rounded-md px-1.5 py-0.5 transition-colors ${message.userRating === 'up' ? 'text-mystic-gold' : 'hover:text-mystic-gold/80 hover:bg-mystic-gold/10'}`}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => rate(message, 'down')}
                      aria-label="没用"
                      className={`text-sm leading-none rounded-md px-1.5 py-0.5 transition-colors ${message.userRating === 'down' ? 'text-red-400' : 'hover:text-mystic-gold/80 hover:bg-mystic-gold/10'}`}
                    >
                      👎
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}

          {sending && (
            <div className="mb-2">
              <ThinkingIndicator />
            </div>
          )}
        </div>
      </main>

      {/* Composer */}
      <footer className="shrink-0 px-4 pt-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] bg-mystic-bg/80">
        {conversation && (
          <div className="max-w-xl mx-auto">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onInput={e => {
                  const el = e.currentTarget
                  el.style.height = 'auto'
                  el.style.height = `${Math.min(el.scrollHeight, 108)}px`
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                disabled={sending}
                maxLength={1000}
                rows={1}
                placeholder="继续问问牌灵……"
                className="flex-1 resize-none bg-mystic-card/80 border border-mystic-gold/25 rounded-2xl px-4 py-3 text-sm text-mystic-text outline-none max-h-[108px] focus:border-mystic-gold/70 focus:shadow-[0_0_16px_rgba(201,168,76,0.15)] disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={sending || !input.trim()}
                aria-label="发送"
                className="w-10 h-10 shrink-0 rounded-full bg-mystic-gold text-mystic-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:hover:scale-100"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22l-4-9-9-4z" />
                </svg>
              </button>
            </div>
            {remaining !== null && <p className="text-[11px] text-mystic-text/35 text-right mt-1">本周剩余 {remaining} 次聊天</p>}
          </div>
        )}
      </footer>

      <style>{`
        @keyframes spirit-bounce {
          0%, 100% { opacity: 0.3; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>

      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6">
          <div className="w-full max-w-sm bg-mystic-card border border-mystic-gold/30 rounded-2xl p-6 text-center">
            <div className="text-2xl text-mystic-gold mb-3">✦</div>
            <h3 className="font-serif text-mystic-gold text-lg mb-2">离开这段对话？</h3>
            <p className="text-sm text-mystic-text/60 leading-relaxed mb-5">
              与牌灵的交流是私密的。离开后，这段对话将被永久清除，无法恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                className="flex-1 py-2.5 bg-mystic-card text-mystic-text/70 rounded-full border border-mystic-gold/25 text-sm"
              >
                留下来
              </button>
              <button
                onClick={confirmLeave}
                className="flex-1 py-2.5 bg-red-900/40 text-red-300 rounded-full border border-red-400/30 text-sm"
              >
                永久清除并离开
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
