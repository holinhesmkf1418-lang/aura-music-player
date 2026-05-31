'use client'

import Link from 'next/link'
import { Playlist } from '@/lib/types'
import { FiPlay, FiMusic } from 'react-icons/fi'

interface PlaylistCardProps {
  playlist: Playlist
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  const trackCount = playlist.tracks?.length || 0
  const coverUrl = playlist.coverUrl || playlist.tracks?.[0]?.trackCover

  return (
    <Link
      href={`/playlist/${playlist.id}`}
      className="aura-glass-card group block overflow-hidden transition-all hover:border-[var(--border-active)] hover:shadow-[var(--glow-cyan)]"
    >
      <div className="aspect-square relative overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[var(--bg-panel)] flex items-center justify-center">
            <FiMusic className="w-12 h-12 text-[var(--text-tertiary)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[var(--neon-cyan)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg">
            <FiPlay className="w-5 h-5 text-[var(--bg-deep)] ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-white truncate">{playlist.name}</h3>
        <p className="text-xs text-[var(--text-tertiary)] mt-1">{trackCount} 首歌曲</p>
      </div>
    </Link>
  )
}
