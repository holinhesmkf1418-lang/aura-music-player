'use client'

import { usePlayerStore } from '@/store/player-store'
import { useLyrics } from '@/hooks/useLyrics'
import { FiX } from 'react-icons/fi'

const SKELETON_WIDTHS = [78, 64, 86, 70, 82, 58]

export function LyricsDisplay() {
  const { currentTrack, toggleLyrics } = usePlayerStore()
  const { lyrics, loading } = useLyrics(currentTrack?.id, currentTrack?.title, currentTrack?.artist)

  return (
    <div className="aura-glass-card fixed bottom-24 right-4 z-50 w-80 max-h-96 p-4 shadow-2xl animate-slide-up overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white">歌词</h3>
        <button
          onClick={toggleLyrics}
          className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto max-h-80 scroll-smooth">
        {loading ? (
          <div className="space-y-3 py-4">
            {SKELETON_WIDTHS.map((width, i) => (
              <div key={i} className="h-3 rounded bg-[var(--bg-hover)] animate-pulse" style={{ width: `${width}%` }} />
            ))}
          </div>
        ) : lyrics ? (
          <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
            {lyrics}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">🎤</div>
            <p className="text-sm text-[var(--text-tertiary)]">暂无歌词</p>
          </div>
        )}
      </div>
    </div>
  )
}
