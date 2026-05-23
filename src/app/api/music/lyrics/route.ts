import { NextResponse } from 'next/server'
import { getTrackLyrics } from '@/lib/music-service'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackId = searchParams.get('trackId')
  const title = searchParams.get('title')
  const artist = searchParams.get('artist')

  if (!trackId || !title || !artist) {
    return NextResponse.json({ lyrics: null })
  }

  try {
    const lyrics = await getTrackLyrics(trackId, title, artist)
    return NextResponse.json({ lyrics })
  } catch {
    return NextResponse.json({ lyrics: null })
  }
}
