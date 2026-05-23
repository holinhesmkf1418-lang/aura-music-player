'use client'

import { useEffect, useRef } from 'react'
import { getAudioEngine } from '@/lib/audio-engine'

export function Visualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width = canvas.offsetWidth
    const height = canvas.height = canvas.offsetHeight
    const bars = 64
    const colors = ['#8b5cf6', '#7c3aed', '#06b6d4', '#0891b2', '#a78bfa']

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      const barWidth = width / bars
      // 使用音频引擎的真实/合成频率数据
      const rawData = getAudioEngine().getFrequencyData()
      const data: number[] = []
      // 将 32 条数据插值到 bars 条
      for (let i = 0; i < bars; i++) {
        const srcIdx = (i / bars) * rawData.length
        const idx1 = Math.floor(srcIdx)
        const idx2 = Math.min(idx1 + 1, rawData.length - 1)
        const frac = srcIdx - idx1
        data.push((rawData[idx1] * (1 - frac) + rawData[idx2] * frac) / 255)
      }

      data.forEach((value, i) => {
        const barHeight = value * height * 0.8
        const x = i * barWidth
        const y = height - barHeight

        const gradient = ctx.createLinearGradient(x, y, x, height)
        const colorIndex = i % colors.length
        const nextColorIndex = (colorIndex + 1) % colors.length
        gradient.addColorStop(0, colors[colorIndex])
        gradient.addColorStop(1, colors[nextColorIndex])

        ctx.fillStyle = gradient
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
      })

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-16 opacity-60"
      style={{ background: 'linear-gradient(to top, rgba(139, 92, 246, 0.1), transparent)' }}
    />
  )
}
