import { describe, expect, it } from 'vitest'
import { getActiveLyricIndex, parseLyrics } from '../lyrics'

describe('lyrics utilities', () => {
  it('parses timed LRC lines and sorts multiple timestamps', () => {
    const lines = parseLyrics(`
[ti:Example Song]
[00:12.50][00:42.00]第一句
[00:03.20]开场
`)

    expect(lines).toEqual([
      { time: 3.2, text: '开场' },
      { time: 12.5, text: '第一句' },
      { time: 42, text: '第一句' },
    ])
  })

  it('falls back to plain lyrics and skips metadata', () => {
    const lines = parseLyrics(`
ar:Someone
第一句
第二句
offset:0
`)

    expect(lines).toEqual([
      { time: null, text: '第一句' },
      { time: null, text: '第二句' },
    ])
  })

  it('finds the active timed lyric from playback time', () => {
    const lines = parseLyrics(`
[00:01.00]第一句
[00:04.00]第二句
[00:08.00]第三句
`)

    expect(getActiveLyricIndex(lines, 0, 20)).toBe(0)
    expect(getActiveLyricIndex(lines, 4.05, 20)).toBe(1)
    expect(getActiveLyricIndex(lines, 8.2, 20)).toBe(2)
  })

  it('estimates active plain lyric by progress when timestamps are missing', () => {
    const lines = parseLyrics('第一句\n第二句\n第三句\n第四句')

    expect(getActiveLyricIndex(lines, 0, 100)).toBe(0)
    expect(getActiveLyricIndex(lines, 52, 100)).toBe(2)
    expect(getActiveLyricIndex(lines, 99, 100)).toBe(3)
  })
})
