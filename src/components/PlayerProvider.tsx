'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { PlayerBar } from './PlayerBar'
import { Sidebar } from './Sidebar'
import { Visualizer } from './Visualizer'
import { AudioPlayer } from './AudioPlayer'
import { usePlayerStore } from '@/store/player-store'

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const checkSession = useAuthStore((s) => s.checkSession)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const pathname = usePathname()
  const isHome = pathname === '/'

  useEffect(() => {
    checkSession()
  }, [checkSession])

  return (
    <div className="flex h-full bg-[var(--bg-deep)]">
      {/* 隐藏的音频引擎控制器 */}
      <AudioPlayer />

      {!isHome && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0">
        <main className={`flex-1 min-h-0 ${!isHome ? 'overflow-y-auto pb-24' : ''}`}>
          {children}
        </main>
        {/* Only show old player bar on non-home pages */}
        {!isHome && currentTrack && (
          <div className="fixed bottom-0 left-0 right-0 z-50">
            {isPlaying && <Visualizer />}
            <PlayerBar />
          </div>
        )}
      </div>
    </div>
  )
}
