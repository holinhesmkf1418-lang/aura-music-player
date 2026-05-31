'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AudioPlayer } from './AudioPlayer'
import { PlayerBar } from './PlayerBar'
import { Sidebar } from './Sidebar'
import { Visualizer } from './Visualizer'
import { useAuthInit } from '@/hooks/useAuthInit'
import { usePlayerStore } from '@/store/player-store'

export function AppShell({ children }: { children: ReactNode }) {
  useAuthInit()

  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <div className="flex h-full bg-[var(--bg-deep)]">
      <AudioPlayer />

      {!isHome && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <main className={`min-h-0 flex-1 ${!isHome ? 'overflow-y-auto pb-24' : ''}`}>
          {children}
        </main>
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
