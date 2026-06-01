import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chatWithDeepSeek } from '../deepseek'

const originalApiKey = process.env.DEEPSEEK_API_KEY
const originalModel = process.env.DEEPSEEK_MODEL

function mockDeepSeekResponse(content = 'ok') {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
    }),
  })) as unknown as typeof fetch)
}

function lastRequestBody() {
  const fetchMock = vi.mocked(fetch)
  const init = fetchMock.mock.calls[0]?.[1] as RequestInit
  return JSON.parse(String(init.body))
}

describe('DeepSeek client', () => {
  beforeEach(() => {
    process.env.DEEPSEEK_API_KEY = 'test-key'
    delete process.env.DEEPSEEK_MODEL
    mockDeepSeekResponse()
  })

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.DEEPSEEK_API_KEY
    } else {
      process.env.DEEPSEEK_API_KEY = originalApiKey
    }

    if (originalModel === undefined) {
      delete process.env.DEEPSEEK_MODEL
    } else {
      process.env.DEEPSEEK_MODEL = originalModel
    }

    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('uses DeepSeek V4 Pro thinking mode at high reasoning effort by default', async () => {
    await chatWithDeepSeek([{ role: 'user', content: '推荐几首夜跑歌' }])

    expect(lastRequestBody()).toMatchObject({
      model: 'deepseek-v4-pro',
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
    })
    expect(lastRequestBody()).not.toHaveProperty('temperature')
  })

  it('allows overriding reasoning effort and max tokens', async () => {
    await chatWithDeepSeek(
      [{ role: 'user', content: '推荐几首夜跑歌' }],
      undefined,
      { reasoningEffort: 'max', maxTokens: 700 },
    )

    expect(lastRequestBody()).toMatchObject({
      reasoning_effort: 'max',
      max_tokens: 700,
    })
  })

  it('allows overriding the DeepSeek model through DEEPSEEK_MODEL', async () => {
    process.env.DEEPSEEK_MODEL = 'deepseek-v4-flash'

    await chatWithDeepSeek([{ role: 'user', content: '推荐几首夜跑歌' }])

    expect(lastRequestBody().model).toBe('deepseek-v4-flash')
  })
})
