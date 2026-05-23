'use client'

import { usePlayerStore } from '@/store/player-store'
import { DanmakuOverlay } from './DanmakuOverlay'
import { FiPlay, FiPause, FiSkipBack, FiSkipForward, FiMusic } from 'react-icons/fi'

export function PlayerView() {
  const { currentTrack, isPlaying, play, pause, next, prev } = usePlayerStore()

  const hasTrack = !!currentTrack

  const handlePlayPause = () => {
    if (!currentTrack) return
    if (isPlaying) {
      pause()
    } else {
      play(currentTrack)
    }
  }

  // Empty state
  if (!hasTrack) {
    return (
      <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <div className="hud-panel w-24 h-24 flex items-center justify-center">
            <FiMusic className="w-10 h-10 text-[var(--neon-cyan)] opacity-40" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-tertiary)] font-mono">
              STATUS: STANDBY
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-neon-pulse" />
          </div>
          <p className="text-xs text-[var(--text-tertiary)] font-mono tracking-wider">
            [ SELECT A TRACK TO BEGIN ]
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col items-center justify-center relative overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 cyber-grid opacity-20" />

      {/* Danmaku overlay */}
      <DanmakuOverlay
        visible={isPlaying}
        trackKey={currentTrack.id}
      />

      {/* HUD status bar */}
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--neon-cyan)] font-mono tracking-widest uppercase opacity-60">
            Now Playing
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-[var(--neon-green)] animate-neon-pulse' : 'bg-[var(--text-tertiary)]'}`} />
        </div>
        <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
          {isPlaying ? 'PLAYING' : 'PAUSED'}
        </div>
      </div>

      {/* Album art with HUD-style frame */}
      <div className="relative z-10 mb-5">
        <div className="w-44 h-44 hud-panel overflow-hidden">
          {currentTrack.cover ? (
            <img
              src={currentTrack.cover}
              alt={currentTrack.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-black flex items-center justify-center">
              <FiMusic className="w-12 h-12 text-[var(--neon-cyan)] opacity-30" />
            </div>
          )}
        </div>
      </div>

      {/* Track info as data readout */}
      <div className="relative z-10 w-[80%] max-w-xs mb-5">
        <div className="border border-[rgba(0,240,255,0.1)] bg-[rgba(0,0,0,0.3)] px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] text-[var(--text-tertiary)] font-mono tracking-widest">TRACK</span>
            <div className="flex-1 border-t border-dashed border-[rgba(0,240,255,0.08)]" />
          </div>
          <h2 className="text-sm font-mono neon-text-cyan truncate">
            {currentTrack.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[9px] text-[var(--text-tertiary)] font-mono tracking-widest">ARTIST</span>
            <span className="text-xs font-mono text-[var(--text-secondary)] truncate">
              {currentTrack.artist}
            </span>
          </div>
          {currentTrack.album && (
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] text-[var(--text-tertiary)] font-mono tracking-widest">ALBUM</span>
              <span className="text-[11px] font-mono text-[var(--text-tertiary)] truncate">
                {currentTrack.album}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="relative z-10 flex items-center gap-4">
        <button
          onClick={prev}
          className="text-[var(--text-tertiary)] hover:text-[var(--neon-cyan)] transition-colors p-2 hover:glow-cyan"
          title="上一首"
        >
          <FiSkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={handlePlayPause}
          className="w-10 h-10 border border-[var(--neon-cyan)] bg-[rgba(0,240,255,0.04)] text-[var(--neon-cyan)] flex items-center justify-center hover:bg-[rgba(0,240,255,0.1)] transition-all hover:shadow-[var(--glow-cyan)]"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          onClick={next}
          className="text-[var(--text-tertiary)] hover:text-[var(--neon-cyan)] transition-colors p-2"
          title="下一首"
        >
          <FiSkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
