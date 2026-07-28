import PageContainer from '../components/PageContainer'

interface Props {
  onBack: () => void
}

export default function AboutPage({ onBack }: Props) {
  return (
    <PageContainer>
      {/* Hero */}
      <div className="flex flex-col items-center text-center pt-8 pb-6">
        <div className="text-5xl text-mystic-gold/60 mb-6">✧</div>
        <h2 className="text-2xl font-serif text-mystic-gold mb-4">关于我们</h2>
        <div className="w-16 h-0.5 bg-mystic-gold/40 mx-auto mb-6 rounded-full" />
        <p className="text-mystic-text/50 text-xs max-w-xs leading-relaxed">
          关于 SpiritArc 的创造者
        </p>
      </div>

      {/* Section 1: Who I Am */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">✦</span>
          <h3 className="text-base font-serif text-mystic-gold">我是谁</h3>
        </div>
        <div className="text-mystic-text/60 text-sm leading-relaxed space-y-3 pl-6">
          <p>
            你好，我是 <span className="text-mystic-text/80">YASEILANEI</span>，一名 2029 届 AI 专业本科在读学生。
          </p>
          <p>
            SpiritArc 是我从零到一独立完成的产品。代码、设计、部署，全部独立完成。
          </p>
          <p>
            我想做一款既有技术挑战、又能真正交付给真实用户使用的产品。SpiritArc 就是在这个想法下诞生的。
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent mb-8" />

      {/* Section 2: Why Tarot */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">⟡</span>
          <h3 className="text-base font-serif text-mystic-gold">为什么做塔罗</h3>
        </div>
        <div className="text-mystic-text/60 text-sm leading-relaxed space-y-3 pl-6">
          <p>
            选这个题材，首先是被塔罗本身吸引——78 张牌，每张都有自己独特的叙事语言，每一次抽牌都像是一场小小的仪式。
          </p>
          <p>
            但市面上好用的塔罗工具大多要付费，免费的应用又往往体验粗糙。我想做一个不一样的选择。
          </p>
          <p>
            更重要的是，我想通过这个项目锻炼自己做产品的能力——从想法到上线，经历完整的产品周期。
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent mb-8" />

      {/* Section 3: Philosophy */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">♢</span>
          <h3 className="text-base font-serif text-mystic-gold">我的理念</h3>
        </div>
        <div className="text-mystic-text/60 text-sm leading-relaxed space-y-3 pl-6">
          <p>
            开发 SpiritArc 的过程中，我一直在做一件事：把自己当成用户，不断质疑每一个体验细节。
          </p>
          <p>
            "这个按钮放在这里合理吗？""洗牌动画会不会太久？""解读排版读起来舒服吗？"
          </p>
          <p>
            从动画节奏到文字间距，每一个细节我都反复审视。因为自己就是第一个使用者，所以最清楚哪里还需要打磨。
          </p>
          <p>
            这个项目还在成长，你的每一条反馈都会让它变得更好。
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-mystic-gold/20 to-transparent mb-8" />

      {/* Section 4: Contact */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-mystic-gold/60 text-base">♡</span>
          <h3 className="text-base font-serif text-mystic-gold">联系我</h3>
        </div>
        <div className="text-mystic-text/60 text-sm leading-relaxed space-y-3 pl-6">
          <p>项目完全开源，欢迎 Star 和贡献：</p>
          <a
            href="https://github.com/YASEILANEI/-SpiritArc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-mystic-gold/80 hover:text-mystic-gold transition-colors underline underline-offset-2 decoration-mystic-gold/30"
          >
            github.com/YASEILANEI/-SpiritArc →
          </a>
          <p className="pt-2">有任何想法或建议？欢迎邮件联系：</p>
          <a
            href="mailto:yaseilanei@126.com"
            className="inline-block text-mystic-gold/80 hover:text-mystic-gold transition-colors underline underline-offset-2 decoration-mystic-gold/30"
          >
            yaseilanei@126.com →
          </a>
          <p className="text-mystic-text/40 text-xs pt-4 italic">
            感谢你读到这里。期待听到你的声音。
          </p>
        </div>
      </section>

      {/* Bottom spacing */}
      <div className="h-8" />
    </PageContainer>
  )
}
