const typeLabels: Record<string, string> = {
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

function cleanMarkdown(text: string): string {
  // Preserve **bold**, strip single *italic*
  const BOLD = '\x00BOLD\x00'
  return text
    .replace(/\*\*/g, BOLD)
    .replace(/\*/g, '')
    .replace(new RegExp(BOLD, 'g'), '**')
    .replace(/^(\d+)\.\s*/gm, '')
    .replace(/`/g, '')
    .trim()
}

function buildPrompt(questionType: string, question: string, cards: any[]): string {
  const typeLabel = typeLabels[questionType] || '综合'
  const displayQuestion = question?.trim() || `关于${typeLabel}的近期情况`

  const cardDesc = cards.map((c, i) => {
    const pos = c.position === 'up' ? '正位' : '逆位'
    const spread = c.spreadPosition
      ? `（${spreadLabels[c.spreadPosition] || c.spreadPosition}）`
      : ''
    return `${i + 1}. ${c.nameCn}(${c.nameEn})${spread} - ${pos}\n   关键词：${c.keywords?.join('、') || ''}\n   牌义：${c.meaning}`
  }).join('\n\n')

  return `用户就"${typeLabel}"方面提出了问题：${displayQuestion}

抽到的牌：
${cardDesc}

请根据这些牌提供个性化的占卜解读。要求：
1. 直接回应用户的具体问题，不要绕圈子
2. 将每张牌的含义与用户的情况结合起来分析
3. 使用"你"来称呼用户
4. 每个段落都要有实质内容，不要空洞套话

按以下格式输出，用###做标题。每个标题下的内容分成2到4个短段落，段落之间用空行隔开。不要使用任何列表或标记符号：

### 重点摘要

[3到5行短句，提炼本次占卜的核心结论，每条一行。让不读全文的人也能掌握关键信息]

### 具体分析

[2到4段，结合牌义展开分析]

### 行动指引

[2到3段文字建议，不要用数字列表]`
}

export async function aiReading(
  questionType: string,
  question: string,
  cards: any[]
): Promise<{ result: string; source: 'ai' } | null> {
  const apiKey = process.env.OPENCODE_API_KEY
  const baseURL = process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/go/v1'
  if (!apiKey) return null

  try {
    const res = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的塔罗牌占卜师。用中文回应用户的占卜问题。解读要具体、有洞察力、富有同理心。直接回应用户的具体问题，给出有实质内容的分析，不要写空洞的套话。\n\n格式要求：\n- 开头必须先写"### 重点摘要"，用3到5条短句提炼核心结论\n- 每条摘要直接写结论，不要用"总结来说""总之"这类开头\n- 不要使用任何 markdown 格式（不要用**、*、`、数字列表）\n- 每个段落之间用空行分隔\n- 只使用 ### 作为段落标题标记',
          },
          {
            role: 'user',
            content: buildPrompt(questionType, question, cards),
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error(`AI API error ${res.status}: ${errText}`)
      return null
    }

    const data = await res.json() as any
    const text = data.choices?.[0]?.message?.content
    if (!text) return null

    return { result: cleanMarkdown(text), source: 'ai' }
  } catch (err) {
    console.error('AI reading failed:', err)
    return null
  }
}
