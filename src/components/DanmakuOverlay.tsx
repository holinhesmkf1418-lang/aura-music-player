'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const DANMAKU_POOL: string[] = [
  '前排打卡', '这首歌太燃了', '2026年还在听', '歌词写得太好了',
  '单曲循环第100遍', '神仙嗓音', '开口跪', '前奏杀',
  '经典永流传', '承包副歌部分', '已加入歌单',
  '歌词引起极度舒适', '这旋律太上头了', '梦中情歌',
  '有生之年系列', '这也太好听了吧', '无限循环中', '听了就想哭',
  '副歌部分绝了', '宝藏歌曲', '百万填词',
  '作曲天才', '这首歌陪伴了我整个夏天', '旋律一响就醉了',
  '高级感拉满', '氛围感十足', '听哭了', '好听到爆炸',
  '这才是音乐该有的样子', '百听不厌', '开口就是青春',
  '节奏感太强了', '歌词句句扎心', '越听越上头', '神仙合作',
  '期待现场版', '终于等到这首歌', '童年回忆杀', '神专预定',
  '这首歌我能听一辈子', '前奏一秒沦陷', '年度最佳单曲',
  '旋律太抓耳了', '歌词写进心里了', '听这首歌会想起你',
  '氛围绝了', '深夜里最适合听的歌',
]

interface DanmakuItem {
  id: number
  text: string
  topPercent: number
  duration: number
  delay: number
  color: string
  fontSize: number
}

interface DanmakuOverlayProps {
  visible: boolean
  trackKey?: string
}

const COLORS = ['#00f0ff', '#ff00aa', '#b400ff', '#ffffff', '#39ff14']

let globalId = 0

export function DanmakuOverlay({ visible, trackKey }: DanmakuOverlayProps) {
  const [items, setItems] = useState<DanmakuItem[]>([])
  const poolIndex = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  const clearScheduledTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id))
    timeoutsRef.current.clear()
  }, [])

  const scheduleTimeout = useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutsRef.current.delete(id)
      callback()
    }, delay)
    timeoutsRef.current.add(id)
    return id
  }, [])

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const addItem = useCallback(() => {
    const text = DANMAKU_POOL[poolIndex.current % DANMAKU_POOL.length]
    poolIndex.current++
    const newItem: DanmakuItem = {
      id: ++globalId,
      text,
      topPercent: 8 + Math.random() * 70,
      duration: 10 + Math.random() * 6,
      delay: 0,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      fontSize: 11 + Math.floor(Math.random() * 4),
    }
    setItems((prev) => [...prev, newItem])
    scheduleTimeout(() => removeItem(newItem.id), (newItem.duration + 2) * 1000)
  }, [removeItem, scheduleTimeout])

  // Reset danmaku when track changes
  useEffect(() => {
    clearScheduledTimeouts()
    setItems([])
    poolIndex.current = 0
  }, [trackKey, clearScheduledTimeouts])

  // Manage the danmaku spawn interval
  useEffect(() => {
    if (!visible) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      clearScheduledTimeouts()
      setItems([])
      return
    }

    // Initial burst
    scheduleTimeout(() => {
      for (let i = 0; i < 5; i++) {
        scheduleTimeout(addItem, i * 700)
      }
    }, 500)

    // Continuous spawn
    intervalRef.current = setInterval(addItem, 4000)

    return () => {
      clearScheduledTimeouts()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [visible, addItem, scheduleTimeout, clearScheduledTimeouts])

  if (!visible) return null

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
      {items.map((item) => (
        <span
          key={item.id}
          className="absolute whitespace-nowrap animate-danmaku"
          style={{
            top: `${item.topPercent}%`,
            color: item.color,
            fontSize: `${item.fontSize}px`,
            fontFamily: 'inherit',
            fontWeight: 500,
            textShadow: `
              0 0 2px ${item.color},
              0 0 6px ${item.color}80,
              0 0 12px ${item.color}40
            `,
            opacity: 0.5,
            animationDuration: `${item.duration}s`,
            animationDelay: `${item.delay}ms`,
            left: '100%',
            willChange: 'transform',
          }}
        >
          {item.text}
        </span>
      ))}
    </div>
  )
}
