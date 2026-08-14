import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Catches render-time errors so a single page crash shows a friendly fallback
// instead of a blank white screen.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-mystic-bg px-4 text-center">
          <div className="text-5xl text-mystic-gold/60 mb-6">✦</div>
          <h2 className="text-xl font-serif text-mystic-gold mb-3">页面出了点问题</h2>
          <p className="text-mystic-text/50 text-sm mb-6">请刷新页面重试，或返回首页重新开始</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-mystic-gold text-mystic-bg rounded-full text-sm font-serif hover:bg-yellow-500 transition-colors"
          >
            刷新页面
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
