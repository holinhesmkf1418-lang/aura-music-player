import type { AgentContext, ParsedIntent } from './types'

/**
 * 创建空的默认上下文
 */
export function createEmptyContext(): AgentContext {
  return {
    lastResults: [],
    excludedTrackIds: [],
    feedback: [],
  }
}

/**
 * 根据意图类型合并新旧上下文
 *
 * 规则：
 * - new_recommendation：重置上下文，使用新参数
 * - refresh_recommendations：保留主题/场景/情绪，排除旧结果
 * - adjust_recommendations：保留旧上下文，合并新约束，排除旧结果
 * - similar_to_track：保留部分上下文，用种子曲目重新推荐
 * - 控制类意图：上下文不变
 */
export function mergeContext(
  previous: AgentContext | null,
  parsed: ParsedIntent,
): AgentContext {
  if (!previous) {
    return buildContext(parsed)
  }

  switch (parsed.intent) {
    case 'new_recommendation':
      return buildContext(parsed)

    case 'refresh_recommendations':
      return {
        ...previous,
        lastSearchQueries: undefined,
        lastResults: [],
        excludedTrackIds: [
          ...previous.excludedTrackIds,
          ...previous.lastResults.map((t) => t.id),
        ].slice(-100), // 保留最近的 100 条
      }

    case 'adjust_recommendations':
      return {
        ...previous,
        ...(parsed.mood && { mood: parsed.mood }),
        ...(parsed.energy && { energy: parsed.energy }),
        ...(parsed.language && { language: parsed.language }),
        ...(parsed.era && { era: parsed.era }),
        ...(parsed.genres && { genres: parsed.genres }),
        ...(parsed.artists && { artists: parsed.artists }),
        ...(parsed.topic && { topic: parsed.topic }),
        ...(parsed.scene && { scene: parsed.scene }),
        ...(parsed.titleExclude && {
          titleExclude: [...new Set([...(previous.titleExclude || []), ...parsed.titleExclude])],
        }),
        lastQuery: parsed.query,
        lastSearchQueries: undefined,
        lastResults: [],
        excludedTrackIds: [
          ...previous.excludedTrackIds,
          ...previous.lastResults.map((t) => t.id),
        ].slice(-100),
      }

    case 'similar_to_track':
      return {
        topic: parsed.topic || previous.topic,
        scene: parsed.scene || previous.scene,
        mood: parsed.mood || previous.mood,
        genres: parsed.genres || previous.genres,
        artists: parsed.artists || previous.artists,
        language: parsed.language || previous.language,
        era: parsed.era || previous.era,
        energy: parsed.energy || previous.energy,
        lastQuery: previous.lastQuery,
        lastSearchQueries: undefined,
        lastResults: [],
        excludedTrackIds: [
          ...previous.excludedTrackIds,
          ...previous.lastResults.map((t) => t.id),
        ].slice(-100),
        feedback: [],
      }

    // 控制类意图：上下文不变
    default:
      return previous
  }
}

/**
 * 从解析的意图构建新上下文
 */
function buildContext(parsed: ParsedIntent): AgentContext {
  return {
    topic: parsed.topic || parsed.query,
    scene: parsed.scene,
    mood: parsed.mood,
    genres: parsed.genres,
    artists: parsed.artists,
    language: parsed.language,
    era: parsed.era,
    energy: parsed.energy,
    lastQuery: parsed.query,
    lastSearchQueries: undefined,
    lastResults: [],
    excludedTrackIds: [],
    feedback: [],
    titleExclude: parsed.titleExclude,
  }
}
