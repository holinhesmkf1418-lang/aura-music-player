import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ playlists: [] })
  }

  const playlists = await prisma.playlist.findMany({
    where: { userId },
    include: {
      tracks: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json({ playlists })
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const { name } = await request.json()
    if (!name) {
      return NextResponse.json({ error: '请输入歌单名称' }, { status: 400 })
    }

    const playlist = await prisma.playlist.create({
      data: { name, userId },
      include: { tracks: true },
    })

    return NextResponse.json({ playlist }, { status: 201 })
  } catch (error) {
    console.error('Create playlist error:', error)
    return NextResponse.json(
      { error: '创建歌单失败' },
      { status: 500 }
    )
  }
}
