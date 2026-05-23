'use client'

import { usePlayerStore } from '@/store/player-store'
import { getAudioEngine } from '@/lib/audio-engine'
import { formatDuration } from '@/lib/music-service'
import { AURA_COVER } from '@/lib/aura-demo'
import { DanmakuOverlay } from './DanmakuOverlay'
import { FiHeart, FiList, FiMusic, FiPause, FiPlay, FiRepeat, FiShuffle, FiSkipBack, FiSkipForward } from 'react-icons/fi'

export function NowPlayingPanel() {
  const {
    currentTrack, isPlaying, currentTime, duration, repeatMode, isShuffled,
    play, pause, resume, next, prev,
    toggleRepeat, toggleShuffle, setCurrentTime,
  } = usePlayerStore()

  const displayTrack = currentTrack
  const displayDuration = duration
  const displayCurrentTime = currentTime
  const progress = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0
  const currentTimeStr = formatDuration(Math.floor(displayCurrentTime))
  const durationStr = formatDuration(displayDuration)

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = (parseFloat(e.target.value) / 100) * displayDuration
    setCurrentTime(newTime)
    getAudioEngine().seek(newTime)
  }

  const handleMainToggle = () => {
    if (!currentTrack) return
    if (isPlaying) {
      pause()
    } else {
      resume()
    }
  }

  const handleNext = () => {
    if (!currentTrack) return
    next()
  }

  const handlePrev = () => {
    if (!currentTrack) return
    prev()
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="hud-titlebar shrink-0">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] tracking-[0.18em] text-[var(--neon-cyan)]">▦</span>
            <span className="text-[13px] font-semibold tracking-[0.16em] text-[var(--neon-cyan)]">
              NOW PLAYING
            </span>
          </div>
          <div className="flex items-center gap-2 text-[12px] tracking-[0.14em] text-[var(--text-secondary)]">
            <span>{'{'}</span>
            <span>LIVE DANMAKU</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[360px_minmax(0,1fr)] gap-7 px-7 pb-2 pt-4">
        <div className="flex min-h-0 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden border border-[rgba(0,245,255,0.16)] bg-black/40 shadow-[0_0_36px_rgba(0,245,255,0.08)]">
            {displayTrack?.cover ? (
              <img
                src={displayTrack.cover}
                alt={displayTrack.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[rgba(0,5,10,0.8)]">
                <FiMusic className="h-10 w-10 text-[var(--text-dim)]" />
              </div>
            )}
            {displayTrack && (
              <>
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[rgba(0,3,6,0.86)] to-transparent" />
                <div className="absolute inset-x-0 bottom-3 flex h-8 items-end justify-center gap-[3px] opacity-90">
                  {Array.from({ length: 38 }).map((_, i) => (
                    <span key={i} className="w-[2px] bg-[var(--neon-cyan)] shadow-[0_0_7px_var(--neon-cyan)]" style={{ height: `${7 + ((i * 17) % 29)}px` }} />
                  ))}
                </div>
              </>
            )}
          </div>

          {displayTrack ? (
            <div className="grid grid-cols-[1fr_54px] gap-3 pt-3">
              <div className="min-w-0">
                <h2 className="neon-text-cyan truncate text-[22px] leading-tight tracking-[0.04em]">
                  {displayTrack.title}
                </h2>
                <p className="mt-1 truncate text-[14px] text-[var(--text-secondary)]">
                  {displayTrack.artist}
                </p>
                <p className="mt-1 truncate text-[13px] text-[var(--text-tertiary)]">
                  {displayTrack.album || 'Synapse Echoes'}
                </p>
              </div>
              <button className="flex items-start justify-end pt-1 text-[var(--neon-cyan)] transition hover:scale-105 hover:text-white" aria-label="收藏">
                <FiHeart className="h-7 w-7" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 pt-6 text-[var(--text-tertiary)]">
              <p className="text-xs tracking-[0.12em]">NO TRACK SELECTED</p>
              <p className="text-[11px]">在右侧聊天框搜索歌曲</p>
            </div>
          )}
        </div>

        <div className="relative min-w-0 overflow-hidden rounded-sm bg-[linear-gradient(180deg,rgba(0,245,255,0.035),rgba(0,0,0,0)_26%)]">
          <div className="aura-grid absolute inset-0 opacity-70" />
          {displayTrack && <DanmakuOverlay visible={isPlaying} trackKey={displayTrack.id} />}
        </div>
      </div>

      <div className="shrink-0 px-7 pb-4">
        <div className="mb-2 flex items-center justify-center text-[11px] tracking-[0.12em] text-[var(--text-secondary)]">
          <span>FLAC 44.1kHz / 16bit</span>
        </div>
        <div className="grid grid-cols-[48px_1fr_48px] items-center gap-4">
          <span className="text-[13px] tabular-nums text-[var(--text-secondary)]">{currentTimeStr}</span>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={handleProgressChange}
            className="aura-progress w-full"
            style={{
              background: `linear-gradient(to right, rgba(0,245,255,0.95) ${progress}%, rgba(0,245,255,0.14) ${progress}%)`,
            }}
          />
          <span className="text-right text-[13px] tabular-nums text-[var(--text-secondary)]">{durationStr}</span>
        </div>

        <div className="mt-3 flex items-center justify-center gap-14">
          <button onClick={toggleShuffle} className={`aura-icon-button ${isShuffled ? 'is-active' : ''}`} aria-label="随机播放">
            <FiShuffle />
          </button>
          <button onClick={handlePrev} className="aura-icon-button" aria-label="上一首">
            <FiSkipBack />
          </button>
          <button
            onClick={handleMainToggle}
            className="aura-play-button"
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <FiPause /> : <FiPlay className="ml-1" />}
          </button>
          <button onClick={handleNext} className="aura-icon-button" aria-label="下一首">
            <FiSkipForward />
          </button>
          <button onClick={toggleRepeat} className={`aura-icon-button ${repeatMode !== 'off' ? 'is-active' : ''}`} aria-label="循环">
            <FiRepeat />
          </button>
          <button className="aura-icon-button" aria-label="播放列表">
            <FiList />
          </button>
        </div>
      </div>
    </div>
  )
}
