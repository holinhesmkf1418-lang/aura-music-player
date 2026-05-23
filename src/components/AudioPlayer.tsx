'use client'

import { useEffect, useCallback } from 'react'
import { usePlayerStore } from '@/store/player-store'
import { getAudioEngine, destroyAudioEngine } from '@/lib/audio-engine'

/**
 * AudioPlayer 组件（不可见）
 * 将 PlayerStore 的状态变化同步到 Web Audio API 音频引擎
 */
export function AudioPlayer() {
  const {
    currentTrack,
    volume,
    isMuted,
    setCurrentTime,
  } = usePlayerStore()

  // 歌曲结束时自动切歌
  const handleEnded = useCallback(() => {
    const store = usePlayerStore.getState()
    store.next()
  }, [])

  // 初始化音频引擎
  useEffect(() => {
    const engine = getAudioEngine()

    // 注册歌曲结束时的切歌回调
    engine.setOnEnded(handleEnded)

    // 监听音频引擎状态变化，同步回 Store
    engine.onStateChange((state) => {
      const store = usePlayerStore.getState()
      // 同步实际音频时长（loadedmetadata 更新后生效）
      if (state.duration > 0 && Math.abs(state.duration - store.duration) > 0.5) {
        store.setDuration(state.duration)
      }
      // 只在差值大于 0.5 秒时更新，避免频繁渲染
      if (Math.abs(state.currentTime - store.currentTime) > 0.5) {
        setCurrentTime(state.currentTime)
      }
    })

    return () => {
      destroyAudioEngine()
    }
  }, [setCurrentTime, handleEnded])

  // 音量变化
  useEffect(() => {
    const engine = getAudioEngine()
    engine.setVolume(isMuted ? 0 : volume)
  }, [volume, isMuted])

  // 没有当前歌曲时隐藏
  if (!currentTrack) return null

  return null
}
