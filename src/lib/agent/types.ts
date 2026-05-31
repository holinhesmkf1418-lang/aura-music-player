import { Track } from '@/lib/types'

export type AgentIntent =
  | 'new_recommendation'
  | 'refresh_recommendations'
  | 'adjust_recommendations'
  | 'similar_to_track'
  | 'play_track'
  | 'add_to_queue'
  | 'pause'
  | 'resume'
  | 'next_track'
  | 'previous_track'
  | 'unknown'

/** 请求类型：描述用户想要什么种类的音乐 */
export type RequestType =
  | 'exact_track'   // 搜特定歌曲，如"周杰伦晴天"
  | 'artist'        // 搜歌手，如"来点周杰伦的"
  | 'vibe'          // 情绪驱动，如"有点无聊" "来点开心的"
  | 'scene'         // 场景驱动，如"跑步听的" "学习时听的"
  | 'similar'       // 找相似曲目
  | 'control'       // 播放控制

export interface ParsedIntent {
  intent: AgentIntent
  confidence: number
  requestType: RequestType
  replyTone?: 'brief' | 'explanatory'
  query?: string
  topic?: string
  scene?: string
  mood?: string[]
  genres?: string[]
  artists?: string[]
  language?: 'zh' | 'en' | 'mixed' | 'unknown'
  era?: string
  energy?: 'low' | 'medium' | 'high' | 'unknown'
  referencedTrackIndex?: number
  count?: number
  needsDeepRank: boolean
  titleExclude?: string[]  // 需要从歌名中排除的关键词
}

export interface AgentContext {
  topic?: string
  scene?: string
  mood?: string[]
  genres?: string[]
  artists?: string[]
  language?: 'zh' | 'en' | 'mixed' | 'unknown'
  era?: string
  energy?: 'low' | 'medium' | 'high' | 'unknown'
  lastQuery?: string
  lastSearchQueries?: string[]
  lastResults: Track[]
  excludedTrackIds: string[]
  feedback: AgentFeedback[]
  titleExclude?: string[]  // 需要从歌名中排除的关键词
}

export interface AgentFeedback {
  action: 'played'
  trackId: string
  title?: string
  artist?: string
  at?: number
}

/** 排序提示：告诉 ranker 用户的偏好维度 */
export interface RankHints {
  scene?: string
  mood?: string[]
  genres?: string[]
  language?: string
  energy?: string
  topic?: string
  artists?: string[]
}

/** 搜索计划：query-planner 输出，search.ts 执行 */
export interface SearchPlan {
  queries: string[]
  fallbackQueries: string[]
  titleExclude?: string[]
  excludeTrackIds: string[]
  rankHints: RankHints
  maxTracks?: number
  strictArtistMatch?: boolean
}

export type AgentAction =
  | { type: 'replace_results'; tracks: Track[] }
  | { type: 'play_track'; track: Track }
  | { type: 'append_queue'; tracks: Track[] }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'next_track' }
  | { type: 'previous_track' }

export interface AgentResponse {
  reply: string
  intent: AgentIntent
  tracks: Track[]
  actions: AgentAction[]
  context: AgentContext
  debug?: {
    searchQueries?: string[]
    searchErrors?: string[]
    ranked?: boolean
    fallback?: string
    rankFallbackReason?: string
  }
}

export type AgentProgressEvent =
  | { status: 'parsing' }
  | { status: 'searching'; queries: string[] }
  | { status: 'ranking' }
  | { status: 'done'; data: AgentResponse }
  | { status: 'error'; error: string }

export interface MusicAgentRequest {
  message: string
  history: { role: string; content: string }[]
  context: AgentContext | null
  userId?: string
  neteaseCookie?: string
  onProgress?: (event: Exclude<AgentProgressEvent, { status: 'done' | 'error' }>) => void | Promise<void>
}

/** DeepSeek 意图解析所需的上下文信息 */
export interface DeepSeekContext {
  history: { role: string; content: string }[]
  lastResults: Track[]
  topic?: string
  scene?: string
  mood?: string[]
  genres?: string[]
  artists?: string[]
  language?: string
  era?: string
  energy?: string
  titleExclude?: string[]
  lastSearchQueries?: string[]
  feedback?: AgentFeedback[]
}

export interface SearchExecutionResult {
  tracks: Track[]
  errors: string[]
}
