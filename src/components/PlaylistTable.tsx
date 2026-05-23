'use client'

import { Track } from '@/lib/types'
import { formatDuration } from '@/lib/music-service'
import { usePlayerStore } from '@/store/player-store'
import { FiList } from 'react-icons/fi'

interface PlaylistTableProps {
  tracks: Track[]
  loading?: boolean
}

const HEADERS = ['#', 'TITLE', 'ARTIST', 'ALBUM', 'DUR']

export function PlaylistTable({ tracks, loading }: PlaylistTableProps) {
  const { currentTrack, isPlaying, play, pause } = usePlayerStore()
  const visibleTracks = tracks.slice(0, 12)
  const columns = [visibleTracks.slice(0, 6), visibleTracks.slice(6, 12)]

  // 空状态
  if (!loading && tracks.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <PlaylistHeader count={0} />
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="flex flex-col items-center gap-2 text-[var(--text-tertiary)]">
            <span className="text-2xl opacity-40">♪</span>
            <p className="text-center text-xs leading-relaxed tracking-[0.12em]">
              在右侧聊天框搜索你想听的歌曲<br />
              或等待推荐加载
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading && tracks.length === 0) {
    return (
      <div className="flex h-full flex-col">
        <PlaylistHeader count={0} />
        <div className="grid flex-1 grid-cols-2 gap-px p-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse bg-[rgba(0,245,255,0.035)]" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <PlaylistHeader count={tracks.length} />
      <div className="grid grid-cols-2 border-b border-[rgba(0,245,255,0.08)] px-4 py-2 text-[11px] tracking-[0.16em] text-[var(--text-tertiary)]">
        {[0, 1].map((column) => (
          <div key={column} className={`grid grid-cols-[42px_1.7fr_1.45fr_1.5fr_46px] gap-3 ${column === 1 ? 'border-l border-[rgba(0,245,255,0.08)] pl-4' : 'pr-4'}`}>
            {HEADERS.map((label) => (
              <span key={label} className={label === 'DUR' ? 'text-right' : ''}>{label}</span>
            ))}
          </div>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2 overflow-hidden px-4 py-2">
        {columns.map((columnTracks, columnIndex) => (
          <div key={columnIndex} className={columnIndex === 1 ? 'border-l border-[rgba(0,245,255,0.08)] pl-4' : 'pr-4'}>
            {columnTracks.map((track, index) => {
              const absoluteIndex = columnIndex * 6 + index
              const isCurrent = currentTrack?.id === track.id || (!currentTrack && absoluteIndex === 0)
              const rowNumber = String(absoluteIndex + 1).padStart(2, '0')

              return (
                <button
                  key={track.id}
                  type="button"
                  className={`group grid h-[31px] w-full grid-cols-[42px_1.7fr_1.45fr_1.5fr_46px] items-center gap-3 border-l text-left text-[12px] transition
                    ${isCurrent
                      ? 'border-l-[var(--neon-cyan)] bg-[rgba(0,245,255,0.075)] text-[var(--neon-cyan)] shadow-[inset_18px_0_28px_rgba(0,245,255,0.04)]'
                      : 'border-l-transparent text-[var(--text-secondary)] hover:border-l-[rgba(0,245,255,0.4)] hover:bg-[rgba(0,245,255,0.04)] hover:text-white'
                    }`}
                  onClick={() => {
                    if (isCurrent && currentTrack && isPlaying) {
                      pause()
                    } else {
                      play(track, tracks)
                    }
                  }}
                >
                  <span className="pl-5 tabular-nums text-[11px]">
                    {isCurrent && isPlaying ? <EqualizerMark /> : rowNumber}
                  </span>
                  <span className="truncate font-semibold">{track.title}</span>
                  <span className="truncate text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]">{track.artist}</span>
                  <span className="truncate text-[var(--text-dim)]">{track.album || 'Unknown'}</span>
                  <span className="pr-2 text-right tabular-nums text-[11px] text-[var(--text-tertiary)]">
                    {formatDuration(track.duration)}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function PlaylistHeader({ count }: { count: number }) {
  return (
    <div className="hud-titlebar shrink-0">
      <div className="flex items-center gap-3">
        <FiList className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
        <span className="text-[13px] font-semibold tracking-[0.16em] text-[var(--neon-cyan)]">PLAYLIST</span>
        <span className="text-[11px] tracking-[0.12em] text-[var(--text-tertiary)]">NOW PLAYING ({count})</span>
      </div>
      <span className="text-[11px] tracking-[0.12em] text-[var(--text-secondary)]">TOTAL 98 TRACKS</span>
    </div>
  )
}

function EqualizerMark() {
  return (
    <span className="inline-flex h-3 items-end gap-[2px]">
      {[8, 4, 10, 6].map((height, index) => (
        <span key={index} className="w-[2px] bg-[var(--neon-cyan)] shadow-[0_0_5px_var(--neon-cyan)]" style={{ height }} />
      ))}
    </span>
  )
}
