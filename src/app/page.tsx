'use client'

import { useState, useEffect } from 'react'
import { Track } from '@/lib/types'
import { usePlayerStore } from '@/store/player-store'
import { useAuthStore } from '@/store/auth-store'
import { Header } from '@/components/Header'
import { NowPlayingPanel } from '@/components/NowPlayingPanel'
import { PlaylistTable } from '@/components/PlaylistTable'
import { AgentChatPanel } from '@/components/AgentChatPanel'
import { SystemMonitor } from '@/components/SystemMonitor'
import { PlayerBar as MiniPlayer } from '@/components/PlayerBar'
import { Equalizer } from '@/components/Equalizer'
import { LyricsDisplay } from '@/components/LyricsDisplay'

export default function HomePage() {
  const [recommendedTracks, setRecommendedTracks] = useState<Track[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const { showEqualizer, showLyrics, searchedTracks, currentTrack } = usePlayerStore()

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const recRes = await fetch('/api/recommendations')
        if (recRes.ok) {
          const recData = await recRes.json()
          setRecommendedTracks(recData.tracks || [])
        }
      } catch (error) {
        console.error('Failed to fetch home data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [user])

  const displayTracks = searchedTracks.length > 0 ? searchedTracks : recommendedTracks

  return (
    <div className="aura-shell h-full flex flex-col overflow-hidden bg-[var(--bg-deep)] p-2 text-[var(--text-primary)]">
      <div className="cyber-scanline" />
      <div className="cyber-vignette" />
      <div className="aura-side-rail aura-side-rail-left" />
      <div className="aura-side-rail aura-side-rail-right" />
      <Header />

      <div className="relative z-10 flex-1 grid grid-cols-[minmax(620px,1.55fr)_minmax(340px,0.7fr)_140px] gap-2 min-h-0 mt-2">
        <div className="grid grid-rows-[minmax(0,1.76fr)_minmax(230px,0.92fr)] gap-2 min-w-0 min-h-0">
          <section className="hud-frame min-h-0 overflow-hidden">
            <NowPlayingPanel />
          </section>
          <section className="hud-frame min-h-0 overflow-hidden">
            <PlaylistTable tracks={displayTracks} loading={loading} />
          </section>
        </div>

        <section className="hud-frame min-w-0 min-h-0 overflow-hidden">
          <AgentChatPanel />
        </section>

        <aside className="hud-frame min-w-0 min-h-0 overflow-hidden">
          <SystemMonitor />
        </aside>
      </div>

      <div className="relative z-10 grid grid-cols-[minmax(480px,0.43fr)_1fr] gap-2 h-[62px] mt-2 shrink-0">
        <MiniPlayer />
        <div className="hud-frame flex items-center px-4 overflow-hidden">
          <div className="w-full">
            <div className="flex items-center gap-2 text-[10px] tracking-[0.16em] text-[var(--text-secondary)]">
              <span className="text-[var(--neon-cyan)]">&gt;</span>
              <span>SYSTEM_STATUS</span>
            </div>
            <div className="mt-1.5 flex items-center gap-5">
              <div className="flex items-center gap-2 text-[10px] tracking-[0.14em] text-[var(--neon-cyan)]">
                <span className="h-1.5 w-1.5 bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
                <span>ALL SYSTEMS OPERATIONAL</span>
              </div>
              <div className="aura-eq-strip flex-1" aria-hidden="true">
                {Array.from({ length: 96 }).map((_, i) => (
                  <span key={i} style={{ height: `${12 + ((i * 13) % 36)}%` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {currentTrack && <div className="sr-only">{currentTrack.title}</div>}
      {showEqualizer && <Equalizer />}
      {showLyrics && <LyricsDisplay />}
    </div>
  )
}
