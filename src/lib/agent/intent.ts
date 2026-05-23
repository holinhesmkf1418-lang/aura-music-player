import { chatWithDeepSeek } from '@/lib/deepseek'
import type { ParsedIntent, DeepSeekContext } from './types'

/**
 * 中文数字转索引（0-based）
 */
const CN_NUM: Record<string, number> = {
  一: 0, 二: 1, 两: 1, 三: 2, 四: 3, 五: 4,
  六: 5, 七: 6, 八: 7, 九: 8, 十: 9,
}

function chineseIndex(text: string): number | null {
  if (text in CN_NUM) return CN_NUM[text]
  const n = parseInt(text, 10)
  if (!isNaN(n) && n >= 1) return n - 1
  return null
}

function isBoredMoodRequest(text: string): boolean {
  if (/(这首歌|叫无聊|歌名.*无聊|无聊.*这首)/.test(text)) return false
  return /(有点无聊|很无聊|太无聊|现在.*无聊|无聊.*(来|听|推荐|合适|音乐|歌)|没劲|没意思|不知道听什么|不知道该听什么|随便来点|来几首合适)/.test(text)
}

function buildBoredMoodIntent(intent: 'new_recommendation' | 'adjust_recommendations'): ParsedIntent {
  return {
    intent,
    confidence: 0.92,
    scene: '解闷',
    mood: ['轻松', '有趣', '提神'],
    language: 'zh',
    energy: 'medium',
    titleExclude: ['无聊', 'Bored'],
    replyTone: 'brief',
    needsDeepRank: true,
  }
}

function normalizeParsedIntent(message: string, parsed: ParsedIntent): ParsedIntent {
  const trimmed = message.trim()
  const lowerQuery = parsed.query?.trim().toLowerCase()
  const lowerTopic = parsed.topic?.trim().toLowerCase()

  if (/不是.*歌名.*无聊|无聊.*不是.*歌名|不是.*叫无聊/.test(trimmed)) {
    return buildBoredMoodIntent('adjust_recommendations')
  }

  if (isBoredMoodRequest(trimmed)) {
    const treatedAsExactTitle =
      lowerQuery === 'bored' ||
      lowerQuery === '无聊' ||
      lowerTopic === 'bored' ||
      lowerTopic === '无聊'

    if (treatedAsExactTitle || parsed.intent === 'new_recommendation') {
      return buildBoredMoodIntent(parsed.intent === 'adjust_recommendations'
        ? 'adjust_recommendations'
        : 'new_recommendation')
    }
  }

  return parsed
}

/**
 * 确定性匹配：通过正则快速识别常见控制类意图
 */
function deterministicParse(message: string): ParsedIntent | null {
  const trimmed = message.trim()

  // 基础控制类
  if (/^(暂停|停一下|停下)$/i.test(trimmed)) {
    return { intent: 'pause', confidence: 0.95, needsDeepRank: false }
  }
  if (/^(继续|恢复|接着放|播放)$/i.test(trimmed)) {
    return { intent: 'resume', confidence: 0.95, needsDeepRank: false }
  }
  if (/^(下一首|下一曲|切歌|跳过)$/i.test(trimmed)) {
    return { intent: 'next_track', confidence: 0.95, needsDeepRank: false }
  }
  if (/^(上一首|上一曲|回到上首|前一首)$/i.test(trimmed)) {
    return { intent: 'previous_track', confidence: 0.95, needsDeepRank: false }
  }
  if (/^(加入队列|加入播放列表|加入列表|加入歌单)$/i.test(trimmed)) {
    return { intent: 'add_to_queue', confidence: 0.9, needsDeepRank: false }
  }

  if (/不是.*歌名.*无聊|无聊.*不是.*歌名|不是.*叫无聊/.test(trimmed)) {
    return buildBoredMoodIntent('adjust_recommendations')
  }

  // 用户状态/情绪场景：不要把“无聊”当成精确歌名搜索。
  if (isBoredMoodRequest(trimmed)) {
    return buildBoredMoodIntent('new_recommendation')
  }

  // 换一批 / 刷新推荐
  if (/^(换几首|换一批|再来几首|再来点|更多|下一批|换一些|再换一批)$/i.test(trimmed)) {
    return { intent: 'refresh_recommendations', confidence: 0.9, needsDeepRank: false }
  }

  // 播放第 N 首（支持中文数字和阿拉伯数字）
  // 播放第二首 / 播放第2首 / 放第三首 / 点第1个
  const playRegex = /^(?:播放|听|放|点)(?:第)?\s*([\d一二两三四五六七八九十]+)\s*(?:首|个|条|曲)?$/i
  const playMatch = trimmed.match(playRegex)
  if (playMatch) {
    const idx = chineseIndex(playMatch[1])
    if (idx !== null && idx >= 0) {
      return {
        intent: 'play_track',
        confidence: 0.95,
        referencedTrackIndex: idx,
        needsDeepRank: false,
      }
    }
  }

  // 类似第 N 首（支持中文数字和阿拉伯数字）
  // 类似第一首 / 找和第二首类似的
  const similarRegex1 = /^(?:类似|相似的|找类似|和.*?类似)(?:第)?\s*([\d一二两三四五六七八九十]+)\s*(?:首|个|条)?$/i
  const simMatch1 = trimmed.match(similarRegex1)
  if (simMatch1) {
    const idx = chineseIndex(simMatch1[1])
    if (idx !== null && idx >= 0) {
      return {
        intent: 'similar_to_track',
        confidence: 0.85,
        referencedTrackIndex: idx,
        needsDeepRank: true,
      }
    }
  }

  // 找和第 N 首类似的 / 来几首和第N首类似的
  const similarRegex2 = /^(?:找|来|要)(?:.*?)(?:和第|和|跟)?\s*([\d一二两三四五六七八九十]+)\s*(?:首|个|条)?\s*(?:类似|相似|差不多|一样风格)/i
  const simMatch2 = trimmed.match(similarRegex2)
  if (simMatch2) {
    const idx = chineseIndex(simMatch2[1])
    if (idx !== null && idx >= 0) {
      return {
        intent: 'similar_to_track',
        confidence: 0.85,
        referencedTrackIndex: idx,
        needsDeepRank: true,
      }
    }
  }

  // 排除/不要歌名带关键词
  const excludeRegex = /(?:不希望|不要|排除|别让|避免)(?:歌名|标题|名字|歌曲名|名里).*?(?:带着|带|有|含|包含|出现)\s*(.{2,10}?)(?:三个字|四个字|六个字|，|,|、|的字|的歌名|$)/i
  const excludeMatch = trimmed.match(excludeRegex)
  if (excludeMatch && excludeMatch[1]) {
    let word = excludeMatch[1].trim()
    word = word.replace(/三个字$|四个字$|六个字$/, '').trim()
    if (word.length >= 2) {
      return {
        intent: 'adjust_recommendations',
        confidence: 0.8,
        titleExclude: [word],
        replyTone: 'brief',
        needsDeepRank: false,
      }
    }
  }

  const excludeRegex2 = /(?:歌名|标题|歌曲名|名里).*?(?:不要|不希望|别|不能)(?:有|带|含|包含|出现|带着)\s*(.{2,10}?)(?:三个字|四个字|，|,|$)/i
  const excludeMatch2 = trimmed.match(excludeRegex2)
  if (excludeMatch2 && excludeMatch2[1]) {
    let word = excludeMatch2[1].trim()
    word = word.replace(/三个字$|四个字$/, '').trim()
    if (word.length >= 2) {
      return {
        intent: 'adjust_recommendations',
        confidence: 0.8,
        titleExclude: [word],
        replyTone: 'brief',
        needsDeepRank: false,
      }
    }
  }

  return null
}

/**
 * 构建 DeepSeek 意图解析的系统提示
 */
function buildParsePrompt(context?: DeepSeekContext): string {
  let prompt = `你是一个音乐助手意图解析器。分析用户输入，返回结构化 JSON，不要加其他文字。

可用的意图（intent）：
- new_recommendation：用户提出新的音乐需求（歌手、风格、场景、情绪等）
- adjust_recommendations：用户对当前推荐提调整要求（更欢快、别太伤感、换成中文的等）
- refresh_recommendations：用户要求换一批
- similar_to_track：用户要求找类似的歌
- play_track：用户要求播放某首歌
- add_to_queue：用户要求加入队列
- pause / resume / next_track / previous_track：播放控制
- unknown：无法理解

JSON 字段：
{
  "intent": "意图名称",
  "confidence": 0-1 的小数,
  "replyTone": "brief" 或 "explanatory",
  "query": "精确搜索关键词（如周杰伦的晴天）",
  "topic": "主题（如夏天、夜晚、下雨天）",
  "scene": "场景（如驾驶、跑步、学习）",
  "mood": ["情绪标签"],
  "genres": ["风格"],
  "artists": ["歌手"],
  "language": "zh/en/mixed/unknown",
  "era": "年代",
  "energy": "low/medium/high/unknown",
  "referencedTrackIndex": "数字索引（从0开始）",
  "count": "推荐数量",
  "needsDeepRank": true/false,
  "titleExclude": ["需要从歌名里排除的关键词"]
}

规则：
- 简单请求（直接搜歌手/歌曲/风格）needsDeepRank=false
- 复杂请求（多条件组合、情绪调整）needsDeepRank=true
- 如果用户说"不要歌名带xx""排除xx"，提取为 titleExclude
- 如果用户在当前结果基础上调整（不要这么伤感、换成中文的），设为 adjust_recommendations
- 不确定时 confidence 给低值`

  if (context) {
    prompt += `\n\n当前对话上下文：
- 已有推荐结果：${context.lastResults.slice(0, 3).map((t, i) => `第${i + 1}首「${t.title}」- ${t.artist}`).join('；') || '无'}
- 当前主题：${context.topic || '未设定'}
- 当前情绪：${(context.mood || []).join('、') || '未设定'}
- 当前语言偏好：${context.language || '未设定'}

用户最近消息：
${context.history.slice(-3).map((m) => `[${m.role}]: ${m.content}`).join('\n')}`
  }

  return prompt
}

/**
 * 用 DeepSeek 解析自然语言意图
 */
async function deepseekParse(
  message: string,
  context?: DeepSeekContext,
): Promise<ParsedIntent> {
  const systemPrompt = buildParsePrompt(context)

  const result = await chatWithDeepSeek([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: message },
  ])

  if (!result) {
    return { intent: 'unknown', confidence: 0, needsDeepRank: false }
  }

  try {
    const parsed = JSON.parse(result)
    return {
      intent: parsed.intent || 'unknown',
      confidence: parsed.confidence || 0,
      replyTone: parsed.replyTone,
      query: parsed.query,
      topic: parsed.topic,
      scene: parsed.scene,
      mood: Array.isArray(parsed.mood) ? parsed.mood : undefined,
      genres: Array.isArray(parsed.genres) ? parsed.genres : undefined,
      artists: Array.isArray(parsed.artists) ? parsed.artists : undefined,
      language: parsed.language,
      era: parsed.era,
      energy: parsed.energy,
      referencedTrackIndex: parsed.referencedTrackIndex,
      count: parsed.count,
      needsDeepRank: parsed.needsDeepRank === true,
      titleExclude: Array.isArray(parsed.titleExclude) ? parsed.titleExclude : undefined,
    }
  } catch {
    return { intent: 'unknown', confidence: 0, needsDeepRank: false }
  }
}

/**
 * 解析用户消息为结构化意图
 *
 * 策略：先尝试确定性匹配（快路径），不匹配时调 DeepSeek（带上下文）
 */
export async function parseIntent(
  message: string,
  context?: DeepSeekContext,
): Promise<ParsedIntent> {
  // 先做确定性匹配（快路径）
  const deterministic = deterministicParse(message)
  if (deterministic) {
    return deterministic
  }

  // DeepSeek 兜底（带上下文）
  const parsed = normalizeParsedIntent(message, await deepseekParse(message, context))

  // 如果 DeepSeek 返回 unknown，当作新推荐处理
  if (parsed.intent === 'unknown' && message.length > 1) {
    return {
      intent: 'new_recommendation',
      confidence: 0.4,
      query: message,
      needsDeepRank: false,
    }
  }

  return parsed
}
