'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Playlist, Track } from '@/lib/types'
import { usePlayerStore } from '@/store/player-store'
import { useAuthStore } from '@/store/auth-store'
import { TrackList } from '@/components/TrackList'
import { Equalizer } from '@/components/Equalizer'
import { LyricsDisplay } from '@/components/LyricsDisplay'
import { FiPlay, FiTrash2, FiArrowLeft, FiMusic } from 'react-icons/fi'

export default function PlaylistDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<Playlist | null>(null)
  const [loading, setLoading] = useState(true)
  const { play } = usePlayerStore()
  const { user } = useAuthStore()
  const { showEqualizer, showLyrics } = usePlayerStore()

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const res = await fetch(`/api/playlist/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setPlaylist(data.playlist)
        }
      } catch (error) {
        console.error('Failed to fetch playlist:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlaylist()
  }, [params.id])

  const playAll = () => {
    if (!playlist?.tracks?.length) return
    const tracks: Track[] = playlist.tracks.map((t) => ({
      id: t.trackId,
      title: t.trackTitle,
      artist: t.trackArtist,
      cover: t.trackCover,
      duration: t.trackDuration,
    }))
    play(tracks[0], tracks)
  }

  if (loading) {
    return (
      <div className="p-6 animate-pulse space-y-4">
        <div className="flex items-center gap-6">
          <div className="w-48 h-48 rounded-xl bg-[#252540]" />
          <div className="space-y-3">
            <div className="h-8 w-40 rounded bg-[#252540]" />
            <div className="h-4 w-24 rounded bg-[#252540]" />
            <div className="h-4 w-32 rounded bg-[#252540]" />
          </div>
        </div>
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="p-6 text-center py-20">
        <div className="text-5xl mb-4">😢</div>
        <h2 className="text-lg font-medium text-white mb-2">歌单不存在</h2>
        <button
          onClick={() => router.back()}
          className="text-sm text-[#8b5cf6] hover:text-[#7c3aed]"
        >
          返回
        </button>
      </div>
    )
  }

  const tracks: Track[] = playlist.tracks.map((t) => ({
    id: t.trackId,
    title: t.trackTitle,
    artist: t.trackArtist,
    cover: t.trackCover,
    duration: t.trackDuration,
  }))

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-[#a0a0b8] hover:text-white transition-colors mb-2"
      >
        <FiArrowLeft className="w-4 h-4" />
        返回
      </button>

      {/* Header */}
      <div className="flex items-end gap-6">
        <div className="w-48 h-48 rounded-xl overflow-hidden shrink-0 shadow-2xl">
          {playlist.tracks?.[0]?.trackCover ? (
            <img
              src={playlist.tracks[0].trackCover}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#252540] to-[#1a1a2e] flex items-center justify-center">
              <FiMusic className="w-16 h-16 text-[#6b6b85]" />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-[#a0a0b8] uppercase tracking-wider mb-1">歌单</p>
          <h1 className="text-3xl font-bold text-white mb-2">{playlist.name}</h1>
          <p className="text-sm text-[#a0a0b8] mb-4">
            {playlist.tracks.length} 首歌曲
          </p>
          <button
            onClick={playAll}
            disabled={tracks.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
          >
            <FiPlay className="w-4 h-4" />
            播放全部
          </button>
        </div>
      </div>

      {/* Tracks */}
      <TrackList tracks={tracks} />

      {showEqualizer && <Equalizer />}
      {showLyrics && <LyricsDisplay />}
    </div>
  )
}
