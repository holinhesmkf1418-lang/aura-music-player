/**
 * Chinese Music API 服务
 * 使用 @meting/core 对接网易云音乐、QQ音乐、酷狗等国内音乐平台
 * 提供歌曲搜索和获取真实播放链接
 */
import Meting from '@meting/core'
import { Track } from './types'

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
      return []
    }

    // 确保搜索结果是一个数组
    const searchResults: MetingTrack[] = Array.isArray(parsed) ? parsed : []

    if (searchResults.length === 0) {
      return []
    }

    // 第二步：并行获取最多前 10 首的播放链接和封面
    const topResults = searchResults.slice(0, 10)
    const urlResults = await Promise.allSettled(
      topResults.map((t) => m.url(t.url_id || t.id, 128)),
    )

    // 并行获取封面
    const coverResults = await Promise.allSettled(
      topResults.map((t) => {
        if (platform === 'netease') {
          return getNeteaseCover(m, t.pic_id || t.id)
        }
        return Promise.resolve(getTencentCover(t.pic_id))
      }),
    )

    // 只返回有可播放链接的歌曲
    const tracks = topResults
      .map((item, i) => {
        let audioUrl = ''
        if (urlResults[i].status === 'fulfilled') {
          try {
            const urlData: MetingUrlResult = JSON.parse(urlResults[i].value)
            audioUrl = urlData.url || ''
          } catch {
            // URL 解析失败
          }
        }

        // 没有可播放链接则排除
        if (!audioUrl) return null

        let cover = ''
        if (coverResults[i].status === 'fulfilled') {
          cover = coverResults[i].value
        }

        return {
          id: `${platform}:${item.id}`,
          title: item.name,
          artist: Array.isArray(item.artist) ? item.artist.join(' / ') : String(item.artist || ''),
          album: item.album || '',
          cover: ensureHttps(cover),
          duration: 0,
          audioUrl: ensureHttps(audioUrl),
        } as Track
      })
      .filter((t): t is Track => t !== null)

    return tracks
  } catch (error) {
    console.error(`[${platform}] searchMusic error:`, error)
    return []
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
