import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const playlist = await prisma.playlist.findUnique({
    where: { id },
    include: {
      tracks: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  })

  if (!playlist) {
    return NextResponse.json({ error: '歌单不存在' }, { status: 404 })
  }

  return NextResponse.json({ playlist })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { id } = await params
  const { trackId, trackTitle, trackArtist, trackCover, trackDuration } = await request.json()

  const playlist = await prisma.playlist.findUnique({ where: { id } })
  if (!playlist || playlist.userId !== userId) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  const maxSort = await prisma.playlistTrack.aggregate({
    where: { playlistId: id },
    _max: { sortOrder: true },
  })

  const track = await prisma.playlistTrack.create({
    data: {
      playlistId: id,
      trackId,
      trackTitle,
      trackArtist,
      trackCover,
      trackDuration,
      sortOrder: (maxSort._max.sortOrder || 0) + 1,
    },
  })

  return NextResponse.json({ track }, { status: 201 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  const { id } = await params
  const playlist = await prisma.playlist.findUnique({ where: { id } })
  if (!playlist || playlist.userId !== userId) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }

  await prisma.playlist.delete({ where: { id } })
  return NextResponse.json({ message: '已删除' })
}
