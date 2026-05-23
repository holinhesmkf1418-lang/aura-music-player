const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

function getApiKey(userApiKey?: string): string {
  return userApiKey || process.env.DEEPSEEK_API_KEY || ''
}

async function callDeepSeek(
  messages: { role: string; content: string }[],
  apiKey?: string
): Promise<string> {
  const key = getApiKey(apiKey)
  if (!key) return ''

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 512,
      }),
    })

    if (!res.ok) {
      console.warn(`DeepSeek API error: ${res.status} ${res.statusText}`)
      return ''
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || ''
  } catch (error) {
    console.warn('DeepSeek API call failed:', error)
    return ''
  }
}

/**
 * 智能搜索：将用户的自然语言查询转化为精确的搜索关键词
 * 例如 "来点适合跑步时听的歌" → "upbeat running music workout playlist"
 */
export async function enhanceSearchQuery(
  naturalLanguage: string,
  userApiKey?: string
): Promise<{ enhancedQuery: string; explanation: string }> {
  const result = await callDeepSeek(
    [
      {
        role: 'system',
        content: `你是一个音乐搜索助手。用户输入的是自然语言搜索意图，你需要：
1. 理解用户的真实需求（歌曲、歌手、风格、场景、情绪等）
2. 提取精确的搜索关键词（中英文均可，用最可能搜到结果的词）
3. 给出简短的意图解释

请严格按照以下 JSON 格式返回，不要加其他内容：
{"keywords":"提取的关键词","explanation":"简短的中文解释"}`,
      },
      {
        role: 'user',
        content: naturalLanguage,
      },
    ],
    userApiKey
  )

  if (!result) {
    // DeepSeek 不可用，直接返回原查询
    return { enhancedQuery: naturalLanguage, explanation: '' }
  }

  try {
    const parsed = JSON.parse(result)
    return {
      enhancedQuery: parsed.keywords || naturalLanguage,
      explanation: parsed.explanation || '',
    }
  } catch {
    return { enhancedQuery: naturalLanguage, explanation: '' }
  }
}

/**
 * 智能推荐：分析用户偏好和听歌历史，生成推荐关键词
 */
export async function generateRecommendationQueries(
  genres: string[],
  artists: string[],
  recentTracks: { title: string; artist: string }[],
  userApiKey?: string
): Promise<string[]> {
  const genreStr = genres.length > 0 ? genres.join('、') : '未指定'
  const artistStr = artists.length > 0 ? artists.join('、') : '未指定'
  const historyStr =
    recentTracks.length > 0
      ? recentTracks.map((t) => `${t.artist} - ${t.title}`).join('、')
      : '无历史记录'

  const result = await callDeepSeek(
    [
      {
        role: 'system',
        content: `你是一个音乐推荐助手。根据用户的偏好和听歌历史，推荐 3-5 个搜索关键词或短语，用于在音乐平台上搜索歌曲。

要求：
- 每个关键词应该是一个具体的音乐搜索词（歌手名、歌曲名、风格标签、场景等）
- 覆盖不同的方向：既有用户喜欢的类似音乐，也有适度拓展的新风格
- 返回 JSON 数组格式

请严格按照以下格式返回：
["关键词1", "关键词2", "关键词3"]`,
      },
      {
        role: 'user',
        content: `用户偏好的音乐风格：${genreStr}
用户关注的歌手：${artistStr}
最近收听的歌曲：${historyStr}

请推荐搜索关键词：`,
      },
    ],
    userApiKey
  )

  if (!result) return []

  try {
    const parsed = JSON.parse(result)
    if (Array.isArray(parsed)) {
      return parsed.filter((q) => typeof q === 'string').slice(0, 5)
    }
    return []
  } catch {
    return []
  }
}

/**
 * 歌词翻译：将外文歌词翻译成中文
 */
/**
 * 通用 DeepSeek 对话函数：接收消息数组，返回 AI 回复文本
 * 用于聊天 Agent 场景
 */
export async function chatWithDeepSeek(
  messages: { role: string; content: string }[],
  userApiKey?: string
): Promise<string> {
  return callDeepSeek(messages, userApiKey)
}

export async function translateLyrics(
  lyrics: string,
  fromLang: string,
  userApiKey?: string
): Promise<string> {
  if (!lyrics) return ''

  const result = await callDeepSeek(
    [
      {
        role: 'system',
        content: `你是一个歌词翻译助手。将${fromLang}歌词翻译成中文。
要求：
- 保留原始分段和换行
- 翻译要通顺，尽量保留歌词的韵律感
- 直接返回翻译结果，不要加额外说明`,
      },
      {
        role: 'user',
        content: lyrics,
      },
    ],
    userApiKey
  )

  return result || lyrics
}
