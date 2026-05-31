import { NextResponse } from 'next/server'
import { getSessionUserId } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const trackId = typeof body?.trackId === 'string' ? body.trackId : ''
    const trackTitle = typeof body?.trackTitle === 'string' ? body.trackTitle : ''
    const trackArtist = typeof body?.trackArtist === 'string' ? body.trackArtist : ''
    const trackCover = typeof body?.trackCover === 'string' ? body.trackCover : ''
    const trackDuration = typeof body?.trackDuration === 'number' ? body.trackDuration : 0

    if (!trackId || !trackTitle || !trackArtist) {
      return NextResponse.json({ error: '歌曲信息不完整' }, { status: 400 })
    }

    const likedTrack = await prisma.likedTrack.upsert({
      where: {
        userId_trackId: {
          userId,
          trackId,
        },
      },
      update: {
        trackTitle,
        trackArtist,
        trackCover,
        trackDuration,
        likedAt: new Date(),
      },
      create: {
        userId,
        trackId,
        trackTitle,
        trackArtist,
        trackCover,
        trackDuration,
      },
    })

    return NextResponse.json({ liked: true, track: likedTrack })
  } catch (error) {
    console.error('Like track error:', error)
    return NextResponse.json({ error: '收藏失败' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const trackId = typeof body?.trackId === 'string' ? body.trackId : ''

    if (!trackId) {
      return NextResponse.json({ error: '缺少歌曲 ID' }, { status: 400 })
    }

    await prisma.likedTrack.deleteMany({
      where: { userId, trackId },
    })

    return NextResponse.json({ liked: false })
  } catch (error) {
    console.error('Unlike track error:', error)
    return NextResponse.json({ error: '取消收藏失败' }, { status: 500 })
  }
}
