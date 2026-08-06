interface Props {
  doc: 'terms' | 'privacy'
  onClose: () => void
}

interface Section {
  title: string
  body: string
}

// 通用示例文案，上线前请人工复核法律措辞
const TERMS_SECTIONS: Section[] = [
  {
    title: '服务说明',
    body: '本应用提供塔罗占卜的在线工具服务，包括抽牌、解读与占卜记录管理。占卜结果由预设模板或 AI 生成，仅供娱乐与自我反思之用，不构成任何形式的专业建议。',
  },
  {
    title: '账号注册与使用',
    body: '注册时请提供真实有效的信息，并妥善保管账号与密码。你应对账号下的所有行为负责，如发现账号被盗用，请及时通过意见反馈联系我们。',
  },
  {
    title: '用户行为规范',
    body: '请勿利用本服务从事任何违法活动，包括但不限于发布违法违规内容、恶意攻击他人、干扰服务的正常运行、逆向或篡改服务数据等。违反者我们有权暂停或终止其账号。',
  },
  {
    title: '免责声明',
    body: '占卜结果具有不确定性，仅作为娱乐参考。本应用不对因依赖占卜结果而做出的任何决定承担责任。涉及健康、财务、法律等重大事项时，请务必咨询专业人士。',
  },
  {
    title: '服务变更与终止',
    body: '我们可能根据运营情况调整或终止部分功能，重大变更会提前告知。若你违反本协议，我们有权暂停或终止向你提供服务。',
  },
  {
    title: '协议变更',
    body: '我们可能不时更新本协议。更新后的协议将在应用中展示，你继续使用本服务即视为接受更新后的协议。',
  },
  {
    title: '联系我们',
    body: '如对本协议有任何疑问，可通过应用内的"意见反馈"或支持页面与我们联系。',
  },
]

const PRIVACY_SECTIONS: Section[] = [
  {
    title: '我们收集的信息',
    body: '账号信息：注册时提供的邮箱或手机号、昵称。占卜记录：你提出的问题、抽到的牌面与解读结果。意见反馈：你提交的反馈内容。设备信息：为保障服务正常运行收集的基本访问日志。',
  },
  {
    title: '信息的使用',
    body: '我们使用上述信息用于提供占卜服务、保存与恢复你的占卜记录、改进产品体验以及回复你的反馈。我们不会出售你的个人信息。',
  },
  {
    title: 'AI 解读',
    body: '当你选择 AI 解读时，你提出的问题会发送至第三方 AI 服务商以生成解读内容；使用预设模板解读不涉及外部数据传输。离线占卜记录仅保存在你的设备本地（浏览器存储），登录后才会同步到服务器。',
  },
  {
    title: '信息的存储',
    body: '你的数据存储于云端数据库（Neon Postgres），我们采取合理的加密与访问控制措施保护数据安全。',
  },
  {
    title: 'Cookie 与登录令牌',
    body: '我们使用 httpOnly Cookie 保存登录状态（刷新令牌），用于保持登录与保障账号安全，不会用于跨站追踪。',
  },
  {
    title: '你的权利',
    body: '你可以随时在应用中查看、隐藏或删除自己的占卜记录。如你希望处理账号相关问题（如注销账号），可通过"意见反馈"或支持页面联系我们。',
  },
  {
    title: '政策更新与联系我们',
    body: '本政策可能不时更新，更新后会在应用中告知。如对本政策有任何疑问，可通过应用内的"意见反馈"与我们联系。',
  },
]

export default function LegalModal({ doc, onClose }: Props) {
  const title = doc === 'terms' ? '用户协议' : '隐私政策'
  const sections = doc === 'terms' ? TERMS_SECTIONS : PRIVACY_SECTIONS

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-mystic-card border border-mystic-gold/20 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-serif text-mystic-gold">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-mystic-card border border-mystic-gold/30 rounded-full
              flex items-center justify-center text-mystic-text/60 hover:text-mystic-gold transition-colors text-sm"
          >
            ✕
          </button>
        </div>
        <p className="text-mystic-text/40 text-xs mb-6">最后更新：2026年8月6日</p>
        {sections.map(s => (
          <section key={s.title} className="mb-5">
            <h4 className="text-mystic-gold/90 font-serif text-sm mb-2">{s.title}</h4>
            <p className="text-mystic-text/70 text-sm leading-relaxed">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
