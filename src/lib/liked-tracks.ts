import type { Track } from '@/lib/types'

export async function setTrackLiked(track: Track, liked: boolean) {
  const payload = liked
    ? {
        trackId: track.id,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackCover: track.cover,
        trackDuration: track.duration,
      }
    : { trackId: track.id }

  const response = await fetch('/api/music/like', {
    method: liked ? 'POST' : 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(typeof data?.error === 'string' ? data.error : '收藏失败')
  }

  return response.json()
}
