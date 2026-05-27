import { searchTracks } from '@/lib/music-service'
import { normalizeArtistForMatch } from '@/lib/artist-alias'
import type { Track } from '@/lib/types'
import type { SearchExecutionResult, SearchPlan } from './types'

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

function normalizeText(text: string): string {
  return normalizeArtistForMatch(text)
}

function splitArtists(artist: string): string[] {
  return artist
    .split(/\s*(?:\/|、|,|，|&|＆|\+| feat\.? | ft\.? )\s*/i)
    .map(normalizeText)
    .filter(Boolean)
}

function isLowQualityArtistResult(track: Track): boolean {
  return /(live|cover|remix|伴奏|钢琴|piano|mv版|dj|串烧|背景音乐|beat|翻唱|原唱)/i.test(
    `${track.title} ${track.album || ''}`,
  )
}

function artistMatchScore(track: Track, artists?: string[]): number {
  if (!artists || artists.length === 0) return 0

  const requested = artists.map(normalizeText).filter(Boolean)
  const artistText = normalizeText(track.artist || '')
  const artistParts = splitArtists(track.artist || '')
  const title = normalizeText(track.title || '')
  let score = 0

  for (const name of requested) {
    if (artistText.includes(name)) score += 20
    if (artistParts.some((part) => part === name || part.includes(name))) score += 30
    if (artistParts[0]?.includes(name)) score += 35
    if (artistParts.length === 1 && artistParts[0]?.includes(name)) score += 25
    if (title.includes(name)) score -= 10
  }

  if (isLowQualityArtistResult(track)) score -= 45
  if (artistParts.length > 2) score -= 10

  return score
}

function filterByRequestedArtist(
  tracks: Track[],
  artists?: string[],
): Track[] {
  if (!artists || artists.length === 0) return tracks

  const requested = artists.map(normalizeText).filter(Boolean)
  if (requested.length === 0) return tracks

  return tracks.filter((track) => {
    const artist = normalizeText(track.artist || '')
    if (!artist) return false
    return requested.some((name) => artist.includes(name) || name.includes(artist))
  })
}

function orderArtistMatches(tracks: Track[], artists?: string[]): Track[] {
  if (!artists || artists.length === 0) return tracks

  return [...tracks].sort((a, b) => artistMatchScore(b, artists) - artistMatchScore(a, artists))
}

function cleanArtistResultCount(tracks: Track[], artists?: string[]): number {
  if (!artists || artists.length === 0) return tracks.length
  return tracks.filter((track) => artistMatchScore(track, artists) >= 80).length
}

function finalizeTracks(
  tracks: Track[],
  plan: SearchPlan,
): Track[] {
  const artistFiltered = filterByRequestedArtist(tracks, plan.rankHints.artists)
  const titleFiltered = filterByTitleExclude(artistFiltered, plan.titleExclude)
  const ordered = orderArtistMatches(titleFiltered, plan.rankHints.artists)
  const cleanArtistTracks = ordered.filter((track) => artistMatchScore(track, plan.rankHints.artists) >= 80)

  if (plan.rankHints.artists?.length && cleanArtistTracks.length >= 5) {
    return cleanArtistTracks
  }

  return ordered
}

function formatSearchError(query: string, error: unknown): string {
  if (error instanceof Error && error.message) {
    return `query "${query}": ${error.message}`
  }
  return `query "${query}": SEARCH_UNKNOWN`
}

function collectTracks(
  tracks: Track[],
  allTracks: Track[],
  seenIds: Set<string>,
  excludeSet: Set<string>,
) {
  for (const track of tracks) {
    if (!track.audioUrl) continue
    if (!seenIds.has(track.id) && !excludeSet.has(track.id)) {
      seenIds.add(track.id)
      allTracks.push(track)
    }
  }
}

/**
 * 执行搜索计划
 *
 * 职责：
 * - 遍历 plan.queries 调 searchTracks
 * - 合并结果、去重
 * - 排除 plan.excludeTrackIds
 * - 按 plan.titleExclude 过滤歌名
 * - 结果不足时用 plan.fallbackQueries 重试
 *
 * 不做任何意图判断或 query 生成
 */
export async function searchForPlan(
  plan: SearchPlan,
  neteaseCookie?: string,
): Promise<SearchExecutionResult> {
  const allTracks: Track[] = []
  const errors: string[] = []
  const seenIds = new Set<string>()
  const excludeSet = new Set(plan.excludeTrackIds || [])
  const allQueries = [...plan.queries]
  const maxTracks = plan.maxTracks || 10

  // 执行主查询
  for (const query of allQueries) {
    try {
      const result = await searchTracks({
        query,
        maxResults: 10,
        useDeepSeek: false,
        neteaseCookie,
        artist: plan.rankHints.artists?.[0],
      })

      if (result.errors?.length) {
        errors.push(...result.errors.map((message) => `query "${query}": ${message}`))
      }
      collectTracks(result.tracks, allTracks, seenIds, excludeSet)
    } catch (error) {
      errors.push(formatSearchError(query, error))
    }
  }

  let finalTracks = finalizeTracks(allTracks, plan).slice(0, maxTracks)
  const needsArtistFallback =
    Boolean(plan.rankHints.artists?.length) &&
    cleanArtistResultCount(finalTracks, plan.rankHints.artists) < Math.min(5, maxTracks)

  // 结果不足：执行 fallback 查询
  if ((finalTracks.length < 5 || needsArtistFallback) && plan.fallbackQueries.length > 0) {
    for (const query of plan.fallbackQueries) {
      if (allQueries.includes(query)) continue
      try {
        const result = await searchTracks({
          query,
          maxResults: 10,
          useDeepSeek: false,
          neteaseCookie,
          artist: plan.rankHints.artists?.[0],
        })
        if (result.errors?.length) {
          errors.push(...result.errors.map((message) => `query "${query}": ${message}`))
        }
        collectTracks(result.tracks, allTracks, seenIds, excludeSet)
        finalTracks = finalizeTracks(allTracks, plan).slice(0, maxTracks)
        const enoughCleanArtistTracks =
          cleanArtistResultCount(finalTracks, plan.rankHints.artists) >= Math.min(5, maxTracks)
        if (finalTracks.length >= 5 && (!plan.rankHints.artists?.length || enoughCleanArtistTracks)) break
      } catch (error) {
        errors.push(formatSearchError(query, error))
      }
    }
  }

  return { tracks: finalTracks, errors }
}
