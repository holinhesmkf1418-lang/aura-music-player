import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Track } from '@/lib/types'
import type { AgentContext } from '../types'

// Mock chatWithDeepSeek before importing modules that use it
vi.mock('@/lib/deepseek', () => ({
  chatWithDeepSeek: vi.fn(),
}))

import { chatWithDeepSeek } from '@/lib/deepseek'
import { parseIntent } from '../intent'
import { createSearchPlan } from '../query-planner'

const mockChat = vi.mocked(chatWithDeepSeek)

// 辅助 Track 工厂
function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: overrides.id || 'track-1',
    title: overrides.title || '测试歌曲',
    artist: overrides.artist || '测试歌手',
    duration: overrides.duration || 240,
    cover: overrides.cover || '',
    audioUrl: overrides.audioUrl || '',
    album: overrides.album || undefined,
    genre: overrides.genre || undefined,
    ...overrides,
  }
}

function makeContext(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    lastResults: [],
    excludedTrackIds: [],
    feedback: [],
    ...overrides,
  }
}

describe('Intent Pipeline (intent.ts → query-planner.ts)', () => {
  beforeEach(() => {
    mockChat.mockReset()
  })

  // ============================================================
  // 确定性匹配（不经过 DeepSeek）
  // ============================================================

  it('"我现在有点无聊" → new_recommendation (vibe)', async () => {
    mockChat.mockResolvedValue('{}')

    const parsed = await parseIntent('我现在有点无聊')

    expect(parsed.intent).toBe('new_recommendation')
    expect(parsed.requestType).toBe('vibe')
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('"不是歌名叫无聊啊" → adjust_recommendations (vibe)', async () => {
    mockChat.mockResolvedValue('{}')

    const parsed = await parseIntent('不是歌名叫无聊啊')

    expect(parsed.intent).toBe('adjust_recommendations')
    expect(parsed.requestType).toBe('vibe')
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('"播放第二首" → play_track (control)', async () => {
    const parsed = await parseIntent('播放第二首')

    expect(parsed.intent).toBe('play_track')
    expect(parsed.requestType).toBe('control')
    expect(parsed.referencedTrackIndex).toBe(1)
  })

  it('"类似第一首" → similar_to_track (similar)', async () => {
    const parsed = await parseIntent('类似第一首')

    expect(parsed.intent).toBe('similar_to_track')
    expect(parsed.requestType).toBe('similar')
    expect(parsed.referencedTrackIndex).toBe(0)
  })

  it('"不要歌名带夏天" → adjust_recommendations + titleExclude["夏天"]', async () => {
    const parsed = await parseIntent('不要歌名带夏天')

    expect(parsed.intent).toBe('adjust_recommendations')
    expect(parsed.requestType).toBe('vibe')
    expect(parsed.titleExclude).toEqual(['夏天'])
  })

  it('"换几首" → refresh_recommendations (vibe)', async () => {
    const parsed = await parseIntent('换几首')

    expect(parsed.intent).toBe('refresh_recommendations')
    expect(parsed.requestType).toBe('vibe')
  })

  it('"下一首" → next_track (control)', async () => {
    const parsed = await parseIntent('下一首')

    expect(parsed.intent).toBe('next_track')
    expect(parsed.requestType).toBe('control')
  })

  it('"加入队列" → add_to_queue (control)', async () => {
    const parsed = await parseIntent('加入队列')

    expect(parsed.intent).toBe('add_to_queue')
    expect(parsed.requestType).toBe('control')
  })

  it('"加入第二首" → add_to_queue + referencedTrackIndex', async () => {
    const parsed = await parseIntent('加入第二首')

    expect(parsed.intent).toBe('add_to_queue')
    expect(parsed.requestType).toBe('control')
    expect(parsed.referencedTrackIndex).toBe(1)
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('"我想听周杰伦的歌" → artist fast path，不调用 DeepSeek', async () => {
    mockChat.mockResolvedValue('{}')

    const parsed = await parseIntent('我想听周杰伦的歌')

    expect(parsed.intent).toBe('new_recommendation')
    expect(parsed.requestType).toBe('artist')
    expect(parsed.artists).toEqual(['周杰伦'])
    expect(parsed.needsDeepRank).toBe(false)
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('"我想听邓紫琪的歌" → 归一为邓紫棋 artist fast path', async () => {
    mockChat.mockResolvedValue('{}')

    const parsed = await parseIntent('我想听邓紫琪的歌')

    expect(parsed.intent).toBe('new_recommendation')
    expect(parsed.requestType).toBe('artist')
    expect(parsed.artists).toEqual(['邓紫棋'])
    expect(mockChat).not.toHaveBeenCalled()
  })

  it('"周杰伦" → 裸歌手名 fast path，不调用 DeepSeek', async () => {
    mockChat.mockResolvedValue('{}')

    const parsed = await parseIntent('周杰伦')

    expect(parsed.intent).toBe('new_recommendation')
    expect(parsed.requestType).toBe('artist')
    expect(parsed.artists).toEqual(['周杰伦'])
    expect(parsed.needsDeepRank).toBe(false)
    expect(mockChat).not.toHaveBeenCalled()
  })

  // ============================================================
  // DeepSeek 匹配
  // ============================================================

  it('"再来点中文的" → adjust_recommendations (language=zh)', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      intent: 'adjust_recommendations',
      confidence: 0.85,
      requestType: 'vibe',
      language: 'zh',
      needsDeepRank: true,
    }))

    const parsed = await parseIntent('再来点中文的')

    expect(parsed.intent).toBe('adjust_recommendations')
    expect(parsed.language).toBe('zh')
  })

  it('"不要这么伤感" → adjust_recommendations', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      intent: 'adjust_recommendations',
      confidence: 0.8,
      requestType: 'vibe',
      mood: ['轻松', '愉快'],
      needsDeepRank: true,
    }))

    const parsed = await parseIntent('不要这么伤感')

    expect(parsed.intent).toBe('adjust_recommendations')
    expect(parsed.mood).toContain('轻松')
  })

  it('"最近有什么新歌" → new_recommendation (vibe)', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      intent: 'new_recommendation',
      confidence: 0.9,
      requestType: 'vibe',
      era: 'recent',
      needsDeepRank: false,
    }))

    const parsed = await parseIntent('最近有什么新歌')

    expect(parsed.intent).toBe('new_recommendation')
    expect(parsed.requestType).toBe('vibe')
  })

  // ============================================================
  // DeepSeek 失败 + unknown fallback
  // ============================================================

  it('DeepSeek 返回 null 时应 fallback（无上下文 → new_recommendation）', async () => {
    mockChat.mockResolvedValue(null!)

    const parsed = await parseIntent('来点好听的歌')

    // 无上下文时，unknown → new_recommendation + query: message
    expect(parsed.intent).toBe('new_recommendation')
  })

  it('DeepSeek 返回 null 且有历史推荐 → adjust_recommendations', async () => {
    mockChat.mockResolvedValue(null!)

    const ctx = {
      history: [],
      lastResults: [makeTrack({ id: '1', title: '晴天', artist: '周杰伦' })],
      topic: '流行',
      mood: ['轻松'],
      language: 'zh' as const,
    }

    const parsed = await parseIntent('再换几首别的', ctx)

    // 有历史结果 → adjust_recommendations
    expect(parsed.intent).toBe('adjust_recommendations')
  })

  it('纠偏语句 "不对，别这样" → adjust_recommendations（无历史也当调整）', async () => {
    mockChat.mockResolvedValue(null!)

    const parsed = await parseIntent('不对，别这样')

    // 纠偏语句即使是 unknown 也当调整
    expect(parsed.intent).toBe('adjust_recommendations')
  })

  // ============================================================
  // query-planner：控制类不生成搜索 query
  // ============================================================

  it('控制类意图 → createSearchPlan 返回空 queries', () => {
    const ctx = makeContext()
    const plan = createSearchPlan(ctx, {
      intent: 'play_track',
      confidence: 0.95,
      requestType: 'control',
      referencedTrackIndex: 0,
      needsDeepRank: false,
    })

    expect(plan.queries).toEqual([])
  })

  it('控制类意图 → next_track 返回空 queries', () => {
    const ctx = makeContext()
    const plan = createSearchPlan(ctx, {
      intent: 'next_track',
      confidence: 0.95,
      requestType: 'control',
      needsDeepRank: false,
    })

    expect(plan.queries).toEqual([])
  })

  // ============================================================
  // query-planner：similar 排除 seedTrack 自身
  // ============================================================

  it('similar_to_track → 排除 seedTrack 自身', () => {
    const seed = makeTrack({ id: 'seed-1', title: '晴天', artist: '周杰伦' })
    const ctx = makeContext({
      lastResults: [seed, makeTrack({ id: 'x', title: '其他' })],
      excludedTrackIds: ['old-1'],
    })

    const plan = createSearchPlan(
      ctx,
      {
        intent: 'similar_to_track',
        confidence: 0.85,
        requestType: 'similar',
        referencedTrackIndex: 0,
        needsDeepRank: true,
      },
      seed,
    )

    // 排除列表应包含 seedTrack.id
    expect(plan.excludeTrackIds).toContain('seed-1')
    expect(plan.excludeTrackIds).toContain('old-1')
    // 应生成多维查询
    expect(plan.queries.length).toBeGreaterThan(0)
    expect(plan.queries.some((q) => q.includes('周杰伦'))).toBe(true)
    expect(plan.queries.some((q) => q.includes('类似'))).toBe(true)
  })

  it('similar_to_track → 使用 seedTrack.genre 增加风格查询', () => {
    const seed = makeTrack({ id: 'seed-1', title: '夜曲', artist: '周杰伦', genre: '华语 R&B' })
    const ctx = makeContext({
      lastResults: [seed],
    })

    const plan = createSearchPlan(
      ctx,
      {
        intent: 'similar_to_track',
        confidence: 0.85,
        requestType: 'similar',
        referencedTrackIndex: 0,
        needsDeepRank: true,
      },
      seed,
    )

    expect(plan.queries.some((q) => q.includes('华语 R&B'))).toBe(true)
  })

  it('artist 请求 → 使用歌手名作为主查询，并传递 artist rankHints', () => {
    const ctx = makeContext()
    const plan = createSearchPlan(ctx, {
      intent: 'new_recommendation',
      confidence: 0.95,
      requestType: 'artist',
      artists: ['周杰伦'],
      needsDeepRank: false,
    })

    expect(plan.queries[0]).toBe('周杰伦')
    expect(plan.rankHints.artists).toEqual(['周杰伦'])
  })

  // ============================================================
  // query-planner：titleExclude 不进入 search query
  // ============================================================

  it('titleExclude 词不出现在搜索查询中', () => {
    const ctx = makeContext({ titleExclude: ['夏天'] })
    const plan = createSearchPlan(ctx, {
      intent: 'adjust_recommendations',
      confidence: 0.8,
      requestType: 'vibe',
      titleExclude: ['夏天'],
      needsDeepRank: true,
    })

    // queries 中不应包含被排除的词
    for (const q of plan.queries) {
      expect(q.toLowerCase()).not.toContain('夏天')
    }
    // titleExclude 应透传
    expect(plan.titleExclude).toContain('夏天')
  })

  // ============================================================
  // query-planner：refresh 排除旧结果
  // ============================================================

  it('refresh_recommendations → 排除旧结果且保留主题', () => {
    const ctx = makeContext({
      topic: '流行',
      lastResults: [
        makeTrack({ id: 'old-1' }),
        makeTrack({ id: 'old-2' }),
      ],
      excludedTrackIds: ['old-1', 'old-2'],
    })

    const plan = createSearchPlan(ctx, {
      intent: 'refresh_recommendations',
      confidence: 0.9,
      requestType: 'vibe',
      needsDeepRank: false,
    })

    // 应排除旧结果
    expect(plan.excludeTrackIds).toContain('old-1')
    expect(plan.excludeTrackIds).toContain('old-2')
    // 应保留 topic 作为搜索方向
    expect(plan.queries.length).toBeGreaterThan(0)
  })

  // ============================================================
  // White list 校验：DeepSeek 返回非法值被过滤
  // ============================================================

  it('DeepSeek 返回非法 intent 被回退为 unknown', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      intent: 'play_music_fast', // 非法值
      confidence: 0.9,
      requestType: 'control',
      needsDeepRank: false,
    }))

    const parsed = await parseIntent('播放快一点')

    // 非法 intent 被 validateParsedFields 过滤 → unknown
    // 无历史 → new_recommendation
    expect(parsed.intent).toBe('new_recommendation')
  })

  it('DeepSeek 返回非法 language 被丢弃', async () => {
    mockChat.mockResolvedValue(JSON.stringify({
      intent: 'new_recommendation',
      confidence: 0.8,
      requestType: 'vibe',
      language: 'fr', // 非法值
      needsDeepRank: false,
    }))

    const parsed = await parseIntent('来首法语歌')

    expect(parsed.language).toBeUndefined()
  })
})
