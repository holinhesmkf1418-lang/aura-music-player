import { NextResponse } from 'next/server'
import { handleMusicAgent } from '@/lib/agent/handler'
import type { AgentContext } from '@/lib/agent/types'
import { getSessionUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * 安全校验前端传来的 context，确保字段存在
 */
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
    feedback: Array.isArray(ctx.feedback) ? ctx.feedback.filter((f): f is string => typeof f === 'string') : [],
    titleExclude: Array.isArray(ctx.titleExclude) ? ctx.titleExclude.filter((t): t is string => typeof t === 'string') : undefined,
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message : ''
    const history = Array.isArray(body?.history) ? body.history : []

    if (!message) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
    }

    // 获取 Cookie
    const userId = await getSessionUserId()
    let neteaseCookie: string | undefined
    if (userId) {
      const prefs = await prisma.userPreference.findUnique({
        where: { userId },
      })
      if (prefs?.neteaseCookie) neteaseCookie = prefs.neteaseCookie
    }

    const result = await handleMusicAgent({
      message,
      history,
      context: sanitizeContext(body.context),
      userId: userId || undefined,
      neteaseCookie,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: '处理请求失败' },
      { status: 500 },
    )
  }
}
