type AudioEngineState = {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
}

type StateListener = (state: AudioEngineState) => void

/**
 * 音频播放引擎
 * 使用 HTMLAudioElement 播放真实 MP3，不依赖 AudioContext CORS
 */
class AudioEngine {
  private audio: HTMLAudioElement | null = null

  private _isPlaying = false
  private _currentTime = 0
  private _duration = 0
  private _volume = 0.7
  private _audioUrl = ''

  private timerId: ReturnType<typeof setInterval> | null = null
  private endedHandler: (() => void) | null = null
  private listener: StateListener | null = null

  get state(): AudioEngineState {
    return {
      isPlaying: this._isPlaying,
      currentTime: this._currentTime,
      duration: this._duration,
      volume: this._volume,
    }
  }

  private notify() {
    this.listener?.(this.state)
  }

  ensureContext() {
    // no-op: HTMLAudioElement handles autoplay policy natively
  }

  onStateChange(listener: StateListener) {
    this.listener = listener
  }

  private startTimer() {
    this.stopTimer()
    this.timerId = setInterval(() => {
      if (this.audio && this._isPlaying) {
        this._currentTime = this.audio.currentTime
        if (this.audio.ended) {
          this._isPlaying = false
          this.stopTimer()
          this.endedHandler?.()
          this.notify()
          return
        }
        this.notify()
      }
    }, 100)
  }

  private stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }
  }

  private cleanupAudio() {
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
      this.audio = null
    }
  }

  /**
   * 获取可视化用的频率数据（合成数据，无需 AudioContext）
   */
  getFrequencyData(): Uint8Array {
    if (!this._isPlaying) {
      return new Uint8Array(32).fill(0)
    }
    // 基于当前播放进度生成变化的频率数据
    const data = new Uint8Array(32)
    const t = this._currentTime
    for (let i = 0; i < 32; i++) {
      // 不同频率带根据进度波动
      const f = (i / 32) * 10 + t * 2
      const v = Math.abs(Math.sin(f)) * 0.3 +
                Math.abs(Math.sin(f * 1.7 + t)) * 0.3 +
                Math.abs(Math.sin(f * 0.3 + t * 0.5)) * 0.4
      data[i] = Math.min(255, Math.floor(v * 255))
    }
    return data
  }

  // ─── Public API ────────────────────────────────────

  async play(audioUrl: string, duration: number) {
    this.stop()

    if (!audioUrl) {
      // 没有真实音频 URL 时不要伪造播放，避免把 fallback 音误认为真实歌曲。
      this._duration = duration
      this._isPlaying = false
      this.notify()
      return
    }

    // 网易云 CDN 音频通过服务端代理转发，绕过浏览器 CDN 限制
    const finalUrl = audioUrl.includes('music.126.net')
      ? `/api/music/stream/proxy?url=${encodeURIComponent(audioUrl)}`
      : audioUrl

    this._audioUrl = audioUrl
    this._duration = duration
    this._currentTime = 0

    const audio = new Audio(finalUrl)
    audio.volume = this._volume
    audio.preload = 'auto'

    // 以实际音频时长为准（覆盖 metadata 里的假时长）
    audio.addEventListener('loadedmetadata', () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        this._duration = audio.duration
        this.notify()
      }
    })

    // 播放结束后的回调
    audio.addEventListener('ended', () => {
      this._isPlaying = false
      this.stopTimer()
      this.endedHandler?.()
      this.notify()
    })

    // 加载出错时回退到 mock 振荡器
    audio.addEventListener('error', () => {
      console.warn('Audio source failed to load:', audioUrl)
      this._isPlaying = false
      this.cleanupAudio()
      this.stopTimer()
      this.notify()
    })

    this.audio = audio
    this._isPlaying = true

    try {
      await audio.play()
      this.startTimer()
    } catch (err) {
      console.warn('Audio play failed:', err)
      this._isPlaying = false
      this.cleanupAudio()
      this.notify()
    }

    this.notify()
  }

  /**
   * 当真实音频不可用时的回退方案：用振荡器生成模拟音乐
   */
  private fallbackOsc: OscillatorNode | null = null
  private fallbackCtx: AudioContext | null = null
  private fallbackTimer: ReturnType<typeof setInterval> | null = null
  private fallbackStartTime = 0
  private fallbackPausedAt = 0

  private fallbackToOscillator() {
    try {
      const ctx = new AudioContext()
      const gain = ctx.createGain()
      gain.gain.value = this._volume * 0.1
      gain.connect(ctx.destination)

      // 生成简单旋律
      let seed = 0
      for (let i = 0; i < this._audioUrl.length; i++) {
        seed = ((seed << 5) - seed) + this._audioUrl.charCodeAt(i)
        seed |= 0
      }
      const notes = [262, 294, 330, 349, 392, 440, 494, 523]
      let noteIdx = 0

      const playNote = () => {
        if (!ctx) return
        const freq = notes[Math.abs(seed + noteIdx) % notes.length]
        const osc = ctx.createOscillator()
        osc.type = 'triangle'
        osc.frequency.value = freq
        osc.connect(gain)
        osc.start()
        osc.stop(ctx.currentTime + 1.8)
        noteIdx++
        this.fallbackTimer = setTimeout(playNote, 2000)
      }

      playNote()

      this.fallbackCtx = ctx
      this.fallbackStartTime = ctx.currentTime
      this._isPlaying = true
      this.startTimer()

      // 覆盖 timer 以使用 ctx 的时间
      this.stopTimer()
      this.timerId = setInterval(() => {
        if (ctx && this._isPlaying) {
          this._currentTime = ctx.currentTime - this.fallbackStartTime
          if (this._currentTime >= this._duration) {
            this._currentTime = this._duration
            this.stop()
            this.notify()
            return
          }
          this.notify()
        }
      }, 100)

      this.notify()
    } catch (e) {
      console.error('Fallback oscillator also failed:', e)
    }
  }

  private stopFallback() {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer)
      this.fallbackTimer = null
    }
    if (this.fallbackCtx) {
      this.fallbackCtx.close()
      this.fallbackCtx = null
    }
    this.fallbackOsc = null
  }

  pause() {
    if (!this._isPlaying) return

    if (this.audio) {
      this._isPlaying = false
      this.audio.pause()
      this.stopTimer()
      this.notify()
    } else if (this.fallbackCtx) {
      this._isPlaying = false
      this.fallbackPausedAt = this._currentTime
      this.fallbackCtx.suspend()
      if (this.fallbackTimer) {
        clearTimeout(this.fallbackTimer)
        this.fallbackTimer = null
      }
      this.stopTimer()
      this.notify()
    }
  }

  async resume() {
    if (this._isPlaying) return

    if (this.audio) {
      this._isPlaying = true
      try {
        await this.audio.play()
        this.startTimer()
      } catch (err) {
        console.error('Audio resume failed:', err)
        this._isPlaying = false
      }
      this.notify()
    } else if (this.fallbackCtx) {
      await this.fallbackCtx.resume()
      this.fallbackStartTime = this.fallbackCtx.currentTime - this.fallbackPausedAt
      this._isPlaying = true
      this.startTimer()
      // restart oscillator
      this.fallbackToOscillator()
      this.notify()
    }
  }

  seek(time: number) {
    const t = Math.max(0, Math.min(time, this._duration))

    if (this.audio) {
      this.audio.currentTime = t
    }

    this._currentTime = t
    if (this.fallbackCtx) {
      this.fallbackPausedAt = t
      this.fallbackStartTime = this.fallbackCtx.currentTime - t
    }
    this.notify()
  }

  setVolume(volume: number) {
    this._volume = Math.max(0, Math.min(1, volume))
    if (this.audio) {
      this.audio.volume = this._volume
    }
    this.notify()
  }

  setOnEnded(handler: () => void) {
    this.endedHandler = handler
  }

  stop() {
    this._isPlaying = false
    this._currentTime = 0
    this._duration = 0
    this._audioUrl = ''

    this.stopTimer()
    this.cleanupAudio()
    this.stopFallback()

    this.notify()
  }

  destroy() {
    this.stop()
    this.listener = null
  }
}

// 全局单例
let globalEngine: AudioEngine | null = null

export function getAudioEngine(): AudioEngine {
  if (!globalEngine) {
    globalEngine = new AudioEngine()
  }
  return globalEngine
}

export function destroyAudioEngine() {
  if (globalEngine) {
    globalEngine.destroy()
    globalEngine = null
  }
}
