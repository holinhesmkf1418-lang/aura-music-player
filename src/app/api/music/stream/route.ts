import { NextResponse } from 'next/server'
import { fetchTrackStreamUrl } from '@/lib/music-service'

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
    const url = await fetchTrackStreamUrl(trackId)
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
