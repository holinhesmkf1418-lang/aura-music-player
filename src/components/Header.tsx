'use client'

import { useState, useEffect } from 'react'

function WaveMark() {
  return (
    <div className="aura-wave-mark" aria-hidden="true">
      {Array.from({ length: 13 }).map((_, i) => (
        <span key={i} style={{ height: `${18 + ((i * 19) % 52)}%` }} />
      ))}
    </div>
  )
}

export function Header() {
  const [timeStr, setTimeStr] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTimeStr(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      setDateStr(now.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="hud-frame aura-panel-dock relative z-10 h-[62px] shrink-0 grid grid-cols-[278px_1fr_160px] items-center overflow-hidden px-4 select-none">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,245,255,0.5)] to-transparent opacity-60" />

      <div className="aura-brand-plate h-full flex items-center gap-4">
        <WaveMark />
        <div className="min-w-0">
          <h1 className="neon-text-cyan text-[22px] leading-none tracking-[0.16em]">
            AURA MUSIC
          </h1>
          <p className="mt-1 text-[10px] tracking-[0.24em] text-[rgba(0,245,255,0.7)]">
            NEURAL SYNC SYSTEM
          </p>
        </div>
      </div>

      <div className="hud-status-ribbon mx-6 h-[34px] flex items-center justify-center gap-9 px-7">
        <div className="status-chip">
          <span>SYNC_STATUS:</span>
          <strong>ONLINE</strong>
        </div>
        <div className="status-chip">
          <span>API_SOURCE:</span>
          <strong className="text-white/80">NETEASE_CLOUD_MUSIC</strong>
        </div>
        <div className="status-chip">
          <span>AI_AGENT:</span>
          <strong className="text-white/80">DEEPSEEK-V4-PRO</strong>
        </div>
      </div>

      <div className="h-full flex items-center justify-end gap-6">
        <div className="aura-time-block min-w-[130px] text-right">
          <div className="neon-text-cyan text-[21px] leading-none tabular-nums tracking-[0.08em]">
            {timeStr}
          </div>
          <div className="mt-1 text-[10px] tracking-[0.12em] text-[var(--text-secondary)]">
            {dateStr}
          </div>
        </div>
      </div>
    </header>
  )
}
