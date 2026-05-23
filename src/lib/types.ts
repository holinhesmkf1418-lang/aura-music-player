export interface Track {
  id: string
  title: string
  artist: string
  cover: string
  duration: number
  audioUrl?: string
  album?: string
  genre?: string
}

export interface Playlist {
  id: string
  name: string
  coverUrl?: string
  userId?: string
  tracks: PlaylistTrack[]
  createdAt: string
}

export interface PlaylistTrack {
  id: string
  trackId: string
  trackTitle: string
  trackArtist: string
  trackCover: string
  trackDuration: number
  addedAt: string
  sortOrder: number
}

export interface User {
  id: string
  username: string
  email: string
  avatar?: string
}

export interface UserPreferences {
  genres: string[]
  eras: string[]
  artists: string[]
}

export interface PlayerState {
  currentTrack: Track | null
  queue: Track[]
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  repeatMode: 'off' | 'one' | 'all'
  isShuffled: boolean
  quality: 'standard' | 'high' | 'lossless'
}

export interface EqualizerSettings {
  bass: number
  mid: number
  treble: number
  preset: string
}

export type GenreTag = {
  id: string
  label: string
  emoji: string
}

export const GENRE_TAGS: GenreTag[] = [
  { id: 'rock', label: '摇滚', emoji: '🎸' },
  { id: 'pop', label: '流行', emoji: '🎤' },
  { id: 'electronic', label: '电子', emoji: '🎹' },
  { id: 'hiphop', label: '说唱', emoji: '🎧' },
  { id: 'jazz', label: '爵士', emoji: '🎷' },
  { id: 'classical', label: '古典', emoji: '🎻' },
  { id: 'rnb', label: 'R&B', emoji: '🎵' },
  { id: 'folk', label: '民谣', emoji: '🪕' },
  { id: 'metal', label: '金属', emoji: '🤘' },
  { id: 'latin', label: '拉丁', emoji: '💃' },
  { id: 'indie', label: '独立', emoji: '🎪' },
  { id: 'country', label: '乡村', emoji: '🤠' },
]

export const ERA_TAGS: GenreTag[] = [
  { id: '80s', label: '80年代', emoji: '📼' },
  { id: '90s', label: '90年代', emoji: '💿' },
  { id: '00s', label: '00年代', emoji: '📱' },
  { id: '10s', label: '10年代', emoji: '🎧' },
  { id: '20s', label: '20年代', emoji: '🚀' },
]

export const EQ_PRESETS: Record<string, { bass: number; mid: number; treble: number }> = {
  normal: { bass: 0, mid: 0, treble: 0 },
  pop: { bass: 2, mid: 3, treble: 2 },
  rock: { bass: 4, mid: 2, treble: 3 },
  jazz: { bass: 3, mid: 1, treble: 4 },
  classical: { bass: 1, mid: 2, treble: 5 },
  electronic: { bass: 5, mid: 3, treble: 3 },
  hiphop: { bass: 6, mid: 2, treble: 1 },
  vocal: { bass: 1, mid: 5, treble: 4 },
}
