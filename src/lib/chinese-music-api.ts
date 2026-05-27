/**
 * Chinese Music API 服务
 * 使用 @meting/core 对接网易云音乐、QQ音乐、酷狗等国内音乐平台
 * 提供歌曲搜索和获取真实播放链接
 */
import Meting from '@meting/core'
import { Track } from './types'
import { artistNameMatches, normalizeArtistAlias } from './artist-alias'

// Meting 支持的平台
export type MusicPlatform = 'netease' | 'tencent' | 'kugou' | 'baidu' | 'kuwo'

// Meting 格式化后的歌曲信息
interface MetingTrack {
  id: string
  name: string
  artist: string[]
  album: string
  pic_id: string
  url_id: string
  lyric_id: string
  source: string
}

// Meting URL 返回结果
interface MetingUrlResult {
  url: string
  size: number
  br: number
}

// Meting 歌词返回结果
interface MetingLyricResult {
  lyric: string
  tlyric: string
}

type MetingArtistCapable = Meting & {
  artist: (id: string, limit: number) => Promise<string>
}

interface NeteaseArtistSearchResult {
  result?: {
    artists?: Array<{
      id: number | string
      name: string
      alias?: string[]
      alia?: string[]
    }>
  }
}

interface NeteaseArtistMatch {
  id: string
  name: string
}

interface NeteaseRawArtistSong {
  id: number | string
  name: string
  dt?: number
  ar?: Array<{ name: string }>
  al?: {
    name?: string
    picUrl?: string
  }
}

interface NeteaseArtistSongsResult {
  hotSongs?: NeteaseRawArtistSong[]
}

/**
 * 创建 Meting 实例并设置平台
 * 注入 VIP 会员 Cookie（优先使用传入的 cookie，其次环境变量），以获取完整歌曲
 */
function createMeting(platform: MusicPlatform = 'netease', cookie?: string): Meting {
  const meting = new Meting()
  meting.site(platform)
  meting.format(true)

  // 优先使用传入的 cookie（用户自填），其次环境变量
  const neteaseCookie = cookie || process.env.NETEASE_COOKIE || ''
  if (neteaseCookie && platform === 'netease') {
    ;(meting as unknown as { header: Record<string, string> }).header.Cookie += '; ' + neteaseCookie
  }

  return meting
}

/** 强制使用 HTTPS，避免浏览器的混合内容(Mixed Content)阻止 */
function ensureHttps(url: string): string {
  return url.replace(/^http:\/\//i, 'https://')
}

/**
 * 获取网易云音乐图片 URL
 * 网易云图片需要特殊加密处理，直接用 @meting/core 提供的方法
 */
async function getNeteaseCover(m: Meting, picId: string): Promise<string> {
  try {
    const raw = await m.pic(picId, 300)
    const parsed = JSON.parse(raw)
    return parsed.url || ''
  } catch {
    return ''
  }
}

/**
 * 获取 QQ 音乐图片 URL（直接构造，无需额外请求）
 */
function getTencentCover(picId: string): string {
  return `https://y.gtimg.cn/music/photo_new/T002R300x300M000${picId}.jpg?max_age=2592000`
}

function isCleanArtistSong(item: MetingTrack, artist: string): boolean {
  const artists = Array.isArray(item.artist) ? item.artist : []
  if (!artistNameMatches(artists[0] || '', artist) || artists.length !== 1) return false
  return !/(live|cover|remix|伴奏|钢琴|piano|mv版|dj|串烧|背景音乐|beat|翻唱|原唱)/i.test(
    `${item.name} ${item.album || ''}`,
  )
}

function isCleanNeteaseArtistSong(item: NeteaseRawArtistSong, artist: string): boolean {
  const artists = item.ar || []
  if (!artistNameMatches(artists[0]?.name || '', artist) || artists.length !== 1) return false
  return !/(live|cover|remix|伴奏|钢琴|piano|mv版|dj|串烧|背景音乐|beat|翻唱|原唱)/i.test(
    `${item.name} ${item.al?.name || ''}`,
  )
}

async function hydratePlayableTracks(
  m: Meting,
  platform: MusicPlatform,
  sourceTracks: MetingTrack[],
  minPlayable: number = 5,
): Promise<Track[]> {
  const allTracks: Track[] = []
  const BATCH_SIZE = 10

  for (let batchStart = 0; batchStart < sourceTracks.length && allTracks.length < minPlayable; batchStart += BATCH_SIZE) {
    const batch = sourceTracks.slice(batchStart, batchStart + BATCH_SIZE)
    if (batch.length === 0) break

    const urlResults = await Promise.allSettled(
      batch.map((t) => m.url(t.url_id || t.id, 128)),
    )

    const coverResults = await Promise.allSettled(
      batch.map((t) => {
        if (platform === 'netease') {
          return getNeteaseCover(m, t.pic_id || t.id)
        }
        return Promise.resolve(getTencentCover(t.pic_id))
      }),
    )

    for (let i = 0; i < batch.length; i++) {
      const item = batch[i]

      const urlResult = urlResults[i]
      let audioUrl = ''
      if (urlResult?.status === 'fulfilled') {
        try {
          const urlData: MetingUrlResult = JSON.parse(urlResult.value)
          audioUrl = urlData.url || ''
        } catch {
          // URL 解析失败
        }
      }

      if (!audioUrl) continue

      const coverResult = coverResults[i]
      let cover = ''
      if (coverResult?.status === 'fulfilled') {
        cover = coverResult.value
      }

      allTracks.push({
        id: `${platform}:${item.id}`,
        title: item.name,
        artist: Array.isArray(item.artist) ? item.artist.join(' / ') : String(item.artist || ''),
        album: item.album || '',
        cover: ensureHttps(cover),
        duration: 0,
        audioUrl: ensureHttps(audioUrl),
      } as Track)
    }
  }

  return allTracks
}

function uniqueTracks(tracks: Track[]): Track[] {
  const seen = new Set<string>()
  return tracks.filter((track) => {
    if (seen.has(track.id)) return false
    seen.add(track.id)
    return true
  })
}

async function findNeteaseArtist(m: Meting, artist: string): Promise<NeteaseArtistMatch | null> {
  try {
    const requestedArtist = normalizeArtistAlias(artist)
    m.format(false)
    const raw = await m.search(requestedArtist, { type: 100, limit: 5 } as { limit: number; type: number })
    const data: NeteaseArtistSearchResult = JSON.parse(raw)
    const candidates = data.result?.artists || []
    const exact = candidates.find((item) => artistNameMatches(item.name, requestedArtist))
    const alias = candidates.find((item) => [...(item.alias || []), ...(item.alia || [])].some((name) => artistNameMatches(name, requestedArtist)))
    const matched = exact || alias
    return matched ? { id: String(matched.id), name: matched.name } : null
  } catch {
    return null
  } finally {
    m.format(true)
  }
}

/**
 * 按歌手获取热门歌曲。网易云普通关键词搜索会把合作曲、Live、翻唱排得很靠前，
 * 歌手接口能拿到更稳定的 artist hotSongs，再优先挑主歌手的干净结果。
 */
export async function searchArtistTopTracks(
  artist: string,
  platform: MusicPlatform = 'netease',
  limit: number = 20,
  neteaseCookie?: string,
): Promise<Track[]> {
  const m = createMeting(platform, neteaseCookie)
  const requestedArtist = normalizeArtistAlias(artist)

  try {
    if (platform !== 'netease') {
      return searchMusic(requestedArtist, platform, limit, neteaseCookie)
    }

    const artistMatch = await findNeteaseArtist(m, requestedArtist)
    if (!artistMatch) return []

    m.format(false)
    const raw = await (m as MetingArtistCapable).artist(artistMatch.id, Math.max(limit * 4, 80))
    const data: NeteaseArtistSongsResult = JSON.parse(raw)
    const rawArtistTracks = data.hotSongs || []
    const cleanRawTracks = rawArtistTracks.filter((item) => isCleanNeteaseArtistSong(item, requestedArtist))
    const rawPlayableTracks: Track[] = []

    if (cleanRawTracks.length > 0) {
      const candidates = cleanRawTracks.slice(0, Math.max(limit * 2, 20))
      const urlResults = await Promise.allSettled(
        candidates.map((item) => m.url(String(item.id), 128)),
      )

      for (let index = 0; index < candidates.length; index++) {
        const item = candidates[index]
        let audioUrl = ''
        const urlResult = urlResults[index]
        if (urlResult?.status === 'fulfilled') {
          try {
            const urlData: MetingUrlResult = JSON.parse(urlResult.value)
            audioUrl = urlData.url || ''
          } catch {
            // URL 解析失败
          }
        }

        if (!audioUrl) continue

        rawPlayableTracks.push({
          id: `${platform}:${item.id}`,
          title: item.name,
          artist: item.ar?.map((a) => a.name).join(' / ') || artistMatch.name || requestedArtist,
          album: item.al?.name || '',
          cover: ensureHttps(item.al?.picUrl || ''),
          duration: item.dt ? Math.round(item.dt / 1000) : 0,
          audioUrl: ensureHttps(audioUrl),
        } as Track)
      }

      if (rawPlayableTracks.length >= Math.min(limit, 5)) {
        return rawPlayableTracks.slice(0, limit)
      }
    }

    m.format(true)
    const formattedRaw = await (m as MetingArtistCapable).artist(artistMatch.id, Math.max(limit * 4, 80))
    const parsed: unknown = JSON.parse(formattedRaw)
    const artistTracks: MetingTrack[] = Array.isArray(parsed) ? parsed : []
    if (artistTracks.length === 0) return rawPlayableTracks.slice(0, limit)

    const cleanTracks = artistTracks.filter((item) => isCleanArtistSong(item, requestedArtist))
    const fallbackTracks = artistTracks.filter((item) => {
      const artists = Array.isArray(item.artist) ? item.artist : []
      return artists.some((name) => artistNameMatches(name, requestedArtist)) && !cleanTracks.some((clean) => clean.id === item.id)
    })
    const candidates = [...cleanTracks, ...fallbackTracks]

    const hydratedTracks = await hydratePlayableTracks(m, platform, candidates, Math.min(limit, 10))
    return uniqueTracks([...rawPlayableTracks, ...hydratedTracks]).slice(0, limit)
  } catch (error) {
    console.error(`[${platform}] searchArtistTopTracks error:`, error)
    return []
  }
}

/**
 * 搜索歌曲并获取播放链接
 */
export async function searchMusic(
  query: string,
  platform: MusicPlatform = 'netease',
  limit: number = 20,
  neteaseCookie?: string,
): Promise<Track[]> {
  const m = createMeting(platform, neteaseCookie)

  try {
    // 第一步：搜索
    const searchRaw = await m.search(query, { limit })
    let parsed: unknown
    try {
      parsed = JSON.parse(searchRaw)
    } catch (e) {
      console.error(`[${platform}] Failed to parse search results for "${query}":`, e)
      throw new Error(`SEARCH_PARSE: ${platform} search response for "${query}" is not valid JSON`)
    }

    // 确保搜索结果是一个数组
    const searchResults: MetingTrack[] = Array.isArray(parsed) ? parsed : []

    if (searchResults.length === 0) {
      return []
    }

    return hydratePlayableTracks(m, platform, searchResults, 5)
  } catch (error) {
    console.error(`[${platform}] searchMusic error:`, error)
    if (error instanceof Error && error.message.startsWith('SEARCH_')) {
      throw error
    }
    const message = error instanceof Error ? error.message : 'unknown error'
    throw new Error(`SEARCH_NETWORK: ${platform} search failed for "${query}": ${message}`)
  }
}

/**
 * 获取指定歌曲的播放链接
 * 用于按需获取，避免一次性请求过多
 */
export async function getTrackStreamUrl(
  trackId: string,
  platform: MusicPlatform = 'netease',
  neteaseCookie?: string,
): Promise<string | null> {
  const m = createMeting(platform, neteaseCookie)
  try {
    const raw = await m.url(trackId, 128)
    const data: MetingUrlResult = JSON.parse(raw)
    return data.url || null
  } catch (error) {
    console.error(`getTrackStreamUrl error:`, error)
    return null
  }
}

/**
 * 获取歌词
 */
export async function getTrackLyrics(
  trackId: string,
  platform: MusicPlatform = 'netease',
): Promise<string | null> {
  const m = createMeting(platform)
  try {
    const raw = await m.lyric(trackId)
    const data: MetingLyricResult = JSON.parse(raw)
    return data.lyric || null
  } catch (error) {
    console.error(`getTrackLyrics error:`, error)
    return null
  }
}

/**
 * 返回支持的平台列表
 */
export function getSupportedPlatforms(): string[] {
  return Meting.getSupportedPlatforms()
}
