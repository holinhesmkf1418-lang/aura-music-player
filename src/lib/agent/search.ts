import { searchTracks } from '@/lib/music-service'
import type { Track } from '@/lib/types'
import type { AgentContext } from './types'

/**
 * 根据上下文生成多样化的搜索查询
 */
function generateQueries(context: AgentContext): string[] {
  const queries: string[] = []
  const topic = context.topic || ''
  const scene = context.scene || ''
  const mood = context.mood || []
  const genres = context.genres || []
  const isBoredScene =
    scene.includes('解闷') ||
    mood.some((m) => ['无聊', '轻松', '有趣', '提神'].includes(m)) ||
    context.titleExclude?.some((kw) => ['无聊', 'bored'].includes(kw.toLowerCase()))

  if (isBoredScene) {
    queries.push(
      '轻松愉快 中文流行',
      '好听 提神 华语流行',
      '放松 解压 中文歌',
      '快乐 节奏感 歌曲',
    )
  }

  // 1. 主查询：组合所有上下文
  const mainParts: string[] = []
  if (topic) mainParts.push(topic)
  if (scene) mainParts.push(scene)
  if (mood.length) mainParts.push(mood.join(' '))
  if (genres.length) mainParts.push(genres.join(' '))
  if (context.artists?.length) mainParts.push(context.artists.join(' '))
  if (context.era) mainParts.push(context.era)
  if (context.energy === 'high') mainParts.push('节奏强')
  if (context.energy === 'low') mainParts.push('舒缓')
  if (context.language === 'zh') mainParts.push('中文')

  if (mainParts.length > 0) {
    queries.push(mainParts.join(' '))
  }

  // 2. 多样化查询：避开直接用 topic 搜索导致歌名高度重复
  // 用 scene + mood 组合生成不同的搜索角度
  if (topic && !topic.includes(' ')) {
    // 单主题词 → 生成情感/场景扩展查询
    const extensions: string[] = []
    if (mood.length) {
      extensions.push(`${topic} ${mood.join(' ')}`)
    }
    if (scene) {
      extensions.push(`${scene} ${topic}`)
    }
    if (genres.length) {
      extensions.push(`${topic} ${genres[0]}`)
    }
    // 通用场景扩展
    if (topic === '下雨天' || topic.includes('雨')) {
      extensions.push('雨天 适合听')
      extensions.push('雨 氛围')
      extensions.push('阴天 歌曲')
    }
    if (topic === '夏天' || topic.includes('夏')) {
      extensions.push('夏日 歌单')
      extensions.push('炎热 季节')
    }
    if (topic.includes('夜晚') || topic.includes('深夜') || topic.includes('晚上')) {
      extensions.push('深夜 安静')
      extensions.push('夜间')
    }
    if (topic.includes('跑步') || topic.includes('运动') || topic.includes('健身')) {
      extensions.push('运动 音乐')
      extensions.push('跑步 节奏')
    }
    queries.push(...extensions.filter(Boolean))
  }

  // 3. 最后添加 lastQuery（如果和已有查询不同）
  if (context.lastQuery) {
    const allQueries = new Set(queries.map(q => q.trim().toLowerCase()))
    const lastLow = context.lastQuery.trim().toLowerCase()
    if (!allQueries.has(lastLow)) {
      queries.push(context.lastQuery)
    }
  }

  return [...new Set(queries)].slice(0, 5).filter(Boolean)
}

/**
 * 按歌名关键词过滤
 */
function filterByTitleExclude(
  tracks: Track[],
  titleExclude?: string[],
): Track[] {
  if (!titleExclude || titleExclude.length === 0) return tracks
  return tracks.filter((t) => {
    const lowerTitle = t.title.toLowerCase()
    return !titleExclude.some((kw) => lowerTitle.includes(kw.toLowerCase()))
  })
}

/**
 * 搜索并合并结果
 * - 执行多轮搜索
 * - 去重
 * - 排除已推荐的歌曲
 * - 按 titleExclude 过滤歌名关键词
 * - 如果结果不足，放宽约束重试一次
 */
export async function searchForContext(
  context: AgentContext,
  neteaseCookie?: string,
): Promise<{ tracks: Track[]; searchQueries: string[] }> {
  const queries = generateQueries(context)

  if (queries.length === 0) {
    return { tracks: [], searchQueries: [] }
  }

  const allTracks: Track[] = []
  const seenIds = new Set<string>()
  const excludeSet = new Set(context.excludedTrackIds || [])
  const titleExclude = context.titleExclude

  for (const query of queries) {
    try {
      const result = await searchTracks({
        query,
        maxResults: 10,
        useDeepSeek: false,
        neteaseCookie,
      })

      for (const track of result.tracks) {
        if (!seenIds.has(track.id) && !excludeSet.has(track.id)) {
          seenIds.add(track.id)
          allTracks.push(track)
        }
      }
    } catch {
      continue
    }
  }

  // 按 titleExclude 过滤
  let filtered = filterByTitleExclude(allTracks, titleExclude)

  // 如果过滤后不足 3 首，放宽 titleExclude
  if (titleExclude && titleExclude.length > 0 && filtered.length < 3) {
    // 排除掉全部带了排除词的结果，但放宽到允许部分匹配
    filtered = allTracks.filter((t) => {
      const lowerTitle = t.title.toLowerCase()
      const matches = titleExclude.filter((kw) => lowerTitle.includes(kw.toLowerCase()))
      return matches.length === 0
    })
  }

  let finalTracks = filtered.slice(0, 10)

  // 如果结果不足 5 首，尝试放宽约束
  if (finalTracks.length < 5) {
    const relaxedQuery = context.topic || context.scene || ''
    if (relaxedQuery && !queries.includes(relaxedQuery)) {
      try {
        const result = await searchTracks({
          query: relaxedQuery,
          maxResults: 10,
          useDeepSeek: false,
          neteaseCookie,
        })
        for (const track of result.tracks) {
          if (!seenIds.has(track.id) && !excludeSet.has(track.id)) {
            seenIds.add(track.id)
            // 也按 titleExclude 过滤
            if (titleExclude && titleExclude.length > 0) {
              const lowerTitle = track.title.toLowerCase()
              if (titleExclude.some((kw) => lowerTitle.includes(kw.toLowerCase()))) continue
            }
            finalTracks.push(track)
          }
        }
        finalTracks = finalTracks.slice(0, 10)
      } catch {
        // 忽略
      }
    }
  }

  return { tracks: finalTracks, searchQueries: queries }
}
