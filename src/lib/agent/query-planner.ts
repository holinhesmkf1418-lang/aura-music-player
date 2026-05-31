import type { AgentContext, ParsedIntent, SearchPlan, RankHints } from './types'
import type { Track } from '@/lib/types'

/**
 * 根据意图和上下文生成搜索计划
 *
 * 职责：
 * - 把 ParsedIntent + AgentContext 转化为具体搜索查询
 * - scene/mood/topic 的 query 模板逻辑集中在此
 * - titleExclude 透传，不用排除词作为搜索主题
 */
export function createSearchPlan(
  context: AgentContext,
  parsed: ParsedIntent,
  seedTrack?: Track,
): SearchPlan {
  const { requestType } = parsed
  const titleExclude = parsed.titleExclude || context.titleExclude
  const excludeTrackIds = context.excludedTrackIds || []

  // 构建 rankHints
  const rankHints: RankHints = {
    scene: parsed.scene || context.scene,
    mood: parsed.mood || context.mood,
    genres: parsed.genres || context.genres,
    artists: parsed.artists || context.artists,
    language: parsed.language || context.language,
    energy: parsed.energy || context.energy,
    topic: parsed.topic || context.topic || parsed.query,
  }

  switch (requestType) {
    case 'vibe':
      return buildVibePlan(context, parsed, titleExclude, excludeTrackIds, rankHints)
    case 'scene':
      return buildScenePlan(context, parsed, titleExclude, excludeTrackIds, rankHints)
    case 'exact_track':
      return buildExactTrackPlan(parsed, titleExclude, excludeTrackIds, rankHints)
    case 'artist':
      return buildArtistPlan(parsed, titleExclude, excludeTrackIds, rankHints)
    case 'similar':
      return buildSimilarPlan(context, parsed, seedTrack, titleExclude, excludeTrackIds, rankHints)
    case 'control':
      return { queries: [], fallbackQueries: [], excludeTrackIds, rankHints }
    default:
      return buildVibePlan(context, parsed, titleExclude, excludeTrackIds, rankHints)
  }
}

// ============================================================
// Vibe 计划：情绪驱动搜索
// ============================================================

function buildVibePlan(
  context: AgentContext,
  parsed: ParsedIntent,
  titleExclude: string[] | undefined,
  excludeTrackIds: string[],
  rankHints: RankHints,
): SearchPlan {
  const queries: string[] = []
  const scene = rankHints.scene || ''
  const mood = rankHints.mood || []
  const topic = rankHints.topic || ''
  const genres = rankHints.genres || []
  const artists = rankHints.artists || []

  // 检测是否无聊/解闷场景
  const isBoredVibe =
    scene.includes('解闷') ||
    mood.some((m) => ['无聊', '轻松', '有趣', '提神'].includes(m))

  if (isBoredVibe) {
    queries.push(
      '轻松愉快 中文流行',
      '好听 提神 华语流行',
      '放松 解压 中文歌',
      '快乐 节奏感 歌曲',
    )
  }

  // 主查询：组合所有维度（跳过 titleExclude 里的词作为主题）
  const mainParts: string[] = []
  if (topic && !isExcluded(topic, titleExclude)) mainParts.push(topic)
  if (scene && !isExcluded(scene, titleExclude)) mainParts.push(scene)
  if (mood.length) mainParts.push(mood.join(' '))
  if (genres.length) mainParts.push(genres.join(' '))
  if (artists.length) mainParts.push(artists.join(' '))
  if (rankHints.language === 'zh') mainParts.push('中文')
  if (rankHints.energy === 'high') mainParts.push('节奏强')
  if (rankHints.energy === 'low') mainParts.push('舒缓')

  if (mainParts.length > 0) {
    queries.push(mainParts.join(' '))
  }

  // 多样化查询
  if (mood.length && topic && !isExcluded(topic, titleExclude)) {
    queries.push(`${topic} ${mood.join(' ')}`)
  }

  // 兼容旧 topic=query 的情况（DeepSeek 可能把 message 当成 topic）
  if (context.lastQuery && queries.length === 0) {
    queries.push(context.lastQuery)
  }

  return {
    queries: [...new Set(queries)].slice(0, 5),
    fallbackQueries: buildFallbackQueries(context, topic, titleExclude),
    titleExclude,
    excludeTrackIds,
    rankHints,
  }
}

// ============================================================
// Scene 计划：场景驱动搜索
// ============================================================

function buildScenePlan(
  context: AgentContext,
  parsed: ParsedIntent,
  titleExclude: string[] | undefined,
  excludeTrackIds: string[],
  rankHints: RankHints,
): SearchPlan {
  const queries: string[] = []
  const topic = rankHints.topic || ''
  const scene = rankHints.scene || ''

  // 场景扩展
  const sceneExpansions = getSceneExpansions(topic || scene)
  queries.push(...sceneExpansions)

  // 主查询
  const mainParts: string[] = []
  if (topic && !isExcluded(topic, titleExclude)) mainParts.push(topic)
  if (scene && !isExcluded(scene, titleExclude)) mainParts.push(scene)

  if (mainParts.length > 0) {
    queries.push(mainParts.join(' '))
  }

  if (queries.length === 0 && topic) {
    queries.push(topic)
  }

  return {
    queries: [...new Set(queries)].slice(0, 5),
    fallbackQueries: buildFallbackQueries(context, topic, titleExclude),
    titleExclude,
    excludeTrackIds,
    rankHints,
  }
}

/** 场景 → 搜索关键词映射 */
function getSceneExpansions(topic: string): string[] {
  const lower = topic.trim().toLowerCase()
  const expansions: string[] = []

  if (lower.includes('雨')) {
    expansions.push('雨天 适合听', '雨 氛围', '阴天 歌曲')
  }
  if (lower.includes('夏')) {
    expansions.push('夏日 歌单', '炎热 季节')
  }
  if (lower.includes('跑步') || lower.includes('运动') || lower.includes('健身')) {
    expansions.push('运动 音乐', '跑步 节奏')
  }
  if (lower.includes('夜晚') || lower.includes('深夜') || lower.includes('晚上')) {
    expansions.push('深夜 安静', '夜间')
  }
  if (lower.includes('学习') || lower.includes('工作') || lower.includes('专注')) {
    expansions.push('学习 专注 音乐', '轻音乐 工作')
  }
  if (lower.includes('开车') || lower.includes('驾驶')) {
    expansions.push('驾驶 音乐', '开车 歌单')
  }

  return expansions
}

// ============================================================
// Exact Track 计划：搜索特定歌曲
// ============================================================

function buildExactTrackPlan(
  parsed: ParsedIntent,
  titleExclude: string[] | undefined,
  excludeTrackIds: string[],
  rankHints: RankHints,
): SearchPlan {
  const queries: string[] = []
  const fallbackQueries: string[] = []

  if (parsed.query) {
    queries.push(parsed.query)
  }

  // 有歌手 + 无 query → 用歌手作为主查询
  if (parsed.artists?.length) {
    const artist = parsed.artists[0]
    if (parsed.query) {
      queries.push(`${artist} ${parsed.query}`)
    }
    fallbackQueries.push(`${artist} 热门歌曲`)
  }

  return {
    queries: queries.length > 0 ? queries : ['热门歌曲'],
    fallbackQueries,
    titleExclude,
    excludeTrackIds,
    rankHints,
    strictArtistMatch: true,
  }
}

// ============================================================
// Artist 计划：搜索歌手
// ============================================================

function buildArtistPlan(
  parsed: ParsedIntent,
  titleExclude: string[] | undefined,
  excludeTrackIds: string[],
  rankHints: RankHints,
): SearchPlan {
  const queries: string[] = []
  const fallbackQueries: string[] = []

  if (parsed.artists?.length) {
    const artist = parsed.artists[0]
    queries.push(artist)
    fallbackQueries.push(`${artist} 热门歌曲`, `${artist} 代表作`, `${artist} 新歌`)
  }

  return {
    queries: queries.length > 0 ? queries : ['热门歌曲'],
    fallbackQueries,
    titleExclude,
    excludeTrackIds,
    rankHints,
  }
}

// ============================================================
// Similar 计划：找相似曲目（基于 seedTrack 多维生成）
// ============================================================

function buildSimilarPlan(
  context: AgentContext,
  parsed: ParsedIntent,
  seedTrack: Track | undefined,
  titleExclude: string[] | undefined,
  excludeTrackIds: string[],
  rankHints: RankHints,
): SearchPlan {
  const queries: string[] = []
  const fallbackQueries: string[] = []

  if (!seedTrack) {
    return {
      queries: ['热门歌曲'],
      fallbackQueries: [],
      titleExclude,
      excludeTrackIds,
      rankHints,
    }
  }

  // 排除种子曲目自身
  const excludeIds = [...excludeTrackIds, seedTrack.id]

  // 多维搜索：不只搜同歌手
  // 1. 歌手 + 歌名关键词
  queries.push(`${seedTrack.artist} ${seedTrack.title.split(/[（(]/)[0].trim()}`)

  // 2. 歌手热门（覆盖同歌手不同歌曲）
  queries.push(`${seedTrack.artist} 热门歌曲`)

  // 3. 相似风格搜索
  queries.push(`类似 ${seedTrack.artist} 风格`)
  queries.push(`${seedTrack.artist} 风格 推荐`)

  // 4. 如果 seed track 或上下文有 genre 偏好，加入风格搜索
  if (seedTrack.genre) {
    queries.push(`${seedTrack.genre} ${seedTrack.artist} 风格`)
  }
  if (rankHints.genres?.length) {
    queries.push(`${rankHints.genres.join(' ')} 推荐`)
  }

  // 5. 如果 context 有场景/情绪，加入组合搜索
  const mainParts: string[] = []
  if (context.scene && !isExcluded(context.scene, titleExclude)) mainParts.push(context.scene)
  if (context.mood?.length) mainParts.push(context.mood.join(' '))
  if (mainParts.length > 0) {
    queries.push(mainParts.join(' ') + ' 音乐')
    // 结合歌手+场景的组合查询
    queries.push(`${seedTrack.artist} ${mainParts.join(' ')}`)
  }

  // fallback: 用歌手作为宽松搜索
  fallbackQueries.push(seedTrack.artist)
  fallbackQueries.push(`${seedTrack.artist} 相关推荐`)

  // 更新 rankHints，确保 ranker 知道要跟 seed track 相似
  const updatedHints: RankHints = {
    ...rankHints,
    topic: `类似 ${seedTrack.artist} - ${seedTrack.title}`,
  }

  return {
    queries: [...new Set(queries)].slice(0, 5),
    fallbackQueries,
    titleExclude,
    excludeTrackIds: excludeIds,
    rankHints: updatedHints,
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 检查关键词是否在排除列表中 */
function isExcluded(keyword: string, excludeList?: string[]): boolean {
  if (!excludeList || excludeList.length === 0) return false
  const lower = keyword.toLowerCase()
  return excludeList.some((kw) => lower.includes(kw.toLowerCase()))
}

/** 构建回退查询 */
function buildFallbackQueries(
  context: AgentContext,
  topic: string,
  titleExclude?: string[],
): string[] {
  const fallbacks: string[] = []

  const relaxedTopic = topic || context.topic || context.scene || ''
  if (relaxedTopic && !isExcluded(relaxedTopic, titleExclude)) {
    fallbacks.push(relaxedTopic)
  }

  if (context.lastQuery && !fallbacks.includes(context.lastQuery)) {
    fallbacks.push(context.lastQuery)
  }

  if (fallbacks.length === 0) {
    fallbacks.push('热门歌曲', '流行音乐')
  }

  return fallbacks
}
