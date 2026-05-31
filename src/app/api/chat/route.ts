import { NextRequest, NextResponse } from 'next/server'
import { handleMusicAgent } from '@/lib/agent/handler'
import type { AgentContext, AgentFeedback, AgentProgressEvent, MusicAgentRequest } from '@/lib/agent/types'
import { getSessionUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 10
const CHAT_TIMEOUT_MS = 30_000

const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

class ChatTimeoutError extends Error {
  constructor() {
    super('Chat request timed out')
    this.name = 'ChatTimeoutError'
  }
}

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwardedFor || request.headers.get('x-real-ip') || 'anonymous'
}

function consumeRateLimit(key: string, now = Date.now()): boolean {
  for (const [storedKey, entry] of rateLimitStore) {
    if (entry.resetTime <= now) rateLimitStore.delete(storedKey)
  }

  const existing = rateLimitStore.get(key)
  if (!existing || existing.resetTime <= now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) return false
  existing.count += 1
  return true
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new ChatTimeoutError()), ms)
  })

  return Promise.race([
    promise.finally(() => {
      if (timeoutId) clearTimeout(timeoutId)
    }),
    timeout,
  ])
}

function sanitizeFeedback(raw: unknown): AgentFeedback[] {
  if (!Array.isArray(raw)) return []

  return raw.flatMap((item): AgentFeedback[] => {
    if (!item || typeof item !== 'object') return []
    const feedback = item as Record<string, unknown>
    if (feedback.action !== 'played' || typeof feedback.trackId !== 'string') return []

    return [{
      action: 'played',
      trackId: feedback.trackId,
      title: typeof feedback.title === 'string' ? feedback.title : undefined,
      artist: typeof feedback.artist === 'string' ? feedback.artist : undefined,
      at: typeof feedback.at === 'number' ? feedback.at : undefined,
    }]
  }).slice(-20)
}

function encodeSseEvent(event: AgentProgressEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

function streamMusicAgent(agentRequest: MusicAgentRequest): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentProgressEvent) => {
        controller.enqueue(encodeSseEvent(event))
      }

      try {
        send({ status: 'parsing' })
        const result = await withTimeout(
          handleMusicAgent({
            ...agentRequest,
            onProgress: (event) => send(event),
          }),
          CHAT_TIMEOUT_MS,
        )
        send({ status: 'done', data: result })
      } catch (error) {
        if (error instanceof ChatTimeoutError) {
          send({ status: 'error', error: '请求超时，请稍后重试' })
        } else {
          console.error('Chat stream error:', error)
          send({ status: 'error', error: '处理请求失败' })
        }
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  })
}

function sanitizeContext(raw: unknown): AgentContext | null {
  if (!raw || typeof raw !== 'object') return null
  const ctx = raw as Record<string, unknown>
  return {
    topic: typeof ctx.topic === 'string' ? ctx.topic : undefined,
    scene: typeof ctx.scene === 'string' ? ctx.scene : undefined,
    mood: Array.isArray(ctx.mood) ? ctx.mood.filter((m): m is string => typeof m === 'string') : undefined,
    genres: Array.isArray(ctx.genres) ? ctx.genres.filter((g): g is string => typeof g === 'string') : undefined,
    artists: Array.isArray(ctx.artists) ? ctx.artists.filter((a): a is string => typeof a === 'string') : undefined,
    language: typeof ctx.language === 'string' ? ctx.language as AgentContext['language'] : undefined,
    era: typeof ctx.era === 'string' ? ctx.era : undefined,
    energy: typeof ctx.energy === 'string' ? ctx.energy as AgentContext['energy'] : undefined,
    lastQuery: typeof ctx.lastQuery === 'string' ? ctx.lastQuery : undefined,
    lastSearchQueries: Array.isArray(ctx.lastSearchQueries) ? ctx.lastSearchQueries.filter((q): q is string => typeof q === 'string') : undefined,
    lastResults: Array.isArray(ctx.lastResults) ? ctx.lastResults : [],
    excludedTrackIds: Array.isArray(ctx.excludedTrackIds) ? ctx.excludedTrackIds.filter((id): id is string => typeof id === 'string') : [],
    feedback: sanitizeFeedback(ctx.feedback),
    titleExclude: Array.isArray(ctx.titleExclude) ? ctx.titleExclude.filter((t): t is string => typeof t === 'string') : undefined,
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getSessionUserId()
    const limitKey = userId ? `user:${userId}` : `ip:${getClientIp(request)}`

    if (!consumeRateLimit(limitKey)) {
      return NextResponse.json(
        { error: '请求过于频繁' },
        { status: 429 },
      )
    }

    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message : ''
    const history = Array.isArray(body?.history) ? body.history : []

    if (!message) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
    }

    let neteaseCookie: string | undefined
    if (userId) {
      const prefs = await prisma.userPreference.findUnique({
        where: { userId },
      })
      if (prefs?.neteaseCookie) neteaseCookie = prefs.neteaseCookie
    }

    const agentRequest: MusicAgentRequest = {
      message,
      history,
      context: sanitizeContext(body.context),
      userId: userId || undefined,
      neteaseCookie,
    }
    const wantsStream = request.headers.get('accept')?.includes('text/event-stream') || body?.stream === true

    if (wantsStream) {
      return streamMusicAgent(agentRequest)
    }

    const result = await withTimeout(
      handleMusicAgent(agentRequest),
      CHAT_TIMEOUT_MS,
    )

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof ChatTimeoutError) {
      return NextResponse.json(
        { error: '请求超时，请稍后重试' },
        { status: 504 },
      )
    }

    console.error('Chat error:', error)
    return NextResponse.json(
      { error: '处理请求失败' },
      { status: 500 },
    )
  }
}
