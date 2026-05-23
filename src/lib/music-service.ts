import { Track } from './types'
import { enhanceSearchQuery, generateRecommendationQueries } from './deepseek'
import { searchMusic, getTrackLyrics as chineseTrackLyrics, getTrackStreamUrl, MusicPlatform } from './chinese-music-api'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

/** 过滤掉没有可播放音频链接的歌曲 */
function filterPlayable(tracks: Track[]): Track[] {
  return tracks.filter((t) => t.audioUrl)
}

// 获取 YouTube/DeepSeek API Key
function getApiKey(userApiKey?: string): string {
  return userApiKey || process.env.YOUTUBE_API_KEY || ''
}
function getDeepSeekKey(userApiKey?: string): string {
  return userApiKey || process.env.DEEPSEEK_API_KEY || ''
}

export interface SearchOptions {
  query: string
  maxResults?: number
  type?: 'video' | 'playlist'
  apiKey?: string
  deepseekKey?: string
  useDeepSeek?: boolean
  platform?: MusicPlatform
  neteaseCookie?: string
}

export async function searchTracks(options: SearchOptions): Promise<{ tracks: Track[]; explanation?: string }> {
  let { query, maxResults = 20, apiKey, deepseekKey, platform = 'netease', neteaseCookie } = options
  const key = getApiKey(apiKey)
  let explanation: string | undefined

  // 使用 DeepSeek 增强搜索：理解自然语言
  if (options.useDeepSeek !== false && getDeepSeekKey(deepseekKey)) {
    const enhanced = await enhanceSearchQuery(query, deepseekKey)
    if (enhanced.enhancedQuery && enhanced.enhancedQuery !== query) {
      explanation = enhanced.explanation || undefined
      query = enhanced.enhancedQuery
    }
  }

  // 1. 优先使用中文音乐 API
  try {
    const chineseTracks = await searchMusic(query, platform, maxResults, neteaseCookie)
    const playable = filterPlayable(chineseTracks)
    if (playable.length > 0) {
      return { tracks: playable, explanation }
    }
  } catch (error) {
    console.error('Chinese music API search failed:', error)
  }

  // 2. 回退到 YouTube API（YouTube URL 在浏览器 audio 元素中不可直接播放，但也列出）
  if (key) {
    try {
      const searchUrl = `${YOUTUBE_API_BASE}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&videoCategoryId=10&key=${key}`
      const response = await fetch(searchUrl)
      if (!response.ok) throw new Error('YouTube API error')
      const data = await response.json()

      const videoIds = data.items.map((item: any) => item.id.videoId).join(',')
      if (!videoIds) return { tracks: [], explanation }

      const videoUrl = `${YOUTUBE_API_BASE}/videos?part=contentDetails,snippet&id=${videoIds}&key=${key}`
      const videoRes = await fetch(videoUrl)
      const videoData = await videoRes.json()

      const tracks = videoData.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        cover: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
        duration: parseDuration(item.contentDetails.duration),
        audioUrl: `https://www.youtube.com/watch?v=${item.id}`,
      }))

      const playable = filterPlayable(tracks)
      return { tracks: playable, explanation }
    } catch (error) {
      console.error('YouTube search failed:', error)
    }
  }

  // 3. 最后回退到 Mock 数据
  const fallback = filterPlayable(getMockTracks(query))
  return { tracks: fallback, explanation }
}

export async function getTrackLyrics(trackId: string, title: string, artist: string): Promise<string | null> {
  // 如果 trackId 包含平台前缀（如 netease:12345），使用中文音乐 API 获取歌词
  const platformMatch = trackId.match(/^(netease|tencent|kugou|baidu|kuwo):(.+)$/)
  if (platformMatch) {
    const [, platform, id] = platformMatch
    try {
      const lyrics = await chineseTrackLyrics(id, platform as MusicPlatform)
      if (lyrics) return lyrics
    } catch {
      // 回退到歌词 API
    }
  }

  // 回退到 lyrics.ovh
  try {
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.lyrics || null
  } catch {
    return null
  }
}

export async function getRecommendations(
  genres: string[],
  artists: string[],
  recentTracks: { title: string; artist: string }[] = [],
  apiKey?: string,
  deepseekKey?: string,
  neteaseCookie?: string,
): Promise<Track[]> {
  const key = getApiKey(apiKey)

  // 1. 优先使用 DeepSeek + 中文音乐 API 生成智能推荐
  const searchQueries: string[] = []

  if (getDeepSeekKey(deepseekKey) && (genres.length > 0 || artists.length > 0 || recentTracks.length > 0)) {
    try {
      const queries = await generateRecommendationQueries(genres, artists, recentTracks, deepseekKey)
      searchQueries.push(...queries)
    } catch {
      // 回退
    }
  }

  // 构建常规搜索词
  searchQueries.push(
    ...genres.map(g => `${g} 音乐精选`),
    ...artists.map(a => `${a} 热门歌曲`),
    ...recentTracks.slice(0, 3).map(t => `${t.artist} ${t.title}`),
  )

  if (searchQueries.length === 0) {
    searchQueries.push('热门歌曲', '流行音乐')
  }

  // 尝试中文音乐 API
  const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)]
  try {
    const result = await searchTracks({ query: randomQuery, maxResults: 20, apiKey: key, useDeepSeek: false, deepseekKey, neteaseCookie })
    if (result.tracks.length >= 5) return result.tracks
  } catch {
    // 回退到下一层
  }

  // 2. 回退到 YouTube
  if (key) {
    const ytQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)]
    const result = await searchTracks({ query: ytQuery, maxResults: 20, apiKey: key, useDeepSeek: false })
    if (result.tracks.length > 0) return result.tracks
  }

  // 3. 最终回退到 Mock 数据
  return getMockTracks('recommended music')
}

export async function searchByGenre(genre: string, apiKey?: string): Promise<Track[]> {
  const result = await searchTracks({ query: `${genre} 音乐`, maxResults: 20, apiKey, useDeepSeek: false })
  return result.tracks
}

/** 获取歌曲的流播放链接（按需获取） */
export async function fetchTrackStreamUrl(trackId: string): Promise<string | null> {
  const platformMatch = trackId.match(/^(netease|tencent|kugou|baidu|kuwo):(.+)$/)
  if (platformMatch) {
    const [, platform, id] = platformMatch
    return getTrackStreamUrl(id, platform as MusicPlatform)
  }
  return null
}

export function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return 0

  const hours = parseInt(match[1]?.replace('H', '') || '0')
  const minutes = parseInt(match[2]?.replace('M', '') || '0')
  const seconds = parseInt(match[3]?.replace('S', '') || '0')

  return hours * 3600 + minutes * 60 + seconds
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 当没有 API Key 时使用的 mock 数据
function getMockTracks(query: string): Track[] {
  const mockTracks: Track[] = [
    { id: 'mock-1', title: '晴天', artist: '周杰伦', cover: 'https://picsum.photos/seed/sunny/300/300', duration: 276 },
    { id: 'mock-2', title: '七里香', artist: '周杰伦', cover: 'https://picsum.photos/seed/qilixiang/300/300', duration: 299 },
    { id: 'mock-3', title: '简单爱', artist: '周杰伦', cover: 'https://picsum.photos/seed/simple/300/300', duration: 254 },
    { id: 'mock-4', title: '夜曲', artist: '周杰伦', cover: 'https://picsum.photos/seed/nocturne/300/300', duration: 224 },
    { id: 'mock-5', title: '告白气球', artist: '周杰伦', cover: 'https://picsum.photos/seed/balloon/300/300', duration: 215 },
    { id: 'mock-6', title: '起风了', artist: '买辣椒也用券', cover: 'https://picsum.photos/seed/windy/300/300', duration: 303 },
    { id: 'mock-7', title: '光年之外', artist: '邓紫棋', cover: 'https://picsum.photos/seed/lightyear/300/300', duration: 239 },
    { id: 'mock-8', title: '泡沫', artist: '邓紫棋', cover: 'https://picsum.photos/seed/bubble/300/300', duration: 258 },
    { id: 'mock-9', title: '孤勇者', artist: '陈奕迅', cover: 'https://picsum.photos/seed/lonely/300/300', duration: 271 },
    { id: 'mock-10', title: '十年', artist: '陈奕迅', cover: 'https://picsum.photos/seed/decade/300/300', duration: 237 },
    { id: 'mock-11', title: 'Shape of You', artist: 'Ed Sheeran', cover: 'https://picsum.photos/seed/shape/300/300', duration: 234 },
    { id: 'mock-12', title: 'Blinding Lights', artist: 'The Weeknd', cover: 'https://picsum.photos/seed/blinding/300/300', duration: 203 },
    { id: 'mock-13', title: 'Bohemian Rhapsody', artist: 'Queen', cover: 'https://picsum.photos/seed/queen/300/300', duration: 355 },
    { id: 'mock-14', title: 'Hotel California', artist: 'Eagles', cover: 'https://picsum.photos/seed/hotel/300/300', duration: 391 },
    { id: 'mock-15', title: 'Yesterday', artist: 'The Beatles', cover: 'https://picsum.photos/seed/yesterday/300/300', duration: 125 },
    { id: 'mock-16', title: 'Stairway to Heaven', artist: 'Led Zeppelin', cover: 'https://picsum.photos/seed/stairway/300/300', duration: 482 },
    { id: 'mock-17', title: 'Billie Jean', artist: 'Michael Jackson', cover: 'https://picsum.photos/seed/billie/300/300', duration: 294 },
    { id: 'mock-18', title: 'Smells Like Teen Spirit', artist: 'Nirvana', cover: 'https://picsum.photos/seed/teen/300/300', duration: 301 },
    { id: 'mock-19', title: '加州旅馆', artist: 'Eagles', cover: 'https://picsum.photos/seed/california/300/300', duration: 391 },
    { id: 'mock-20', title: '光辉岁月', artist: 'Beyond', cover: 'https://picsum.photos/seed/glory/300/300', duration: 296 },
  ]

  if (!query || query === 'popular music 2024' || query === 'recommended music') {
    return shuffleArray(mockTracks).slice(0, 10)
  }

  const filtered = mockTracks.filter(t =>
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    t.artist.toLowerCase().includes(query.toLowerCase())
  )

  // 如果 DeepSeek 增强后的关键词在 mock 数据中匹配不到，返回随机推荐
  if (filtered.length === 0) {
    return shuffleArray(mockTracks).slice(0, 10)
  }

  return filtered.slice(0, 10)
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
