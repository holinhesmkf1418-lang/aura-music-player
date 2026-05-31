'use client'

import { useState, useEffect } from 'react'

interface Metric {
  label: string
  value: string
  seed: number
  fill?: boolean
}

const NEURAL_NODES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: 9 + ((i * 29 + 17) % 82),
  y: 9 + ((i * 43 + 13) % 82),
  active: i % 4 !== 1,
}))

export function SystemMonitor() {
  const [metrics, setMetrics] = useState({
    cpu: 12,
    ram: 24,
    net: 8.2,
    disc: 65,
  })

  useEffect(() => {
    const id = setInterval(() => {
      setMetrics({
        cpu: Math.floor(Math.random() * 30 + 5),
        ram: Math.floor(Math.random() * 40 + 15),
        net: +(Math.random() * 15 + 2).toFixed(1),
        disc: Math.floor(Math.random() * 20 + 55),
      })
    }, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="hud-titlebar h-[42px] min-h-[42px] shrink-0 px-3">
        <span className="text-[9px] tracking-[0.18em] text-[var(--text-tertiary)]">&gt; SYSTEM_MONITOR</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-2.5 py-2">
        <div className="space-y-2">
          <MetricCard label="CPU" value={`${metrics.cpu}%`} seed={1} />
          <MetricCard label="RAM" value={`${metrics.ram}%`} seed={2} />
          <MetricCard label="NET" value={`${metrics.net} MB/s`} seed={3} />
          <MetricCard label="DISC" value={`${metrics.disc}%`} seed={4} fill />
        </div>

        <div className="mt-3 border-t border-[rgba(148,245,255,0.08)] pt-2.5">
          <div className="mb-2 text-[9px] tracking-[0.16em] text-[var(--text-dim)]">&gt; NEURAL_NET</div>
          <div className="aura-glass-card relative h-[96px] overflow-hidden">
            <div className="absolute inset-0 aura-grid opacity-25" />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {NEURAL_NODES.map((node, i) => {
                const next = NEURAL_NODES[(i + 7) % NEURAL_NODES.length]
                return (
                  <line
                    key={`line-${node.id}`}
                    x1={node.x}
                    y1={node.y}
                    x2={next.x}
                    y2={next.y}
                    stroke="rgba(0,245,255,0.14)"
                    strokeWidth="0.25"
                  />
                )
              })}
            </svg>
            {NEURAL_NODES.map((node) => (
              <span
                key={node.id}
                className="neural-node absolute"
                style={{
                  left: `${node.x}%`,
                  top: `${node.y}%`,
                  opacity: node.active ? 1 : 0.25,
                }}
              />
            ))}
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(0,245,255,0.72)] shadow-[0_0_18px_rgba(0,245,255,0.62)]" />
          </div>
        </div>
      </div>

      <div className="writing-mode-vertical absolute right-[-1px] top-14 text-[8px] tracking-[0.22em] text-[rgba(0,245,255,0.42)]">
        MONITORING_METRICS
      </div>
    </div>
  )
}

function MetricCard({ label, value, seed, fill }: Metric) {
  return (
    <div className="aura-glass-card p-2">
      <div className="text-[10px] font-semibold tracking-[0.18em] text-[rgba(0,245,255,0.76)]">{label}</div>
      <div className="my-1 grid place-items-center rounded-full border border-[rgba(148,245,255,0.14)] bg-[rgba(0,245,255,0.035)] px-1 py-1 text-[14px] tabular-nums text-[var(--text-secondary)]">
        <span className="whitespace-nowrap leading-none">
        {value}
        </span>
      </div>
      <Sparkline seed={seed} fill={fill} />
    </div>
  )
}

function Sparkline({ seed, fill }: { seed: number; fill?: boolean }) {
  const points = Array.from({ length: 24 }, (_, i) => {
    const x = (i / 23) * 100
    const y = 72 - ((Math.sin(i * 0.86 + seed) + 1) * 19 + ((i * seed * 11) % 22))
    return `${x.toFixed(1)},${Math.max(14, Math.min(82, y)).toFixed(1)}`
  })
  const path = `M ${points.join(' L ')}`
  const fillPath = `${path} L 100,100 L 0,100 Z`

  return (
    <svg className="h-[24px] w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d={fillPath} fill={fill ? 'rgba(0,245,255,0.16)' : 'rgba(0,245,255,0.04)'} />
      <path d={path} fill="none" stroke="rgba(0,245,255,0.76)" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
      <g stroke="rgba(0,245,255,0.08)" strokeWidth="0.5">
        {[20, 40, 60, 80].map((x) => <line key={x} x1={x} x2={x} y1="0" y2="100" />)}
        {[25, 50, 75].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} />)}
      </g>
    </svg>
  )
}
