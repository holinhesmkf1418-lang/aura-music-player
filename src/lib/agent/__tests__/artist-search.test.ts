import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SearchPlan } from '../types'

vi.mock('@/lib/music-service', () => ({
  searchTracks: vi.fn(),
}))

import { searchTracks } from '@/lib/music-service'
import { searchForPlan } from '../search'

const mockSearchTracks = vi.mocked(searchTracks)

describe('artist search execution', () => {
  beforeEach(() => {
    mockSearchTracks.mockReset()
  })

  it('filters out tracks whose artist does not match the requested artist', async () => {
    mockSearchTracks.mockResolvedValue({
      tracks: [
        { id: '1', title: '一路向北', artist: '赵乃吉', cover: '', duration: 0, audioUrl: 'url-1' },
        { id: '2', title: '晴天', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-2' },
        { id: '3', title: '稻香', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-3' },
      ],
    })

    const plan: SearchPlan = {
      queries: ['周杰伦'],
      fallbackQueries: [],
      excludeTrackIds: [],
      rankHints: { artists: ['周杰伦'] },
    }

    const { tracks } = await searchForPlan(plan)

    expect(tracks.map((track) => track.title)).toEqual(['晴天', '稻香'])
  })

  it('filters out tracks without a playable audio url', async () => {
    mockSearchTracks.mockResolvedValue({
      tracks: [
        { id: '1', title: '稻香', artist: '周杰伦', cover: '', duration: 223, audioUrl: '' },
        { id: '2', title: '晴天', artist: '周杰伦', cover: '', duration: 276, audioUrl: 'https://music.126.net/song.mp3' },
      ],
    })

    const plan: SearchPlan = {
      queries: ['周杰伦'],
      fallbackQueries: [],
      excludeTrackIds: [],
      rankHints: { artists: ['周杰伦'] },
    }

    const { tracks } = await searchForPlan(plan)

    expect(tracks.map((track) => track.title)).toEqual(['晴天'])
  })

  it('prefers clean primary-artist tracks and uses fallback when initial results are weak', async () => {
    mockSearchTracks
      .mockResolvedValueOnce({
        tracks: [
          { id: '1', title: '布拉格广场', artist: '蔡依林 / 周杰伦', cover: '', duration: 0, audioUrl: 'url-1' },
          { id: '2', title: '想你就写信 (Live)', artist: '周杰伦 / 李硕', cover: '', duration: 0, audioUrl: 'url-2' },
        ],
      })
      .mockResolvedValueOnce({
        tracks: [
          { id: '3', title: '兰亭序', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-3' },
          { id: '4', title: '青花瓷', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-4' },
          { id: '5', title: '夜曲', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-5' },
          { id: '6', title: '稻香', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-6' },
          { id: '7', title: '晴天', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-7' },
        ],
      })

    const plan: SearchPlan = {
      queries: ['周杰伦'],
      fallbackQueries: ['周杰伦 热门歌曲'],
      excludeTrackIds: [],
      rankHints: { artists: ['周杰伦'] },
    }

    const { tracks } = await searchForPlan(plan)

    expect(mockSearchTracks).toHaveBeenCalledTimes(2)
    expect(tracks.slice(0, 5).map((track) => track.title)).toEqual(['兰亭序', '青花瓷', '夜曲', '稻香', '晴天'])
  })

  it('returns search errors when an upstream query throws', async () => {
    mockSearchTracks
      .mockRejectedValueOnce(new Error('SEARCH_NETWORK: netease unavailable'))
      .mockResolvedValueOnce({
        tracks: [
          { id: '1', title: '晴天', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-1' },
        ],
      })

    const plan: SearchPlan = {
      queries: ['周杰伦'],
      fallbackQueries: ['周杰伦 热门歌曲'],
      excludeTrackIds: [],
      rankHints: { artists: ['周杰伦'] },
    }

    const { tracks, errors } = await searchForPlan(plan)

    expect(tracks.map((track) => track.title)).toEqual(['晴天'])
    expect(errors).toEqual([
      'query "周杰伦": SEARCH_NETWORK: netease unavailable',
    ])
  })
})
