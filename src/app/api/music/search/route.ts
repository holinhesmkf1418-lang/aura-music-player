import { NextResponse } from 'next/server'
import { searchTracks, searchByGenre } from '@/lib/music-service'
import { getSessionUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const genre = searchParams.get('genre')
  const apiKey = searchParams.get('apiKey') || undefined

  // 获取当前用户的网易云 Cookie（如有）
  const userId = await getSessionUserId()
  let neteaseCookie: string | undefined
  if (userId) {
    const prefs = await prisma.userPreference.findUnique({ where: { userId } })
    if (prefs?.neteaseCookie) neteaseCookie = prefs.neteaseCookie
  }

  if (!query && !genre) {
    return NextResponse.json(
      { error: '请提供搜索关键词或风格' },
      { status: 400 }
    )
  }

  try {
    let tracks
    let explanation: string | undefined

    if (genre) {
      tracks = await searchByGenre(genre, apiKey)
    } else {
      const result = await searchTracks({ query: query!, apiKey, useDeepSeek: true, neteaseCookie })
      tracks = result.tracks
      explanation = result.explanation
    }

    return NextResponse.json({ tracks, explanation })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: '搜索失败' },
      { status: 500 }
    )
  }
}
