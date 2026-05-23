import type { Track } from '@/lib/types'
import type {
  AgentResponse,
  AgentContext,
  MusicAgentRequest,
  ParsedIntent,
  DeepSeekContext,
} from './types'
import { parseIntent } from './intent'
import { mergeContext, createEmptyContext } from './context'
import { searchForContext } from './search'
import { rankTracks } from './rank'

// 输入裁剪上限
const MAX_LAST_RESULTS = 20
const MAX_EXCLUDED_IDS = 100
const MAX_HISTORY = 10
const MAX_MESSAGE_LENGTH = 500

/**
 * 裁剪上下文，确保不会过大（保留最近的数据）
 */
function trimContext(context: AgentContext): AgentContext {
  return {
    ...context,
    lastResults: context.lastResults.slice(0, MAX_LAST_RESULTS),
    excludedTrackIds: context.excludedTrackIds.slice(-MAX_EXCLUDED_IDS),
    feedback: context.feedback.slice(-20),
  }
}

/**
 * 裁剪历史消息
 */
function trimHistory(
  history: { role: string; content: string }[],
): { role: string; content: string }[] {
  return history.slice(-MAX_HISTORY)
}

/**
 * 为推荐类意图生成回复
 */
function buildRecommendationReply(
  tracks: Track[],
  intent: ParsedIntent,
  searchQueries?: string[],
): string {
  if (tracks.length === 0) {
    return '没找到匹配的歌曲，换个说法试试？'
  }

  const count = tracks.length

  if (intent.intent === 'refresh_recommendations') {
    return `换了一批${intent.topic || '相关'}的歌给你，这次是另外 ${count} 首。`
  }
  if (intent.intent === 'adjust_recommendations') {
    return `按照你的要求调整了一下，这些 ${count} 首应该更符合你的感觉。`
  }
  if (intent.intent === 'similar_to_track') {
    return `找了一些风格相似的歌，共 ${count} 首。`
  }
  if (searchQueries?.length && searchQueries[0].length > 2) {
    return `关于「${searchQueries[0]}」，为你找到 ${count} 首相关歌曲。`
  }
  return `为你找到 ${count} 首歌曲。`
}

/**
 * 根据引用索引获取 Track
 */
function getReferencedTrack(
  context: AgentContext,
  index: number,
): Track | null {
  if (!context.lastResults || index < 0 || index >= context.lastResults.length) {
    return null
  }
  return context.lastResults[index]
}

/**
 * 构建 DeepSeek 意图解析所需的上下文
 */
function buildDeepSeekContext(
  previousContext: AgentContext,
  history: { role: string; content: string }[],
): DeepSeekContext {
  return {
    history,
    lastResults: previousContext.lastResults,
    topic: previousContext.topic,
    mood: previousContext.mood,
    language: previousContext.language,
  }
}

/**
 * AI 音乐助手核心处理器
 */
export async function handleMusicAgent(
  request: MusicAgentRequest,
): Promise<AgentResponse> {
  // ===== 输入裁剪 =====
  const message = request.message.slice(0, MAX_MESSAGE_LENGTH)
  const history = trimHistory(request.history || [])
  const previousContext = request.context
    ? trimContext(request.context)
    : createEmptyContext()

  // ===== 1. 意图解析（带上下文） =====
  const dsContext = buildDeepSeekContext(previousContext, history)
  const parsed = await parseIntent(message, dsContext)

  // ===== 2. 处理控制类意图（不搜索、不展示 tracks） =====
  // pause / resume / next_track / previous_track
  if (parsed.intent === 'pause') {
    return { reply: '已暂停', intent: 'pause', tracks: [], actions: [{ type: 'pause' }], context: previousContext }
  }
  if (parsed.intent === 'resume') {
    return { reply: '继续播放', intent: 'resume', tracks: [], actions: [{ type: 'resume' }], context: previousContext }
  }
  if (parsed.intent === 'next_track') {
    return { reply: '已切换到下一首', intent: 'next_track', tracks: [], actions: [{ type: 'next_track' }], context: previousContext }
  }
  if (parsed.intent === 'previous_track') {
    return { reply: '已回到上一首', intent: 'previous_track', tracks: [], actions: [{ type: 'previous_track' }], context: previousContext }
  }

  // ===== add_to_queue =====
  if (parsed.intent === 'add_to_queue') {
    if (previousContext.lastResults.length === 0) {
      return { reply: '当前没有可加入队列的歌曲，先搜一些歌吧', intent: 'add_to_queue', tracks: [], actions: [], context: previousContext }
    }
    return {
      reply: `已将 ${previousContext.lastResults.length} 首歌曲加入播放队列`,
      intent: 'add_to_queue',
      tracks: [],
      actions: [{ type: 'append_queue', tracks: previousContext.lastResults }],
      context: previousContext,
    }
  }

  // ===== play_track（不展示 tracks，只执行播放动作） =====
  if (parsed.intent === 'play_track') {
    const refIndex = parsed.referencedTrackIndex ?? 0
    const track = getReferencedTrack(previousContext, refIndex)
    if (!track) {
      return {
        reply: `没有找到第 ${refIndex + 1} 首歌曲，当前结果只有 ${previousContext.lastResults.length} 首。`,
        intent: 'play_track',
        tracks: [],
        actions: [],
        context: previousContext,
        debug: { fallback: 'referenced_track_index_out_of_range' },
      }
    }
    return {
      reply: `正在播放：${track.title} - ${track.artist}`,
      intent: 'play_track',
      tracks: [],
      actions: [{ type: 'play_track', track }],
      context: previousContext,
    }
  }

  // ===== 3. 上下文合并（推荐类意图） =====
  const mergedContext = mergeContext(previousContext, parsed)

  // ===== similar_to_track =====
  if (parsed.intent === 'similar_to_track') {
    const refIndex = parsed.referencedTrackIndex ?? 0
    const seedTrack = getReferencedTrack(previousContext, refIndex)
    if (!seedTrack) {
      return {
        reply: `没有找到第 ${refIndex + 1} 首歌曲。`,
        intent: 'similar_to_track',
        tracks: [],
        actions: [],
        context: previousContext,
        debug: { fallback: 'referenced_track_index_out_of_range' },
      }
    }

    const seedContext: AgentContext = {
      ...mergedContext,
      topic: seedTrack.artist,
      lastQuery: `${seedTrack.artist} ${seedTrack.title}`,
    }

    const { tracks, searchQueries } = await searchForContext(seedContext, request.neteaseCookie)
    let finalTracks = tracks

    if (parsed.needsDeepRank && finalTracks.length > 1) {
      const ranked = await rankTracks(finalTracks, seedContext)
      if (ranked.length > 0) finalTracks = ranked
    }

    const resultContext: AgentContext = {
      ...seedContext,
      lastSearchQueries: searchQueries,
      lastResults: finalTracks,
      excludedTrackIds: [
        ...seedContext.excludedTrackIds,
        ...finalTracks.map((t) => t.id),
      ].slice(-MAX_EXCLUDED_IDS),
    }

    return {
      reply: buildRecommendationReply(finalTracks, parsed, searchQueries),
      intent: 'similar_to_track',
      tracks: finalTracks,
      actions: [{ type: 'replace_results', tracks: finalTracks }],
      context: resultContext,
      debug: { searchQueries, ranked: parsed.needsDeepRank },
    }
  }

  // ===== 4. 推荐类意图：搜索 =====
  const { tracks, searchQueries } = await searchForContext(mergedContext, request.neteaseCookie)
  let finalTracks = tracks

  if (parsed.needsDeepRank && finalTracks.length > 1) {
    const ranked = await rankTracks(finalTracks, mergedContext)
    if (ranked.length > 0) finalTracks = ranked
  }

  // ===== 5. 构建响应 =====
  const resultContext: AgentContext = {
    ...mergedContext,
    lastSearchQueries: searchQueries,
    lastResults: finalTracks,
    excludedTrackIds: [
      ...mergedContext.excludedTrackIds,
      ...finalTracks.map((t) => t.id),
    ].slice(-MAX_EXCLUDED_IDS),
  }

  return {
    reply: buildRecommendationReply(finalTracks, parsed, searchQueries),
    intent: parsed.intent,
    tracks: finalTracks,
    actions: finalTracks.length > 0
      ? [{ type: 'replace_results', tracks: finalTracks }]
      : [],
    context: resultContext,
    debug: { searchQueries, ranked: parsed.needsDeepRank },
  }
}
