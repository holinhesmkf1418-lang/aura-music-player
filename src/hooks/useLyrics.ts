'use client'

import { useEffect, useState } from 'react'

interface LyricsState {
  trackId: string
  lyrics: string | null
  loading: boolean
}

export function useLyrics(trackId?: string, title?: string, artist?: string) {
  const [state, setState] = useState<LyricsState>({
    trackId: '',
    lyrics: null,
    loading: false,
  })

  useEffect(() => {
    if (!trackId) {
      setState({ trackId: '', lyrics: null, loading: false })
      return
    }

    const controller = new AbortController()
    const activeTrackId = trackId

    setState((prev) => ({
      trackId: activeTrackId,
      lyrics: prev.trackId === activeTrackId ? prev.lyrics : null,
      loading: true,
    }))

    fetch(
      `/api/music/lyrics?trackId=${encodeURIComponent(trackId)}&title=${encodeURIComponent(title || '')}&artist=${encodeURIComponent(artist || '')}`,
      { signal: controller.signal },
    )
      .then((res) => res.json())
      .then((data) => {
        setState({
          trackId: activeTrackId,
          lyrics: typeof data?.lyrics === 'string' ? data.lyrics : null,
          loading: false,
        })
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState({ trackId: activeTrackId, lyrics: null, loading: false })
        }
      })

    return () => controller.abort()
  }, [trackId, title, artist])

  const isCurrentTrack = Boolean(trackId && state.trackId === trackId)

  return {
    lyrics: isCurrentTrack ? state.lyrics : null,
    loading: Boolean(trackId && (!isCurrentTrack || state.loading)),
  }
}
