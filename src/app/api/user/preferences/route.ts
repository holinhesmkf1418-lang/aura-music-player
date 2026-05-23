import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionUserId } from '@/lib/auth'

export async function GET() {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ preferences: null })
  }

  const prefs = await prisma.userPreference.findUnique({
    where: { userId },
  })

  if (!prefs) {
    return NextResponse.json({
      preferences: { genres: [], eras: [], artists: [], neteaseCookie: '' },
    })
  }

  return NextResponse.json({
    preferences: {
      genres: JSON.parse(prefs.genres),
      eras: JSON.parse(prefs.eras),
      artists: JSON.parse(prefs.artists),
      neteaseCookie: prefs.neteaseCookie,
    },
  })
}

export async function PUT(request: Request) {
  const userId = await getSessionUserId()
  if (!userId) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 })
  }

  try {
    const { genres, eras, artists, neteaseCookie } = await request.json()

    const preferences = await prisma.userPreference.upsert({
      where: { userId },
      update: {
        genres: JSON.stringify(genres || []),
        eras: JSON.stringify(eras || []),
        artists: JSON.stringify(artists || []),
        neteaseCookie: neteaseCookie ?? '',
      },
      create: {
        userId,
        genres: JSON.stringify(genres || []),
        eras: JSON.stringify(eras || []),
        artists: JSON.stringify(artists || []),
        neteaseCookie: neteaseCookie ?? '',
      },
    })

    return NextResponse.json({
      preferences: {
        genres: JSON.parse(preferences.genres),
        eras: JSON.parse(preferences.eras),
        artists: JSON.parse(preferences.artists),
        neteaseCookie: preferences.neteaseCookie,
      },
      message: '偏好已保存',
    })
  } catch (error) {
    console.error('Save preferences error:', error)
    return NextResponse.json(
      { error: '保存偏好失败' },
      { status: 500 }
    )
  }
}
