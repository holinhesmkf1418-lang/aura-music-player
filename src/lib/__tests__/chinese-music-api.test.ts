import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({
  searchMock: vi.fn(),
  urlMock: vi.fn(),
  picMock: vi.fn(),
}))

vi.mock('@meting/core', () => {
  return {
    default: class MockMeting {
      header = { Cookie: '' }

      site() {}

      format() {}

      search(query: string, options?: unknown) {
        return state.searchMock(query, options)
      }

      url(id: string, br: number) {
        return state.urlMock(id, br)
      }

      pic(id: string, size: number) {
        return state.picMock(id, size)
      }
    },
  }
})

import { searchMusic } from '../chinese-music-api'

describe('searchMusic', () => {
  beforeEach(() => {
    state.searchMock.mockReset()
    state.urlMock.mockReset()
    state.picMock.mockReset()
  })

  it('hydrates raw netease songs with duration and playable url', async () => {
    state.searchMock.mockResolvedValueOnce(JSON.stringify({
      result: {
        songs: [{
          id: 1,
          name: '晴天',
          dt: 276000,
          ar: [{ name: '周杰伦' }],
          al: { name: '叶惠美', picUrl: 'http://cover.test/jay.jpg' },
        }],
      },
    }))
    state.urlMock.mockResolvedValue(JSON.stringify({ url: 'http://music.126.net/song.mp3', size: 1, br: 128000 }))

    const tracks = await searchMusic('周杰伦', 'netease', 10, 'cookie')

    expect(tracks).toHaveLength(1)
    expect(tracks[0]).toMatchObject({
      title: '晴天',
      artist: '周杰伦',
      album: '叶惠美',
      duration: 276,
      cover: 'https://cover.test/jay.jpg',
      audioUrl: 'https://music.126.net/song.mp3',
    })
  })

  it('returns up to the requested limit instead of stopping around five tracks', async () => {
    state.searchMock
      .mockResolvedValueOnce(JSON.stringify({ result: { songs: [] } }))
      .mockResolvedValueOnce(JSON.stringify(
        Array.from({ length: 12 }, (_, index) => ({
          id: `${index + 1}`,
          name: `Song ${index + 1}`,
          artist: ['Singer'],
          album: 'Album',
          pic_id: `pic-${index + 1}`,
          url_id: `url-${index + 1}`,
          lyric_id: `lyric-${index + 1}`,
          source: 'netease',
        })),
      ))

    state.urlMock.mockImplementation((id: string) => Promise.resolve(JSON.stringify({
      url: `http://music.126.net/${id}.mp3`,
      size: 1,
      br: 128000,
    })))
    state.picMock.mockImplementation((id: string) => Promise.resolve(JSON.stringify({
      url: `http://cover.test/${id}.jpg`,
    })))

    const tracks = await searchMusic('测试', 'netease', 10, 'cookie')

    expect(tracks).toHaveLength(10)
    expect(tracks.every((track) => (track.audioUrl || '').startsWith('https://music.126.net/'))).toBe(true)
  })
})
