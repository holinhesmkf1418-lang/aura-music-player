'use client'

import { useState, useEffect } from 'react'

interface TokenStats {
  totalTokens: number
  totalCalls: number
  dailyTotals: { date: string; tokens: number; calls: number }[]
  byLabel: { label: string; calls: number; totalTokens: number }[]
}

interface MetricCardData {
  label: string
  value: string
  sparklineData?: number[]
  fill?: boolean
}

const NEURAL_NODES = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  x: 9 + ((i * 29 + 17) % 82),
  y: 9 + ((i * 43 + 13) % 82),
  active: i % 4 !== 1,
}))

const MODEL_NAME = 'deepseek-v4-pro'

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function SystemMonitor() {
  const [stats, setStats] = useState<TokenStats | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/token-usage?days=7')
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled) setStats(data)
      } catch {
        // 静默失败，保持上次数据
      }
    }

    fetchStats()
    const id = setInterval(fetchStats, 30_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  // 今日数据
  const today = stats?.dailyTotals.at(-1)
  const todayTokens = today?.tokens ?? 0
  const todayCalls = today?.calls ?? 0

  // 7天总量
  const weekTokens = stats?.dailyTotals.reduce((sum, d) => sum + d.tokens, 0) ?? 0
  const weekCalls = stats?.dailyTotals.reduce((sum, d) => sum + d.calls, 0) ?? 0

  // Sparkline 数据
  const sparklineTokens = stats?.dailyTotals.map((d) => d.tokens) ?? []
  const sparklineCalls = stats?.dailyTotals.map((d) => d.calls) ?? []

  const metrics: MetricCardData[] = [
    { label: 'TOKEN', value: formatNumber(todayTokens), sparklineData: sparklineTokens },
    { label: 'CALLS', value: formatNumber(todayCalls), sparklineData: sparklineCalls },
    { label: 'MODEL', value: MODEL_NAME },
    { label: '7D.USE', value: `${formatNumber(weekTokens)} / ${weekCalls}次`, fill: true },
  ]

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="hud-titlebar h-[42px] min-h-[42px] shrink-0 px-3">
        <span className="text-[9px] tracking-[0.18em] text-[var(--text-tertiary)]">&gt; TOKEN_MONITOR</span>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-2.5 py-2">
        <div className="space-y-2">
          {metrics.map((m) => (
            <MetricCard key={m.label} metric={m} />
          ))}
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
        TOKEN_USAGE_MONITOR
      </div>
    </div>
  )
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  return (
    <div className="aura-glass-card p-2">
      <div className="text-[10px] font-semibold tracking-[0.18em] text-[rgba(0,245,255,0.76)]">{metric.label}</div>
      <div className="my-1 grid place-items-center rounded-full border border-[rgba(148,245,255,0.14)] bg-[rgba(0,245,255,0.035)] px-1 py-1 text-[14px] tabular-nums text-[var(--text-secondary)]">
        <span className="whitespace-nowrap leading-none">
        {metric.value}
        </span>
      </div>
      <Sparkline data={metric.sparklineData} fill={metric.fill} />
    </div>
  )
}

function Sparkline({ data, fill }: { data?: number[]; fill?: boolean }) {
  const points = data?.length
    ? data.map((v, i) => {
        const max = Math.max(...data, 1)
        const x = (i / Math.max(data.length - 1, 1)) * 100
        const y = 100 - ((v / max) * 70 + 14)
        return `${x.toFixed(1)},${Math.max(10, Math.min(90, y)).toFixed(1)}`
      })
    : Array.from({ length: 24 }, (_, i) => {
        // 未加载时显示占位波形
        const x = (i / 23) * 100
        const y = 100 - (Math.sin(i * 1.2) * 18 + 50)
        return `${x.toFixed(1)},${y.toFixed(1)}`
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
