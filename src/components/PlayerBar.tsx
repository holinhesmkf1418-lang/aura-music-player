'use client'

import { usePlayerStore } from '@/store/player-store'
import { formatDuration } from '@/lib/music-service'
import { getAudioEngine } from '@/lib/audio-engine'
import { FiList, FiMusic, FiPause, FiPlay, FiSkipBack, FiSkipForward } from 'react-icons/fi'

export function PlayerBar() {
  const {
    currentTrack, isPlaying, currentTime, duration,
    pause, resume, next, prev, setCurrentTime,
  } = usePlayerStore()

  const displayTrack = currentTrack
  const displayDuration = duration
  const displayCurrentTime = currentTime
  const progress = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * displayDuration
    setCurrentTime(newTime)
    getAudioEngine().seek(newTime)
  }

  const handleToggle = () => {
    if (!currentTrack) return
    if (isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  const handlePrev = () => {
    if (!currentTrack) return
    prev()
  }

  const handleNext = () => {
    if (!currentTrack) return
    next()
  }

  return (
    <div className="hud-frame aura-panel-dock flex min-w-0 items-center gap-3 overflow-hidden px-3 opacity-[0.9]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="aura-glass-card h-9 w-9 shrink-0 overflow-hidden opacity-90">
          {displayTrack?.cover ? (
            <img src={displayTrack.cover} alt={displayTrack.title} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center">
              <FiMusic className="h-4 w-4 text-[var(--text-dim)]" />
            </div>
          )}
        </div>
        <div className="min-w-[130px]">
          <p className="truncate text-[13px] leading-tight text-white/85">{displayTrack?.title || '未选择歌曲'}</p>
          <p className="mt-0.5 truncate text-[10px] font-semibold tracking-[0.08em] text-[rgba(0,245,255,0.8)]">{displayTrack?.artist || 'AURA_DOCK'}</p>
        </div>
      </div>

      <div className="flex w-[190px] items-center gap-2">
        <span className="w-14 text-right text-[10px] tabular-nums text-[var(--text-secondary)]">
          {formatDuration(Math.floor(displayCurrentTime))}
        </span>
        <input
          type="range"
          min="0"
          max="100"
          value={progress}
          onChange={handleProgressChange}
          className="aura-progress flex-1"
          style={{
            background: `linear-gradient(to right, rgba(0,245,255,0.92) ${progress}%, rgba(0,245,255,0.14) ${progress}%)`,
          }}
        />
        <span className="w-11 text-[10px] tabular-nums text-[var(--text-secondary)]">
          {formatDuration(displayDuration)}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <button onClick={handlePrev} className="aura-mini-button" aria-label="上一首">
          <FiSkipBack />
        </button>
        <button onClick={handleToggle} className="aura-mini-play" aria-label={isPlaying ? '暂停' : '播放'}>
          {isPlaying ? <FiPause /> : <FiPlay className="ml-0.5" />}
        </button>
        <button onClick={handleNext} className="aura-mini-button" aria-label="下一首">
          <FiSkipForward />
        </button>
        <button className="aura-mini-button" aria-label="队列">
          <FiList />
        </button>
      </div>
    </div>
  )
}
