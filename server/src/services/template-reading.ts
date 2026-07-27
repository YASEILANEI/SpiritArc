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

export function templateReading(
  questionType: string,
  question: string,
  cards: any[]
): { result: string; source: 'template' } {
  const typeLabel = questionTypeLabels[questionType] || '综合'

  const cardDetails = cards.map((c, i) => {
    const position = c.position === 'up' ? '正位' : '逆位'
    const spread = c.spreadPosition
      ? spreadLabels[c.spreadPosition] || c.spreadPosition
      : ''
    const sectionKey = questionType === 'general' ? 'coreMeaning' : questionType
    const interpretation = c.interpretation?.[c.position]?.[sectionKey]
    const advice = c.interpretation?.[c.position]?.advice
    return {
      name: c.nameCn,
      position,
      spread,
      meaning: interpretation || c.meaning,
      advice: advice || '',
    }
  })

  // 行动指引（提前计算，供摘要使用）
  const adviceList = cardDetails.map(cd => cd.advice).filter(Boolean)

  // 重点摘要
  const summaryLines: string[] = []
  for (const cd of cardDetails) {
    const keyPoint = cd.meaning.slice(0, 40) + (cd.meaning.length > 40 ? '。' : '')
    summaryLines.push(`${cd.name}（${cd.position}）：${keyPoint}`)
  }
  if (adviceList.length > 0) {
    summaryLines.push(`建议：${adviceList[0].slice(0, 30)}。`)
  }
  let result = `### 重点摘要\n\n${summaryLines.join('\n')}\n\n`

  // 具体分析
  result += `### 具体分析\n\n`
  for (const cd of cardDetails) {
    if (cards.length === 3 && cd.spread) {
      result += `${cd.spread}的位置出现了${cd.name}，以${cd.position}呈现。${cd.meaning}\n\n`
    } else {
      result += `您抽到的是${cd.name}，以${cd.position}呈现。${cd.meaning}\n\n`
    }
  }

  // 行动指引
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
