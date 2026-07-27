import type { DrawnCard } from '../types'

const questionTypeLabels: Record<string, string> = {
  love: '感情',
  career: '事业',
  finance: '财运',
  health: '健康',
  general: '综合',
}

const spreadLabels: Record<string, string> = {
  past: '过去',
  present: '现在',
  future: '未来',
}

export function generateLocalReading(
  questionType: string,
  question: string,
  cards: DrawnCard[]
): { result: string; source: 'template' } {
  const typeLabel = questionTypeLabels[questionType] || '综合'
  const displayQuestion = question?.trim() || `关于${typeLabel}的近期运势与指引`

  const cardDetails = cards.map((c, i) => {
    const position = c.position === 'up' ? '正位' : '逆位'
    const spread = c.spreadPosition
      ? spreadLabels[c.spreadPosition] || c.spreadPosition
      : ''
    const sectionKey = questionType === 'general' ? 'coreMeaning' : questionType
    const interpretation = c.interpretation?.[c.position]?.[sectionKey as keyof typeof c.interpretation.up]
    const advice = c.interpretation?.[c.position]?.advice
    return {
      name: c.nameCn,
      position,
      spread,
      meaning: interpretation || c.meaning,
      advice: advice || '',
    }
  })

  // 整体状况
  const questionLead = question?.trim()
    ? `关于您问的"${displayQuestion}"`
    : `关于您${typeLabel}方面的困惑`
  const spreadDesc = cards.length === 3
    ? `${questionLead}——过去${cardDetails[0].name}（${cardDetails[0].position}）、现在${cardDetails[1].name}（${cardDetails[1].position}）、未来${cardDetails[2].name}（${cardDetails[2].position}）三张牌共同回应了您的疑问。`
    : `${questionLead}——${cardDetails[0].name}以${cardDetails[0].position}呈现在您面前。${cardDetails[0].meaning}`
  let result = `### 整体状况\n\n${spreadDesc}\n`

  // 具体分析
  result += `\n### 具体分析\n\n`
  for (const cd of cardDetails) {
    if (cards.length === 3 && cd.spread) {
      result += `${cd.spread}的位置出现了${cd.name}，以${cd.position}呈现。${cd.meaning}\n\n`
    } else {
      result += `您抽到的是${cd.name}，以${cd.position}呈现。${cd.meaning}\n\n`
    }
  }

  // 行动指引
  const adviceList = cardDetails.map(cd => cd.advice).filter(Boolean)
  result += `### 行动指引\n\n`
  if (adviceList.length > 0) {
    for (let i = 0; i < adviceList.length; i++) {
      const cd = cardDetails[i]
      const prefix = cards.length > 1 && cd.spread ? `${cd.spread}的${cd.name}提示您：` : ''
      result += `${prefix}${adviceList[i]}\n\n`
    }
  }
  result += `保持内心的平静，相信自己的判断，随着事态的发展做出适合的选择。`

  return { result, source: 'template' }
}
