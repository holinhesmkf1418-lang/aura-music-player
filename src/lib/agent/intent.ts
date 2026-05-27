import { chatWithDeepSeek } from '@/lib/deepseek'
import { normalizeArtistAlias } from '@/lib/artist-alias'
import type { ParsedIntent, DeepSeekContext, RequestType } from './types'

// ===== DeepSeek 返回值白名单校验 =====
const VALID_INTENTS = new Set([
  'new_recommendation', 'refresh_recommendations', 'adjust_recommendations',
  'similar_to_track', 'play_track', 'add_to_queue',
  'pause', 'resume', 'next_track', 'previous_track',
  'unknown',
])
const VALID_LANGUAGES = new Set(['zh', 'en', 'mixed', 'unknown'])
const VALID_ENERGIES = new Set(['low', 'medium', 'high', 'unknown'])
const VALID_REQUEST_TYPES = new Set(['exact_track', 'artist', 'vibe', 'scene', 'similar', 'control'])

function validateParsedFields(raw: Record<string, unknown>) {
  return {
    intent: typeof raw.intent === 'string' && VALID_INTENTS.has(raw.intent) ? raw.intent : undefined,
    requestType: typeof raw.requestType === 'string' && VALID_REQUEST_TYPES.has(raw.requestType) ? raw.requestType : undefined,
    language: typeof raw.language === 'string' && VALID_LANGUAGES.has(raw.language) ? raw.language : undefined,
    energy: typeof raw.energy === 'string' && VALID_ENERGIES.has(raw.energy) ? raw.energy : undefined,
    mood: Array.isArray(raw.mood) && raw.mood.every((v: unknown) => typeof v === 'string') ? raw.mood : undefined,
    genres: Array.isArray(raw.genres) && raw.genres.every((v: unknown) => typeof v === 'string') ? raw.genres : undefined,
    artists: Array.isArray(raw.artists) && raw.artists.every((v: unknown) => typeof v === 'string') ? raw.artists : undefined,
    titleExclude: Array.isArray(raw.titleExclude) && raw.titleExclude.every((v: unknown) => typeof v === 'string') ? raw.titleExclude : undefined,
    referencedTrackIndex: typeof raw.referencedTrackIndex === 'number' && raw.referencedTrackIndex >= 0 ? raw.referencedTrackIndex : undefined,
  }
}

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

/** 用户是否在表达"无聊/没劲/不知道听什么"情绪 —— 不是歌名搜索 */
function isBoredMoodRequest(text: string): boolean {
  if (/(这首歌|叫无聊|歌名.*无聊|无聊.*这首)/.test(text)) return false
  return /(有点无聊|很无聊|太无聊|现在.*无聊|无聊.*(来|听|推荐|合适|音乐|歌)|没劲|没意思|不知道听什么|不知道该听什么|随便来点|来几首合适)/.test(text)
}

const NON_ARTIST_TERMS = [
  '夏天', '冬天', '春天', '秋天', '夜晚', '晚上', '深夜', '下雨', '雨天',
  '跑步', '运动', '健身', '学习', '工作', '开车', '驾驶',
  '开心', '快乐', '伤感', '悲伤', '安静', '舒缓', '放松', '提神', '无聊',
  '中文', '英文', '粤语', '日语', '韩语', '流行', '摇滚', '民谣', '说唱', '电子',
]

function cleanupArtistCandidate(raw: string): string {
  return raw
    .replace(/^(我)?(现在)?(想|要|想要|想听|要听|听|放|播放|搜|搜索|找|来点|来些|来几首|推荐)(一下|一些|几首|点)?/, '')
    .replace(/(的)?(歌|歌曲|音乐|作品|歌单|专辑)$/, '')
    .replace(/^(一些|几首|点|首)/, '')
    .replace(/[，,。.!！?？]/g, '')
    .trim()
}

function isLikelyArtistName(candidate: string): boolean {
  if (candidate.length < 2 || candidate.length > 24) return false
  if (NON_ARTIST_TERMS.some((term) => candidate.includes(term))) return false
  if (/(适合|类似|风格|一点|一些|几首|什么|随便|好听|热门|推荐|歌名)/.test(candidate)) return false
  if (/^第?[\d一二两三四五六七八九十]+\s*(首|个|条|曲)?$/.test(candidate)) return false
  return /^[\p{Script=Han}A-Za-z0-9·.\-_\s]+$/u.test(candidate)
}

function parseArtistFastPath(message: string): ParsedIntent | null {
  const patterns = [
    /^(?:我)?(?:现在)?(?:想听|要听|听|放|播放|搜|搜索|找|来点|来些|来几首|推荐)(.+?)(?:的)?(?:歌|歌曲|音乐|作品|歌单|专辑)?$/i,
    /^(.+?)的(?:歌|歌曲|音乐|作品|专辑)$/i,
  ]

  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (!match?.[1]) continue

    const artist = normalizeArtistAlias(cleanupArtistCandidate(match[1]))
    if (!isLikelyArtistName(artist)) continue

    return {
      intent: 'new_recommendation',
      confidence: 0.95,
      requestType: 'artist',
      artists: [artist],
      needsDeepRank: false,
    }
  }

  return null
}

/** 推断请求类型：从 ParsedIntent 的已有字段推断 requestType */
function inferRequestType(parsedIntent: {
  intent: string
  query?: string
  artists?: string[]
  topic?: string
  scene?: string
  mood?: string[]
}): RequestType {
  switch (parsedIntent.intent) {
    case 'similar_to_track':
      return 'similar'
    case 'play_track':
    case 'add_to_queue':
    case 'pause':
    case 'resume':
    case 'next_track':
    case 'previous_track':
      return 'control'
    default:
      break
  }

  // 有明确歌手 + 有 query → exact_track
  if (parsedIntent.artists?.length && parsedIntent.query) return 'exact_track'
  // 只有歌手 → artist
  if (parsedIntent.artists?.length) return 'artist'
  // 有明确搜索词但没场景/情绪 → exact_track
  if (parsedIntent.query && !parsedIntent.scene && !parsedIntent.mood?.length) return 'exact_track'
  // 有场景描述 → scene
  if (parsedIntent.scene) return 'scene'
  // 有情绪描述 → vibe
  if (parsedIntent.mood?.length) return 'vibe'
  // 有主题但不像精确搜索 → 看内容
  if (parsedIntent.topic) return 'scene'

  return 'vibe'
}

/**
 * 确定性匹配：通过正则快速识别常见控制类意图
 * 只做意图类型识别，不生成搜索关键词
 */
function deterministicParse(message: string): ParsedIntent | null {
  const trimmed = message.trim()

  // 基础控制类
  if (/^(暂停|停一下|停下)$/i.test(trimmed)) {
    return { intent: 'pause', confidence: 0.95, requestType: 'control', needsDeepRank: false }
  }
  if (/^(继续|恢复|接着放|播放)$/i.test(trimmed)) {
    return { intent: 'resume', confidence: 0.95, requestType: 'control', needsDeepRank: false }
  }
  if (/^(下一首|下一曲|切歌|跳过)$/i.test(trimmed)) {
    return { intent: 'next_track', confidence: 0.95, requestType: 'control', needsDeepRank: false }
  }
  if (/^(上一首|上一曲|回到上首|前一首)$/i.test(trimmed)) {
    return { intent: 'previous_track', confidence: 0.95, requestType: 'control', needsDeepRank: false }
  }
  if (/^(加入队列|加入播放列表|加入列表|加入歌单)$/i.test(trimmed)) {
    return { intent: 'add_to_queue', confidence: 0.9, requestType: 'control', needsDeepRank: false }
  }
  const addQueueRegex = /^(?:加入|添加)(?:第)?\s*([\d一二两三四五六七八九十]+)\s*(?:首|个|条|曲)?(?:到|入)?(?:队列|播放列表|列表|歌单)?$/i
  const addQueueMatch = trimmed.match(addQueueRegex)
  if (addQueueMatch) {
    const idx = chineseIndex(addQueueMatch[1])
    if (idx !== null && idx >= 0) {
      return {
        intent: 'add_to_queue',
        confidence: 0.95,
        requestType: 'control',
        referencedTrackIndex: idx,
        needsDeepRank: false,
      }
    }
  }

  // 用户否定"无聊是歌名" → 调整推荐
  if (/不是.*歌名.*无聊|无聊.*不是.*歌名|不是.*叫无聊/.test(trimmed)) {
    return {
      intent: 'adjust_recommendations',
      confidence: 0.92,
      requestType: 'vibe',
      replyTone: 'brief',
      needsDeepRank: true,
    }
  }

  // 用户表达"无聊/没劲"情绪 → 新推荐（vibe 类型）
  // 只标记 intent + requestType，scene/mood 交给 query-planner 处理
  if (isBoredMoodRequest(trimmed)) {
    return {
      intent: 'new_recommendation',
      confidence: 0.92,
      requestType: 'vibe',
      replyTone: 'brief',
      needsDeepRank: true,
    }
  }

  const artistIntent = parseArtistFastPath(trimmed)
  if (artistIntent) {
    return artistIntent
  }

  // 换一批 / 刷新推荐
  if (/^(换几首|换一批|再来几首|再来点|更多|下一批|换一些|再换一批)$/i.test(trimmed)) {
    return { intent: 'refresh_recommendations', confidence: 0.9, requestType: 'vibe', needsDeepRank: false }
  }

  // 播放第 N 首
  const playRegex = /^(?:播放|听|放|点)(?:第)?\s*([\d一二两三四五六七八九十]+)\s*(?:首|个|条|曲)?$/i
  const playMatch = trimmed.match(playRegex)
  if (playMatch) {
    const idx = chineseIndex(playMatch[1])
    if (idx !== null && idx >= 0) {
      return {
        intent: 'play_track',
        confidence: 0.95,
        requestType: 'control',
        referencedTrackIndex: idx,
        needsDeepRank: false,
      }
    }
  }

  // 类似第 N 首
  const similarRegex1 = /^(?:类似|相似的|找类似|和.*?类似)(?:第)?\s*([\d一二两三四五六七八九十]+)\s*(?:首|个|条)?$/i
  const simMatch1 = trimmed.match(similarRegex1)
  if (simMatch1) {
    const idx = chineseIndex(simMatch1[1])
    if (idx !== null && idx >= 0) {
      return {
        intent: 'similar_to_track',
        confidence: 0.85,
        requestType: 'similar',
        referencedTrackIndex: idx,
        needsDeepRank: true,
      }
    }
  }

  // 找和第 N 首类似的
  const similarRegex2 = /^(?:找|来|要)(?:.*?)(?:和第|和|跟)?\s*([\d一二两三四五六七八九十]+)\s*(?:首|个|条)?\s*(?:类似|相似|差不多|一样风格)/i
  const simMatch2 = trimmed.match(similarRegex2)
  if (simMatch2) {
    const idx = chineseIndex(simMatch2[1])
    if (idx !== null && idx >= 0) {
      return {
        intent: 'similar_to_track',
        confidence: 0.85,
        requestType: 'similar',
        referencedTrackIndex: idx,
        needsDeepRank: true,
      }
    }
  }

  // 排除/不要歌名带关键词 — 不设 scene，避免被当成场景搜索
  const excludeRegex = /(?:不希望|不要|排除|别让|避免)(?:歌名|标题|名字|歌曲名|名里).*?(?:带着|带|有|含|包含|出现)\s*(.{2,10}?)(?:三个字|四个字|六个字|，|,|、|的字|的歌名|$)/i
  const excludeMatch = trimmed.match(excludeRegex)
  if (excludeMatch && excludeMatch[1]) {
    let word = excludeMatch[1].trim()
    word = word.replace(/三个字$|四个字$|六个字$/, '').trim()
    if (word.length >= 2) {
      return {
        intent: 'adjust_recommendations',
        confidence: 0.8,
        requestType: 'vibe',
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
        requestType: 'vibe',
        titleExclude: [word],
        replyTone: 'brief',
        needsDeepRank: false,
      }
    }
  }

  return null
}

/**
 * 修正 DeepSeek 的误解析：
 * - "不是歌名叫无聊" → 应该是 adjust_recommendations 而非新搜索
 * - "我有点无聊" → 应该是 vibe 请求而非 exact track
 *
 * 只修正 intent 类型和 requestType，不覆盖 DeepSeek 提取的 scene/mood 等元数据
 */
function normalizeParsedIntent(message: string, parsed: ParsedIntent): ParsedIntent {
  const trimmed = message.trim()

  // 用户明确纠正 "不是歌名叫无聊"
  if (/不是.*歌名.*无聊|无聊.*不是.*歌名|不是.*叫无聊/.test(trimmed)) {
    return {
      ...parsed,
      intent: 'adjust_recommendations',
      requestType: 'vibe',
      // 不覆盖 scene/mood — 保留 DeepSeek 或之前 context 的设定
    }
  }

  // 用户表达了无聊情绪，但 DeepSeek 可能误解为精确搜索
  if (isBoredMoodRequest(trimmed)) {
    return {
      ...parsed,
      intent: parsed.intent === 'adjust_recommendations'
        ? 'adjust_recommendations'
        : 'new_recommendation',
      requestType: 'vibe',
      // 不覆盖 scene/mood
    }
  }

  return parsed
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

请求类型（requestType）：
- exact_track：搜特定歌曲（如"周杰伦晴天"）
- artist：搜歌手（如"来点周杰伦的歌"）
- vibe：情绪驱动（如"有点无聊" "来点开心的"）—— 注意不要把情绪词当成歌名
- scene：场景驱动（如"跑步听的" "学习时听的"）
- similar：找相似曲目
- control：播放控制

JSON 字段：
{
  "intent": "意图名称",
  "confidence": 0-1 的小数,
  "requestType": "exact_track/artist/vibe/scene/similar/control",
  "replyTone": "brief" 或 "explanatory",
  "query": "精确搜索关键词（只有 exact_track/artist 时才填具体搜索词）",
  "topic": "主题（如夏天、夜晚、下雨天）",
  "scene": "场景（如驾驶、跑步、学习）",
  "mood": ["情绪标签（如轻松、伤感、提神、无聊）"],
  "genres": ["风格"],
  "artists": ["歌手"],
  "language": "zh/en/mixed/unknown",
  "era": "年代",
  "energy": "low/medium/high/unknown",
  "referencedTrackIndex": "数字索引（从0开始）",
  "count": "推荐数量",
  "needsDeepRank": true/false,
  "titleExclude": ["需要从歌名里排除的关键词（如"不要歌名带夏天"→["夏天"]）"]
}

规则：
- 不要把情绪/场景描述词填成 query（如"我有点无聊"→query 留空，requestType=vibe）
- "不要歌名带XX""排除XX" → 提取为 titleExclude，不要当成 topic/scene
- 简单请求（直接搜歌手/歌曲）→ needsDeepRank=false
- 复杂请求（多条件组合、情绪调整）→ needsDeepRank=true
- 如果用户在当前结果基础上调整（不要这么伤感、换成中文的），设为 adjust_recommendations
- 不确定时 confidence 给低值`

  if (context) {
    const trackList = context.lastResults.slice(0, 8).map((t, i) => `第${i + 1}首「${t.title}」- ${t.artist}`).join('；') || '无'
    prompt += `\n\n当前对话上下文：
- 已有推荐结果：${trackList}
- 当前主题：${context.topic || '未设定'}
- 当前场景：${context.scene || '未设定'}
- 当前情绪：${(context.mood || []).join('、') || '未设定'}
- 当前风格：${(context.genres || []).join('、') || '未设定'}
- 当前歌手：${(context.artists || []).join('、') || '未设定'}
- 当前语言偏好：${context.language || '未设定'}
- 当前年代：${context.era || '未设定'}
- 当前能量：${context.energy || '未设定'}
- 歌名排除词：${(context.titleExclude || []).join('、') || '无'}
- 最近搜索词：${(context.lastSearchQueries || []).join('、') || '无'}
- 用户播放反馈：${(context.feedback || []).map((item) => item.title ? `已播放「${item.title}」-${item.artist || '未知歌手'}` : `已播放 track:${item.trackId}`).join('；') || '无'}

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
    return { intent: 'unknown', confidence: 0, requestType: 'vibe', needsDeepRank: false }
  }

  try {
    const raw = JSON.parse(result)
    const v = validateParsedFields(raw)

    return {
      intent: (v.intent || 'unknown') as ParsedIntent['intent'],
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 0,
      requestType: (v.requestType || inferRequestType({ ...raw, intent: v.intent || 'unknown' })) as RequestType,
      replyTone: raw.replyTone === 'brief' || raw.replyTone === 'explanatory' ? raw.replyTone : undefined,
      query: typeof raw.query === 'string' ? raw.query : undefined,
      topic: typeof raw.topic === 'string' ? raw.topic : undefined,
      scene: typeof raw.scene === 'string' ? raw.scene : undefined,
      mood: v.mood,
      genres: v.genres,
      artists: v.artists,
      language: v.language as ParsedIntent['language'],
      era: typeof raw.era === 'string' ? raw.era : undefined,
      energy: v.energy as ParsedIntent['energy'],
      referencedTrackIndex: v.referencedTrackIndex,
      count: typeof raw.count === 'number' ? raw.count : undefined,
      needsDeepRank: raw.needsDeepRank === true,
      titleExclude: v.titleExclude,
    }
  } catch {
    return { intent: 'unknown', confidence: 0, requestType: 'vibe', needsDeepRank: false }
  }
}

/**
 * 解析用户消息为结构化意图
 *
 * 策略：先尝试确定性匹配（快路径），不匹配时调 DeepSeek（带上下文）
 * 只做意图识别，不生成搜索关键词
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

  // 如果 DeepSeek 返回 unknown
  if (parsed.intent === 'unknown' && message.length > 1) {
    // 如果有历史上下文，优先当调整
    if (context?.lastResults?.length) {
      return {
        intent: 'adjust_recommendations',
        confidence: 0.3,
        requestType: 'vibe',
        needsDeepRank: true,
      }
    }
    // 明显是纠偏/调整语句 → 不当搜索
    if (/^(不是|不要|别|换个|不要这种|不行|不对)/.test(message.trim())) {
      return {
        intent: 'adjust_recommendations',
        confidence: 0.3,
        requestType: 'vibe',
        needsDeepRank: true,
      }
    }
    return {
      intent: 'new_recommendation',
      confidence: 0.4,
      requestType: 'vibe',
      query: message,
      needsDeepRank: false,
    }
  }

  return parsed
}
