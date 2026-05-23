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
      className="group block bg-[#1e1e35] rounded-xl overflow-hidden border border-[#2d2d4a] hover:border-[#8b5cf6]/50 transition-all hover:shadow-lg hover:shadow-[#8b5cf6]/10"
    >
      <div className="aspect-square relative overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={playlist.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#252540] to-[#1a1a2e] flex items-center justify-center">
            <FiMusic className="w-12 h-12 text-[#6b6b85]" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-[#8b5cf6] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-lg">
            <FiPlay className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-white truncate">{playlist.name}</h3>
        <p className="text-xs text-[#6b6b85] mt-1">{trackCount} 首歌曲</p>
      </div>
    </Link>
  )
}
