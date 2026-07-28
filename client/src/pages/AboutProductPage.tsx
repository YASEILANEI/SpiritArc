import PageContainer from '../components/PageContainer'

interface Props {
  onBack: () => void
}

export default function AboutProductPage({ onBack }: Props) {
  return (
    <PageContainer>
      {/* Hero */}
      <div className="flex flex-col items-center text-center pt-8 pb-6">
        <div className="text-5xl text-mystic-gold/60 mb-6">✦</div>
        <h2 className="text-2xl font-serif text-mystic-gold mb-4">关于产品</h2>
        <div className="w-16 h-0.5 bg-mystic-gold/40 mx-auto mb-6 rounded-full" />
        <p className="text-mystic-text/50 text-xs max-w-xs leading-relaxed">
          尊重传统，用现代技术还原占卜的仪式感
        </p>
      </div>

      {/* Section 1: Origin Story */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">✧</span>
          <h3 className="text-base font-serif text-mystic-gold">SpiritArc 的故事</h3>
        </div>
        <div className="text-mystic-text/60 text-sm leading-relaxed space-y-3 pl-6">
          <p>
            SpiritArc 想要证明一件事：一款塔罗工具可以同时做到尊重传统、设计用心，而且完全免费。
          </p>
          <p>
            塔罗本身就是一门迷人的学问——每张牌都有自己的象征语言，每一次抽牌都像是一次与自己的对话。SpiritArc 希望让每个人都能自由地拥有这种体验。
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent mb-8" />

      {/* Section 2: Philosophy */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">⟡</span>
          <h3 className="text-base font-serif text-mystic-gold">设计理念</h3>
        </div>
        <div className="text-mystic-text/60 text-sm leading-relaxed space-y-3 pl-6">
          <p>
            塔罗不是算命，而是一面与自我对话的镜子。每一张牌都在邀请你停下来，看一看自己内心真正的想法。
          </p>
          <p>
            SpiritArc 尊重 Rider-Waite-Smith 的传统体系，保留了牌意的象征深度。整个体验围绕一个原则设计：帮助你进入与自己对话的状态。
          </p>
          <p>
            不收费、无广告、不追踪。让塔罗回归纯粹。
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent mb-8" />

      {/* Section 3: Features */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">♢</span>
          <h3 className="text-base font-serif text-mystic-gold">功能亮点</h3>
        </div>
        <ul className="space-y-3 pl-6">
          {[
            { icon: '✧', text: '78 张 Rider-Waite-Smith 经典牌阵，支持单张 / 三张抽牌' },
            { icon: '⟡', text: '沉浸式占卜流程：洗牌 → 切牌 → 抽牌 → CSS 3D 翻牌揭示' },
            { icon: '♢', text: '离线可用，没有网络也能完成占卜' },
            { icon: '♡', text: '完全免费、无广告、不追踪隐私数据' },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-mystic-gold/50 shrink-0">{item.icon}</span>
              <span className="text-mystic-text/60 text-sm">{item.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent mb-8" />

      {/* Section 4: Credits */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">✦</span>
          <h3 className="text-base font-serif text-mystic-gold">致谢</h3>
        </div>
        <div className="text-mystic-text/60 text-sm leading-relaxed space-y-3 pl-6">
          <p>
            牌面画作来自 Pamela Colman Smith（1878–1951）创作的 Rider-Waite-Smith 系列，现已进入公有领域。本项目基于 MIT 许可开源，欢迎任何形式的参与和贡献。
          </p>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-8" />
    </PageContainer>
  )
}
