'use client'

import { Track } from '@/lib/types'
import { formatDuration } from '@/lib/music-service'
import { usePlayerStore } from '@/store/player-store'
import { FiMusic } from 'react-icons/fi'

interface SongListTextProps {
  tracks: Track[]
  loading?: boolean
}

export function SongListText({ tracks, loading }: SongListTextProps) {
  const { currentTrack, isPlaying, play, pause } = usePlayerStore()

  if (loading) {
    return (
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 mb-3 px-3">
          <span className="text-[10px] font-mono text-[var(--neon-cyan)] tracking-widest uppercase opacity-60">
            Loading...
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-neon-pulse" />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
            <div className="w-6 h-3 rounded bg-[rgba(0,240,255,0.05)]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 rounded bg-[rgba(0,240,255,0.05)]" style={{ width: `${50 + Math.random() * 30}%` }} />
              <div className="h-2 rounded bg-[rgba(0,240,255,0.03)]" style={{ width: `${30 + Math.random() * 20}%` }} />
            </div>
            <div className="w-8 h-3 rounded bg-[rgba(0,240,255,0.05)]" />
          </div>
        ))}
      </div>
    )
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FiMusic className="w-6 h-6 mb-2 text-[var(--text-tertiary)] opacity-30" />
        <p className="text-xs font-mono text-[var(--text-tertiary)] tracking-wider">
          [ EMPTY — USE THE AI AGENT TO FIND MUSIC ]
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Terminal-style header */}
      <div className="flex items-center gap-2 mb-2 px-3 pb-2 border-b border-[rgba(0,240,255,0.06)]">
        <span className="text-[10px] font-mono text-[var(--neon-cyan)] tracking-widest uppercase">
          Playlist
        </span>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
          ({tracks.length} tracks)
        </span>
      </div>

      <div className="space-y-0">
        {tracks.map((track, index) => {
          const isCurrent = currentTrack?.id === track.id

          return (
            <div
              key={track.id}
              className={`group flex items-center gap-3 px-3 py-2 cursor-pointer transition-all
                ${isCurrent
                  ? 'bg-[rgba(0,240,255,0.04)] border-l border-[var(--neon-cyan)]'
                  : 'border-l border-transparent hover:border-l border-[rgba(0,240,255,0.15)] hover:bg-[rgba(0,240,255,0.02)]'
                }`}
              onClick={() => {
                if (isCurrent && isPlaying) {
                  pause()
                } else {
                  play(track, tracks)
                }
              }}
            >
              {/* Index - hex style */}
              <div className="w-12 shrink-0">
                {isCurrent && isPlaying ? (
                  <span className="inline-flex items-center gap-0.5">
                    <span className="w-1 h-3 bg-[var(--neon-cyan)]" />
                    <span className="w-0.5 h-2 bg-[var(--neon-cyan)] opacity-70" />
                    <span className="w-1 h-3 bg-[var(--neon-cyan)]" />
                  </span>
                ) : (
                  <span className={`text-[11px] font-mono ${isCurrent ? 'text-[var(--neon-cyan)]' : 'text-[var(--text-tertiary)]'}`}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                )}
              </div>

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[13px] font-mono truncate
                    ${isCurrent ? 'text-[var(--neon-cyan)]' : 'text-[var(--text-primary)] group-hover:text-white'}`}
                >
                  {isCurrent && <span className="text-[var(--neon-green)] mr-1 text-[11px]">&gt;</span>}
                  {track.title}
                </p>
                <p className="text-[11px] font-mono text-[var(--text-secondary)] truncate opacity-70 group-hover:opacity-100">
                  {track.artist}
                </p>
              </div>

              {/* Duration */}
              <span className="text-[11px] font-mono text-[var(--text-tertiary)] shrink-0">
                {formatDuration(track.duration)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
