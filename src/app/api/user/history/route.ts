import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ history: [] })
  }

  const history = await prisma.listeningHistory.findMany({
    where: { userId },
    orderBy: { listenedAt: 'desc' },
    take: 50,
  })

  return NextResponse.json({ history })
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const { trackId, trackTitle, trackArtist, trackCover } = await request.json()

    await prisma.listeningHistory.create({
      data: {
        userId,
        trackId,
        trackTitle,
        trackArtist,
        trackCover,
      },
    })

    return NextResponse.json({ message: '已记录' }, { status: 201 })
  } catch (error) {
    console.error('Record history error:', error)
    return NextResponse.json(
      { error: '记录失败' },
      { status: 500 }
    )
  }
}
