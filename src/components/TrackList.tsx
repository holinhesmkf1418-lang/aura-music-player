'use client'

import { useState } from 'react'
import { Track } from '@/lib/types'
import { formatDuration } from '@/lib/music-service'
import { setTrackLiked } from '@/lib/liked-tracks'
import { usePlayerStore } from '@/store/player-store'
import { FiPlay, FiPlus, FiHeart } from 'react-icons/fi'

interface TrackListProps {
  tracks: Track[]
  loading?: boolean
  onAddToPlaylist?: (track: Track) => void
  showIndex?: boolean
}

export function TrackList({ tracks, loading, onAddToPlaylist, showIndex = true }: TrackListProps) {
  const { currentTrack, isPlaying, play, pause } = usePlayerStore()
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

  const toggleLike = async (track: Track) => {
    const nextLiked = !likedIds.has(track.id)
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (nextLiked) {
        next.add(track.id)
      } else {
        next.delete(track.id)
      }
      return next
    })

    try {
      await setTrackLiked(track, nextLiked)
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (nextLiked) {
          next.delete(track.id)
        } else {
          next.add(track.id)
        }
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg animate-pulse">
            <div className="aura-glass-card w-10 h-10 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-[var(--bg-hover)]" />
              <div className="h-2.5 w-20 rounded bg-[var(--bg-hover)]" />
            </div>
            <div className="h-3 w-8 rounded bg-[var(--bg-hover)]" />
          </div>
        ))}
      </div>
    )
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">🎵</div>
        <p className="text-[var(--text-secondary)]">暂无歌曲</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {tracks.map((track, index) => {
        const isCurrentTrack = currentTrack?.id === track.id
        return (
          <div
            key={track.id}
            className={`group flex items-center gap-3 p-2 rounded-[6px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)] ${
              isCurrentTrack ? 'bg-[var(--bg-hover)]' : ''
            }`}
            onClick={() => {
              if (isCurrentTrack && isPlaying) {
                pause()
              } else {
                play(track, tracks)
              }
            }}
          >
            {/* Index / Play button */}
            <div className="w-8 text-center shrink-0">
              {isCurrentTrack && isPlaying ? (
                <div className="playing-bars justify-center">
                  <span /><span /><span />
                </div>
              ) : (
                <>
                  <span className="text-sm text-[var(--text-tertiary)] group-hover:hidden">
                    {showIndex ? index + 1 : ''}
                  </span>
                  <FiPlay className="w-4 h-4 text-white hidden group-hover:block mx-auto" />
                </>
              )}
            </div>

            {/* Cover */}
            <img
              src={track.cover}
              alt={track.title}
              className="w-10 h-10 rounded object-cover shrink-0"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className={`text-sm truncate ${isCurrentTrack ? 'text-[var(--neon-cyan)]' : 'text-white'}`}>
                {track.title}
              </p>
              <p className="text-xs text-[var(--text-secondary)] truncate">{track.artist}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onAddToPlaylist && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToPlaylist(track) }}
                  className="p-1.5 rounded-full text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-colors"
                  title="添加到歌单"
                >
                  <FiPlus className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); toggleLike(track) }}
                className={`p-1.5 rounded-full transition-colors hover:bg-[var(--bg-hover)] ${
                  likedIds.has(track.id)
                    ? 'text-[var(--neon-red)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--neon-red)]'
                }`}
                title={likedIds.has(track.id) ? '取消喜欢' : '喜欢'}
              >
                <FiHeart className={likedIds.has(track.id) ? 'w-3.5 h-3.5 fill-current' : 'w-3.5 h-3.5'} />
              </button>
            </div>

            {/* Duration */}
            <span className="text-xs text-[var(--text-tertiary)] w-10 text-right tabular-nums">
              {formatDuration(track.duration)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
