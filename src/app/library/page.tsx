'use client'

import { useState, useEffect } from 'react'
import { Playlist, Track } from '@/lib/types'
import { useAuthStore } from '@/store/auth-store'
import { usePlayerStore } from '@/store/player-store'
import { PlaylistCard } from '@/components/PlaylistCard'
import { TrackList } from '@/components/TrackList'
import { Equalizer } from '@/components/Equalizer'
import { LyricsDisplay } from '@/components/LyricsDisplay'
import Link from 'next/link'
import { FiPlus, FiHeart, FiClock, FiMusic } from 'react-icons/fi'

export default function LibraryPage() {
  const { user } = useAuthStore()
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [history, setHistory] = useState<Track[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [loading, setLoading] = useState(true)
  const { showEqualizer, showLyrics } = usePlayerStore()

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const [plRes, histRes] = await Promise.all([
          fetch('/api/playlist'),
          fetch('/api/user/history'),
        ])

        if (plRes.ok) {
          const data = await plRes.json()
          setPlaylists(data.playlists || [])
        }

        if (histRes.ok) {
          const data = await histRes.json()
          const histTracks = (data.history || []).map((h: any) => ({
            id: h.trackId,
            title: h.trackTitle,
            artist: h.trackArtist,
            cover: h.trackCover,
            duration: 0,
          }))
          setHistory(histTracks)
        }
      } catch (error) {
        console.error('Failed to fetch library:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  const createPlaylist = async () => {
    if (!newPlaylistName.trim()) return
    try {
      const res = await fetch('/api/playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlaylistName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setPlaylists(prev => [data.playlist, ...prev])
        setNewPlaylistName('')
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Create playlist failed:', error)
    }
  }

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">🎵</div>
          <h2 className="text-lg font-medium text-white mb-2">登录以查看你的音乐库</h2>
          <p className="text-sm text-[#a0a0b8] mb-4">登录后可以创建歌单、收藏歌曲</p>
          <Link
            href="/login"
            className="inline-flex px-5 py-2.5 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors"
          >
            去登录
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">我的音乐</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors"
        >
          <FiPlus className="w-4 h-4" />
          新建歌单
        </button>
      </div>

      {/* Playlists grid */}
      <section>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
          <FiMusic className="w-4 h-4 text-[#8b5cf6]" />
          我的歌单
        </h2>
        {loading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-[#1e1e35] rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-square bg-[#252540]" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-20 rounded bg-[#252540]" />
                  <div className="h-2.5 w-12 rounded bg-[#252540]" />
                </div>
              </div>
            ))}
          </div>
        ) : playlists.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <PlaylistCard key={playlist.id} playlist={playlist} />
            ))}
          </div>
        ) : (
          <div className="bg-[#1e1e35] rounded-xl p-8 text-center border border-[#2d2d4a]">
            <p className="text-[#a0a0b8] text-sm">还没有歌单，点击上方按钮创建一个</p>
          </div>
        )}
      </section>

      {/* Recent listens */}
      {history.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
            <FiClock className="w-4 h-4 text-[#8b5cf6]" />
            最近播放
          </h2>
          <TrackList tracks={history} showIndex={false} />
        </section>
      )}

      {/* Create playlist modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-[#1a1a2e] border border-[#2d2d4a] rounded-xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-medium text-white mb-4">新建歌单</h3>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createPlaylist()}
              placeholder="输入歌单名称"
              className="w-full bg-[#252540] text-white px-3 py-2.5 rounded-lg border border-[#2d2d4a] focus:outline-none focus:border-[#8b5cf6] text-sm mb-4 placeholder:text-[#6b6b85]"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-[#a0a0b8] hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={createPlaylist}
                className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}

      {showEqualizer && <Equalizer />}
      {showLyrics && <LyricsDisplay />}
    </div>
  )
}
