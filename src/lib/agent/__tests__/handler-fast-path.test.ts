import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Track } from '@/lib/types'

vi.mock('@/lib/deepseek', () => ({
  chatWithDeepSeek: vi.fn(),
}))

vi.mock('../search', () => ({
  searchForPlan: vi.fn(),
}))

vi.mock('../rank', () => ({
  rankTracks: vi.fn(async (tracks: Track[]) => tracks),
}))

import { chatWithDeepSeek } from '@/lib/deepseek'
import { handleMusicAgent } from '../handler'
import { rankTracks } from '../rank'
import { searchForPlan } from '../search'

const mockChat = vi.mocked(chatWithDeepSeek)
const mockRankTracks = vi.mocked(rankTracks)
const mockSearchForPlan = vi.mocked(searchForPlan)

describe('music agent fast paths', () => {
  beforeEach(() => {
    mockChat.mockReset()
    mockRankTracks.mockClear()
    mockSearchForPlan.mockReset()
  })

  it('does not call DeepSeek parse or rank for a direct artist request', async () => {
    mockSearchForPlan.mockResolvedValue({
      tracks: [
        { id: '1', title: '晴天', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-1' },
        { id: '2', title: '稻香', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-2' },
      ],
      errors: [],
    })

    await handleMusicAgent({
      message: '我想听周杰伦的歌',
      history: [],
      context: null,
    })

    expect(mockChat).not.toHaveBeenCalled()
    expect(mockRankTracks).not.toHaveBeenCalled()
  })

  it('adds only the referenced result to queue when user names an index', async () => {
    const context = {
      lastResults: [
        { id: '1', title: '晴天', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-1' },
        { id: '2', title: '稻香', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-2' },
      ],
      excludedTrackIds: [],
      feedback: [],
    }

    const response = await handleMusicAgent({
      message: '加入第二首',
      history: [],
      context,
    })

    expect(response.actions).toEqual([
      { type: 'append_queue', tracks: [context.lastResults[1]] },
    ])
    expect(response.reply).toContain('稻香')
  })

  it('exposes search errors in debug payload', async () => {
    mockSearchForPlan.mockResolvedValue({
      tracks: [],
      errors: ['query "夜跑": SEARCH_NETWORK: netease unavailable'],
    })

    const response = await handleMusicAgent({
      message: '来点夜跑听的',
      history: [],
      context: null,
    })

    expect(response.debug?.searchErrors).toEqual([
      'query "夜跑": SEARCH_NETWORK: netease unavailable',
    ])
  })

  it('emits searching and ranking progress for recommendation requests', async () => {
    mockSearchForPlan.mockResolvedValue({
      tracks: [
        { id: '1', title: '夜曲', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-1' },
        { id: '2', title: '晴天', artist: '周杰伦', cover: '', duration: 0, audioUrl: 'url-2' },
      ],
      errors: [],
    })

    const events: string[] = []

    await handleMusicAgent({
      message: '来点夜跑听的',
      history: [],
      context: null,
      onProgress: (event) => {
        events.push(event.status)
      },
    })

    expect(events).toEqual(expect.arrayContaining(['searching', 'ranking']))
  })
})
