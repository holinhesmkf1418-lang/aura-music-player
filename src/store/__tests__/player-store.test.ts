import { beforeEach, describe, expect, it } from 'vitest'
import type { Track } from '@/lib/types'
import { usePlayerStore } from '../player-store'

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'track-1',
    title: '晴天',
    artist: '周杰伦',
    cover: '',
    duration: 240,
    ...overrides,
  }
}

describe('player store', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      queueIndex: -1,
      repeatMode: 'off',
      isShuffled: false,
      volume: 0.7,
      equalizer: { bass: 0, mid: 0, treble: 0, preset: 'normal' },
    })
  })

  it('does not add the same track to the queue twice', () => {
    const track = makeTrack()

    usePlayerStore.getState().addToQueue(track)
    usePlayerStore.getState().addToQueue({ ...track, title: '重复标题不应追加' })

    expect(usePlayerStore.getState().queue).toEqual([track])
  })
})
