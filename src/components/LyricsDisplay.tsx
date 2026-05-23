'use client'

import { useState, useEffect } from 'react'
import { usePlayerStore } from '@/store/player-store'
import { FiX } from 'react-icons/fi'

export function LyricsDisplay() {
  const { currentTrack, toggleLyrics } = usePlayerStore()
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!currentTrack) return

    setLoading(true)
    setLyrics(null)

    const fetchLyrics = async () => {
      try {
        const res = await fetch(
          `/api/music/lyrics?trackId=${encodeURIComponent(currentTrack.id)}&title=${encodeURIComponent(currentTrack.title)}&artist=${encodeURIComponent(currentTrack.artist)}`
        )
        const data = await res.json()
        setLyrics(data.lyrics)
      } catch {
        setLyrics(null)
      } finally {
        setLoading(false)
      }
    }

    fetchLyrics()
  }, [currentTrack])

  return (
    <div className="fixed bottom-24 right-4 w-80 max-h-96 bg-[#1a1a2e] border border-[#2d2d4a] rounded-xl p-4 shadow-2xl z-50 animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">歌词</h3>
        <button
          onClick={toggleLyrics}
          className="p-1 rounded-full text-[#a0a0b8] hover:text-white transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-80 scroll-smooth">
        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-3 rounded bg-[#252540] animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        ) : lyrics ? (
          <div className="text-sm text-[#a0a0b8] leading-relaxed whitespace-pre-wrap">
            {lyrics}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🎤</div>
            <p className="text-sm text-[#6b6b85]">暂无歌词</p>
          </div>
        )}
      </div>
    </div>
  )
}
