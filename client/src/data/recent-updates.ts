export type UpdateTag = 'feature' | 'improvement' | 'fix' | 'security'

export interface RecentUpdate {
  /** 'YYYY-MM-DD'，避免时区歧义，便于排序 */
  date: string
  tag: UpdateTag
  title: string
  /** 可选：一两句话的简短说明 */
  desc?: string
}

// 维护规则：最新在前，新增条目往数组头部加
export const RECENT_UPDATES: RecentUpdate[] = [
  {
    date: '2026-08-07',
    tag: 'feature',
    title: '和牌灵持续对话，把占卜问到底',
    desc: '占卜不再止于一次结果——和牌灵多轮对话，追问每张牌的深意。',
  },
  {
    date: '2026-08-07',
    tag: 'improvement',
    title: '占卜结果只有你自己能看',
    desc: '你的问题和答案默认私密，别人都看不到。',
  },
  {
    date: '2026-08-06',
    tag: 'feature',
    title: '意见反馈上线，想说什么直接说',
    desc: '想法、建议、遇到的困惑，随时从「意见反馈」告诉我们。',
  },
]
