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

export interface ParsedIntent {
  intent: AgentIntent
  confidence: number
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
  feedback: string[]
  titleExclude?: string[]  // 需要从歌名中排除的关键词
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
    ranked?: boolean
    fallback?: string
  }
}

export interface MusicAgentRequest {
  message: string
  history: { role: string; content: string }[]
  context: AgentContext | null
  userId?: string
  neteaseCookie?: string
}

/** DeepSeek 意图解析所需的上下文信息 */
export interface DeepSeekContext {
  history: { role: string; content: string }[]
  lastResults: Track[]
  topic?: string
  mood?: string[]
  language?: string
}
