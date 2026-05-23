'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Track } from '@/lib/types'
import { SearchBar } from '@/components/SearchBar'
import { TrackList } from '@/components/TrackList'
import { Equalizer } from '@/components/Equalizer'
import { LyricsDisplay } from '@/components/LyricsDisplay'
import { usePlayerStore } from '@/store/player-store'
import { GENRE_TAGS } from '@/lib/types'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const query = searchParams.get('q') || ''
  const genre = searchParams.get('genre') || ''
  const [tracks, setTracks] = useState<Track[]>([])
  const [explanation, setExplanation] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { showEqualizer, showLyrics } = usePlayerStore()

  useEffect(() => {
    if (!query && !genre) return

    const fetchTracks = async () => {
      setLoading(true)
      setExplanation('')
      try {
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        if (genre) params.set('genre', genre)

        const res = await fetch(`/api/music/search?${params}`)
        if (res.ok) {
          const data = await res.json()
          setTracks(data.tracks || [])
          setExplanation(data.explanation || '')
        }
      } catch (error) {
        console.error('Search failed:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTracks()
  }, [query, genre])

  const handleGenreClick = (genreId: string) => {
    router.push(`/search?genre=${genreId}`)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          {genre ? `#${GENRE_TAGS.find(g => g.id === genre)?.label || genre}` : query ? `搜索: ${query}` : '发现音乐'}
        </h1>
        <SearchBar />
      </div>

      {/* Genre tags */}
      {!query && !genre && (
        <div>
          <h2 className="text-sm font-medium text-[#a0a0b8] mb-3">按风格浏览</h2>
          <div className="flex flex-wrap gap-2">
            {GENRE_TAGS.map((g) => (
              <button
                key={g.id}
                onClick={() => handleGenreClick(g.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e35] border border-[#2d2d4a] rounded-full text-sm text-[#a0a0b8] hover:border-[#8b5cf6] hover:text-white transition-all"
              >
                <span>{g.emoji}</span>
                <span>{g.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {(query || genre) && (
        <div>
          <p className="text-sm text-[#6b6b85] mb-3">
            {loading ? '搜索中...' : `找到 ${tracks.length} 首歌曲`}
          </p>

          {/* DeepSeek 智能搜索解释 */}
          {explanation && !loading && (
            <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
              <span className="text-xs text-[#8b5cf6] font-medium shrink-0">DeepSeek</span>
              <span className="text-xs text-[#a0a0b8]">{explanation}</span>
            </div>
          )}

          <TrackList tracks={tracks} loading={loading} />
        </div>
      )}

      {/* Empty state */}
      {!query && !genre && tracks.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🎵</div>
          <h2 className="text-lg font-medium text-white mb-2">探索音乐世界</h2>
          <p className="text-sm text-[#a0a0b8]">选择风格浏览，或使用搜索框搜索歌曲</p>
        </div>
      )}

      {showEqualizer && <Equalizer />}
      {showLyrics && <LyricsDisplay />}
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-32 rounded bg-[#252540]" />
            <div className="h-10 rounded-xl bg-[#252540]" />
          </div>
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}
