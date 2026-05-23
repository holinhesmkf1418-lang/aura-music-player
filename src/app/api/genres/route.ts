import { NextResponse } from 'next/server'
import { GENRE_TAGS, ERA_TAGS } from '@/lib/types'

export async function GET() {
  return NextResponse.json({ genres: GENRE_TAGS, eras: ERA_TAGS })
}
