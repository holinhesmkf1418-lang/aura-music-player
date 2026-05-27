import { NextResponse } from 'next/server'
import { fetchTrackStreamUrl } from '@/lib/music-service'
import { getSessionUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackId = searchParams.get('id')

  if (!trackId) {
    return NextResponse.json(
      { error: '请提供歌曲 ID' },
      { status: 400 },
    )
  }

  try {
    const userId = await getSessionUserId()
    let neteaseCookie: string | undefined
    if (userId) {
      const prefs = await prisma.userPreference.findUnique({ where: { userId } })
      if (prefs?.neteaseCookie) neteaseCookie = prefs.neteaseCookie
    }

    const url = await fetchTrackStreamUrl(trackId, neteaseCookie)
    if (!url) {
      return NextResponse.json(
        { error: '无法获取播放链接' },
        { status: 404 },
      )
    }
    return NextResponse.json({ url })
  } catch (error) {
    console.error('Stream URL fetch error:', error)
    return NextResponse.json(
      { error: '获取播放链接失败' },
      { status: 500 },
    )
  }
}
