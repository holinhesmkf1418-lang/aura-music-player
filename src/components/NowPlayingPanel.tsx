'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Track } from '@/lib/types'
import { usePlayerStore } from '@/store/player-store'
import { getAudioEngine } from '@/lib/audio-engine'
import { formatDuration } from '@/lib/music-service'
import { getActiveLyricIndex, parseLyrics } from '@/lib/lyrics'
import { AURA_COVER } from '@/lib/aura-demo'
import { useLyrics } from '@/hooks/useLyrics'
import { setTrackLiked } from '@/lib/liked-tracks'
import { FiHeart, FiList, FiPause, FiPlay, FiRepeat, FiShuffle, FiSkipBack, FiSkipForward, FiZap } from 'react-icons/fi'

const WAVE_BARS = Array.from({ length: 54 }, (_, i) => 18 + ((i * 23) % 64))

export function NowPlayingPanel() {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const {
    currentTrack, isPlaying, currentTime, duration, repeatMode, isShuffled,
    pause, resume, next, prev,
    toggleRepeat, toggleShuffle, setCurrentTime,
  } = usePlayerStore()

  const displayTrack = currentTrack
  const cover = displayTrack?.cover || AURA_COVER
  const displayDuration = duration
  const displayCurrentTime = currentTime
  const progress = displayDuration > 0 ? (displayCurrentTime / displayDuration) * 100 : 0
  const currentTimeStr = formatDuration(Math.floor(displayCurrentTime))
  const durationStr = formatDuration(displayDuration)
  const title = displayTrack?.title || 'AURA MUSIC SIGNAL'
  const artist = displayTrack?.artist || 'Neural Sync System'
  const album = displayTrack?.album || 'Awaiting Selection'

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

  const handleLike = async () => {
    if (!displayTrack) return

    const nextLiked = !likedIds.has(displayTrack.id)
    setLikedIds((prev) => {
      const next = new Set(prev)
      if (nextLiked) {
        next.add(displayTrack.id)
      } else {
        next.delete(displayTrack.id)
      }
      return next
    })

    try {
      await setTrackLiked(displayTrack, nextLiked)
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev)
        if (nextLiked) {
          next.delete(displayTrack.id)
        } else {
          next.add(displayTrack.id)
        }
        return next
      })
    }
  }

  return (
    <div className="relative grid h-full grid-rows-[auto_minmax(0,1fr)_96px] overflow-hidden">
      <div className="hud-titlebar">
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[12px] tracking-[0.18em] text-[var(--neon-cyan)]">▦</span>
            <span className="text-[13px] font-semibold tracking-[0.16em] text-[var(--neon-cyan)]">
              NOW PLAYING
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] tracking-[0.14em] text-[var(--text-secondary)]">
            <span className="text-[var(--neon-magenta)]">MUSIC_STAGE</span>
            <span className="h-1 w-1 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
            <span>{isPlaying ? 'LIVE SIGNAL' : 'STANDBY'}</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 grid-cols-[minmax(260px,0.86fr)_minmax(0,1.14fr)] gap-5 overflow-hidden px-6 pb-3 pt-4">
        <div className="relative min-h-0 overflow-hidden">
          <div className="aura-cover-stage aura-glass-card aura-glass-card-strong relative h-full min-h-0 overflow-hidden p-5">
            <div
              aria-hidden="true"
              className={`absolute inset-0 scale-110 bg-cover bg-center blur-2xl ${displayTrack ? 'opacity-30' : 'opacity-[0.18] grayscale'}`}
              style={{ backgroundImage: `url(${JSON.stringify(cover)})` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(255,255,255,0.08),transparent_32%),linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.68))]" />
            <div className="absolute inset-4 border border-[rgba(0,245,255,0.08)]" />
            <div className="aura-glass-control absolute left-4 top-4 z-20 flex items-center gap-2 px-2.5 py-1 text-[10px] tracking-[0.16em] text-[var(--neon-cyan)]">
              <span className="h-1.5 w-1.5 bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
              COVER_ART
            </div>
            <div className="relative z-10 flex h-full min-h-0 items-center justify-center">
              <div className="relative aspect-square h-full max-h-[350px] max-w-full overflow-hidden border border-[rgba(148,245,255,0.24)] bg-black/35 shadow-[0_0_44px_rgba(0,245,255,0.14),0_18px_54px_rgba(0,0,0,0.42)]">
                <img
                  src={cover}
                  alt={title}
                  className={`h-full w-full object-cover ${displayTrack ? '' : 'opacity-70 grayscale'}`}
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_32%,rgba(0,245,255,0.08)_100%)]" />
                <div className="pointer-events-none absolute inset-0 border border-white/5" />
              </div>
            </div>
          </div>
        </div>

        <div className="aura-glass-card relative min-w-0 overflow-hidden px-5 py-3.5">
          <div className="aura-grid absolute inset-0 opacity-25" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <button
            onClick={handleLike}
            disabled={!displayTrack}
            className={`aura-glass-control absolute right-4 top-4 z-30 grid h-10 w-10 shrink-0 place-items-center transition hover:bg-[rgba(0,245,255,0.1)] hover:text-white disabled:pointer-events-none disabled:opacity-35 ${
              displayTrack && likedIds.has(displayTrack.id) ? 'text-[var(--neon-red)]' : 'text-[var(--neon-cyan)]'
            }`}
            aria-label={displayTrack && likedIds.has(displayTrack.id) ? '取消收藏' : '收藏'}
          >
            <FiHeart className={displayTrack && likedIds.has(displayTrack.id) ? 'h-5 w-5 fill-current' : 'h-5 w-5'} />
          </button>

          <div className="relative z-20 flex h-full flex-col justify-center">
            <div className="mx-auto flex w-full max-w-[560px] flex-col items-center text-center">
              <div className="min-w-0 max-w-full">
                <div className="mb-2 flex flex-wrap items-center justify-center gap-2 text-[10px] tracking-[0.16em] text-[var(--text-tertiary)]">
                  <span className="text-[var(--neon-cyan)]">ACTIVE_TRACK</span>
                  <span>/</span>
                  <span>{displayTrack ? 'STREAM_READY' : 'NO_SELECTION'}</span>
                </div>
                <h2 className="neon-text-cyan max-w-full truncate text-[30px] leading-none tracking-[0.03em]">
                  {title}
                </h2>
                <p className="mt-2 truncate text-[14px] text-white/80">{artist}</p>
                <p className="mt-0.5 truncate text-[11px] tracking-[0.1em] text-[var(--text-tertiary)]">{album}</p>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2 text-[10px] tracking-[0.12em] text-[var(--text-secondary)]">
                {['AI CURATED', '44.1 KHZ', isPlaying ? 'PLAYING' : 'READY'].map((label) => (
                  <span key={label} className="aura-glass-control px-2.5 py-1">
                    {label}
                  </span>
                ))}
              </div>

              <InlineLyrics
                track={displayTrack}
                currentTime={displayCurrentTime}
                duration={displayDuration}
              />

              <div className="mt-4 w-full">
                <div className="mb-1 flex items-center justify-between text-[10px] tracking-[0.14em] text-[var(--text-tertiary)]">
                  <span>SPECTRAL_WAVEFORM</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="aura-glass-card flex h-8 items-end gap-[4px] overflow-hidden px-3 py-1.5">
                  {WAVE_BARS.map((height, i) => (
                    <span
                      key={i}
                      className={`flex-1 min-w-[2px] ${i <= Math.floor((progress / 100) * WAVE_BARS.length) ? 'bg-[var(--neon-cyan)]' : 'bg-[rgba(0,245,255,0.16)]'}`}
                      style={{
                        height: `${height}%`,
                        boxShadow: i <= Math.floor((progress / 100) * WAVE_BARS.length) ? '0 0 9px rgba(0,245,255,0.38)' : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              {!displayTrack && (
                <div className="aura-glass-card mt-3 flex items-start gap-2 border-l-[rgba(0,245,255,0.28)] px-3.5 py-1.5">
                  <FiZap className="mt-0.5 h-3 w-3 shrink-0 text-[var(--neon-magenta)]" />
                  <p className="line-clamp-1 text-[11px] leading-relaxed text-[var(--text-secondary)]">
                    <span className="mr-2 tracking-[0.16em] text-[var(--neon-magenta)]">AURA_NOTE</span>
                    输入想听的氛围，AURA 会同步推荐到播放列表。
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[rgba(148,245,255,0.08)] bg-[rgba(0,10,16,0.18)] px-6 pb-3 pt-2">
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

        <div className="mt-2.5 flex items-center justify-center gap-10">
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

function InlineLyrics({
  track,
  currentTime,
  duration,
}: {
  track: Track | null
  currentTime: number
  duration: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<Array<HTMLDivElement | null>>([])
  const { lyrics: rawLyrics, loading } = useLyrics(track?.id, track?.title, track?.artist)
  const lines = useMemo(() => parseLyrics(rawLyrics), [rawLyrics])
  const activeIndex = useMemo(
    () => getActiveLyricIndex(lines, currentTime, duration),
    [currentTime, duration, lines],
  )

  useEffect(() => {
    if (activeIndex < 0) return
    lineRefs.current[activeIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }, [activeIndex])

  return (
    <div className="aura-glass-card mt-5 w-full min-h-[126px] overflow-hidden px-5 py-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] tracking-[0.16em]">
        <span className="text-[var(--neon-magenta)]">LYRIC_STREAM</span>
        <span className="text-[var(--text-tertiary)]">{lines.length > 0 ? 'SYNCED' : 'STANDBY'}</span>
      </div>

      <div ref={containerRef} className="h-[90px] overflow-hidden scroll-smooth">
        {!track ? (
          <p className="pt-8 text-center text-[12px] tracking-[0.1em] text-[var(--text-tertiary)]">选择歌曲后显示滚动歌词</p>
        ) : loading ? (
          <div className="space-y-2 pt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="mx-auto h-2 animate-pulse bg-[rgba(0,245,255,0.08)]" style={{ width: `${72 - i * 12}%` }} />
            ))}
          </div>
        ) : lines.length > 0 ? (
          <div className="space-y-2 pb-10 pt-10">
            {lines.map((line, index) => (
              <div
                key={`${line.time ?? 'plain'}-${index}-${line.text}`}
                ref={(el) => { lineRefs.current[index] = el }}
                className={`truncate text-center leading-relaxed transition-all duration-300 ${
                  index === activeIndex
                    ? 'text-[14px] text-[var(--neon-cyan)] opacity-100 drop-shadow-[0_0_8px_rgba(0,245,255,0.45)]'
                    : 'text-[12px] text-[var(--text-secondary)] opacity-[0.42]'
                }`}
              >
                {line.text}
              </div>
            ))}
          </div>
        ) : (
          <p className="pt-8 text-center text-[12px] tracking-[0.1em] text-[var(--text-tertiary)]">暂无歌词，继续播放当前信号</p>
        )}
      </div>
    </div>
  )
}
