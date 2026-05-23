import { NextResponse } from 'next/server'
import { getRecommendations } from '@/lib/music-service'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getSessionUserId()

  let genres: string[] = []
  let artists: string[] = []
  let recentTracks: { title: string; artist: string }[] = []

  if (userId) {
    const [prefs, history] = await Promise.all([
      prisma.userPreference.findUnique({
        where: { userId },
      }),
      prisma.listeningHistory.findMany({
        where: { userId },
        orderBy: { listenedAt: 'desc' },
        take: 10,
        select: { trackTitle: true, trackArtist: true },
      }),
    ])

    if (prefs) {
      genres = JSON.parse(prefs.genres)
      artists = JSON.parse(prefs.artists)
    }

    recentTracks = history.map((h) => ({
      title: h.trackTitle,
      artist: h.trackArtist,
    }))
  }

  // 获取用户保存的网易云 Cookie
  const prefs = userId
    ? await prisma.userPreference.findUnique({ where: { userId } })
    : null
  const neteaseCookie = prefs?.neteaseCookie || undefined

  try {
    const tracks = await getRecommendations(genres, artists, recentTracks, undefined, undefined, neteaseCookie)
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json(
      { error: '获取推荐失败' },
      { status: 500 }
    )
  }
}
