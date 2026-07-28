import { useState } from 'react'
import PageContainer from '../components/PageContainer'

export default function SupportPage() {
  const [showCodes, setShowCodes] = useState(false)
  const [enlargedImg, setEnlargedImg] = useState<'wechat' | 'alipay' | null>(null)

  return (
    <PageContainer>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5.5rem)]">
        {/* Hero */}
        <div className="flex flex-col items-center text-center pb-6">
          <div className="text-5xl text-mystic-gold/60 mb-6">♥</div>
          <h2 className="text-2xl font-serif text-mystic-gold mb-4">支持一下</h2>
          <div className="w-16 h-0.5 bg-mystic-gold/40 mx-auto mb-8 rounded-full" />
        </div>

        {/* Message */}
        <div className="text-mystic-text/60 text-sm leading-relaxed text-center max-w-sm mx-auto mb-8 space-y-2">
          <p>
            如果你愿意支持独立制作者，欢迎赞赏支持。
          </p>
          <p>
            你的每一次使用，都是对我最大的鼓励。
          </p>
        </div>

        {/* Sponsor Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={() => setShowCodes(!showCodes)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-700/80 to-yellow-600/60
              text-mystic-gold rounded-full text-sm font-serif tracking-wide
              border border-mystic-gold/30 shadow-lg shadow-yellow-900/20
              hover:from-yellow-600/80 hover:to-yellow-500/60 hover:border-mystic-gold/50
              hover:shadow-yellow-900/30 hover:-translate-y-0.5
              active:translate-y-0
              transition-all duration-300"
          >
            <span className="text-lg">⚡</span>
            <span>赞助我点 Token</span>
            <span className={`text-xs transition-transform duration-300 ${showCodes ? 'rotate-180' : ''}`}>▾</span>
          </button>
        </div>

        {/* QR Codes Card */}
        <div
          className={`w-full overflow-hidden transition-all duration-500 ease-out ${
            showCodes ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 invisible'
          }`}
        >
          <div className="bg-mystic-card/60 border border-mystic-gold/20 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-center gap-8">
              {/* WeChat */}
              <div className="flex flex-col items-center gap-3">
                <button onClick={() => setEnlargedImg('wechat')} className="w-28 h-28 bg-white rounded-xl p-2 flex items-center justify-center shadow-lg cursor-pointer hover:ring-2 hover:ring-mystic-gold/40 transition-all">
                  <img
                    src="/qrcode-wechat.png"
                    alt="微信赞赏码"
                    className="w-full h-full object-contain"
                  />
                </button>
                <span className="text-mystic-text/50 text-xs tracking-wide">微信</span>
              </div>

              {/* Alipay */}
              <div className="flex flex-col items-center gap-3">
                <button onClick={() => setEnlargedImg('alipay')} className="w-28 h-28 bg-white rounded-xl p-2 flex items-center justify-center shadow-lg cursor-pointer hover:ring-2 hover:ring-mystic-gold/40 transition-all">
                  <img
                    src="/qrcode-alipay.png"
                    alt="支付宝收款码"
                    className="w-full h-full object-contain"
                  />
                </button>
                <span className="text-mystic-text/50 text-xs tracking-wide">支付宝</span>
              </div>
            </div>

            <p className="text-center text-mystic-text/30 text-xs mt-5">
              长按或扫一扫，随缘支持
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {/* Enlarged image overlay */}
      {enlargedImg && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
          onClick={() => setEnlargedImg(null)}
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div className="relative" onClick={e => e.stopPropagation()}>
            <div className="w-64 h-64 bg-white rounded-2xl p-4 shadow-2xl flex items-center justify-center">
              <img
                src={enlargedImg === 'wechat' ? '/qrcode-wechat.png' : '/qrcode-alipay.png'}
                alt={enlargedImg === 'wechat' ? '微信赞赏码' : '支付宝收款码'}
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-center text-mystic-text/60 text-sm mt-4">
              {enlargedImg === 'wechat' ? '微信扫一扫' : '支付宝扫一扫'}
            </p>
            <button
              onClick={() => setEnlargedImg(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-mystic-card border border-mystic-gold/30 rounded-full
                flex items-center justify-center text-mystic-text/60 hover:text-mystic-gold transition-colors text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
