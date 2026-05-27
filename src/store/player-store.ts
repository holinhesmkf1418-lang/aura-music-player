'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Track, EqualizerSettings } from '@/lib/types'
import { getAudioEngine } from '@/lib/audio-engine'

interface PlayerStore {
  currentTrack: Track | null
  queue: Track[]
  queueIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  repeatMode: 'off' | 'one' | 'all'
  isShuffled: boolean
  quality: 'standard' | 'high' | 'lossless'
  equalizer: EqualizerSettings
  showEqualizer: boolean
  showLyrics: boolean
  searchedTracks: Track[]

  play: (track: Track, tracks?: Track[]) => void
  pause: () => void
  resume: () => void
  next: () => void
  prev: () => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleRepeat: () => void
  toggleShuffle: () => void
  setQuality: (quality: 'standard' | 'high' | 'lossless') => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  setEqualizer: (eq: Partial<EqualizerSettings>) => void
  toggleEqualizer: () => void
  toggleLyrics: () => void
  setSearchedTracks: (tracks: Track[]) => void
}

async function resolvePlayableUrl(track: Track): Promise<string> {
  if (track.audioUrl) return track.audioUrl

  try {
    const response = await fetch(`/api/music/stream?id=${encodeURIComponent(track.id)}`)
    if (!response.ok) return ''
    const data = await response.json()
    return typeof data?.url === 'string' ? data.url : ''
  } catch {
    return ''
  }
}

export const usePlayerStore = create<PlayerStore>()(persist((set, get) => ({
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  repeatMode: 'off',
  isShuffled: false,
  quality: 'standard',
  equalizer: { bass: 0, mid: 0, treble: 0, preset: 'normal' },
  showEqualizer: false,
  showLyrics: false,
  searchedTracks: [],

  play: async (track, tracks) => {
    // 在用户手势中直接开始播放音频（浏览器要求）
    const resolvedAudioUrl = await resolvePlayableUrl(track)
    const playableTrack = resolvedAudioUrl && resolvedAudioUrl !== track.audioUrl
      ? { ...track, audioUrl: resolvedAudioUrl }
      : track

    if (!resolvedAudioUrl) {
      console.warn('No playable audio URL for track:', track.id)
      set({
        currentTrack: track,
        isPlaying: false,
        currentTime: 0,
        duration: track.duration,
      })
      return
    }

    getAudioEngine().play(resolvedAudioUrl, playableTrack.duration)

    if (tracks) {
      const nextTracks = tracks.map((item) => item.id === playableTrack.id ? playableTrack : item)
      const index = nextTracks.findIndex(t => t.id === playableTrack.id)
      set({
        currentTrack: playableTrack,
        queue: nextTracks,
        queueIndex: index >= 0 ? index : 0,
        isPlaying: true,
        currentTime: 0,
        duration: playableTrack.duration,
      })
    } else {
      set({
        currentTrack: playableTrack,
        isPlaying: true,
        currentTime: 0,
        duration: playableTrack.duration,
      })
    }
  },

  pause: () => {
    getAudioEngine().pause()
    set({ isPlaying: false })
  },
  resume: () => {
    getAudioEngine().resume()
    set({ isPlaying: true })
  },

  next: () => {
    const state = get()
    if (state.queue.length === 0) return

    let nextIndex: number
    if (state.repeatMode === 'one') {
      nextIndex = state.queueIndex
    } else if (state.isShuffled) {
      // 随机但不重复同一首
      if (state.queue.length <= 1) {
        nextIndex = 0
      } else {
        do {
          nextIndex = Math.floor(Math.random() * state.queue.length)
        } while (nextIndex === state.queueIndex)
      }
    } else {
      nextIndex = state.queueIndex + 1
      if (nextIndex >= state.queue.length) {
        if (state.repeatMode === 'all') {
          nextIndex = 0
        } else {
          set({ isPlaying: false })
          return
        }
      }
    }

    const nextTrack = state.queue[nextIndex]
    getAudioEngine().play(nextTrack.audioUrl || '', nextTrack.duration)

    set({
      queueIndex: nextIndex,
      currentTrack: nextTrack,
      currentTime: 0,
      duration: nextTrack.duration,
      isPlaying: true,
    })
  },

  prev: () => {
    const state = get()
    if (state.queue.length === 0) return

    let prevIndex: number
    if (state.currentTime > 3) {
      prevIndex = state.queueIndex
    } else {
      prevIndex = state.queueIndex - 1
      if (prevIndex < 0) {
        prevIndex = state.queue.length - 1
      }
    }

    const prevTrack = state.queue[prevIndex]
    getAudioEngine().play(prevTrack.audioUrl || '', prevTrack.duration)

    set({
      queueIndex: prevIndex,
      currentTrack: prevTrack,
      currentTime: 0,
      duration: prevTrack.duration,
      isPlaying: true,
    })
  },

  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  toggleRepeat: () =>
    set((state) => {
      const modes: ('off' | 'one' | 'all')[] = ['off', 'one', 'all']
      const currentIndex = modes.indexOf(state.repeatMode)
      return { repeatMode: modes[(currentIndex + 1) % modes.length] }
    }),

  toggleShuffle: () => set((state) => ({ isShuffled: !state.isShuffled })),
  setQuality: (quality) => set({ quality }),

  addToQueue: (track) =>
    set((state) => {
      if (state.queue.some((t) => t.id === track.id)) return state
      return { queue: [...state.queue, track] }
    }),

  removeFromQueue: (index) =>
    set((state) => ({
      queue: state.queue.filter((_, i) => i !== index),
      queueIndex: index < state.queueIndex ? state.queueIndex - 1 : state.queueIndex,
    })),

  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  setEqualizer: (eq) =>
    set((state) => ({
      equalizer: { ...state.equalizer, ...eq },
    })),

  toggleEqualizer: () => set((state) => ({ showEqualizer: !state.showEqualizer })),
  toggleLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
  setSearchedTracks: (tracks) => set({ searchedTracks: tracks }),
}), {
  name: 'aura-player-settings',
  partialize: (state) => ({
    volume: state.volume,
    repeatMode: state.repeatMode,
    isShuffled: state.isShuffled,
    equalizer: state.equalizer,
  }),
}))
