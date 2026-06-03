import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const audioUrl = searchParams.get('url')

  if (!audioUrl) {
    return NextResponse.json({ error: '缺少音频 URL' }, { status: 400 })
  }

  try {
    const decodedUrl = decodeURIComponent(audioUrl)
    const range = request.headers.get('range')
    const response = await fetch(decodedUrl, {
      headers: {
        'Referer': 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; M2007J3SC) AppleWebKit/537.36',
        ...(range ? { 'Range': range } : {}),
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: '获取音频失败' }, { status: 502 })
    }

    const headers = new Headers()
    const contentType = response.headers.get('Content-Type')
    const contentLength = response.headers.get('Content-Length')
    const acceptRanges = response.headers.get('Accept-Ranges')
    const contentRange = response.headers.get('Content-Range')

    if (contentType) headers.set('Content-Type', contentType)
    if (contentLength) headers.set('Content-Length', contentLength)
    if (acceptRanges) headers.set('Accept-Ranges', acceptRanges)
    if (contentRange) headers.set('Content-Range', contentRange)
    headers.set('Cache-Control', 'public, max-age=86400')
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin')

    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        ...Object.fromEntries(headers.entries()),
      },
    })
  } catch (error) {
    console.error('Audio proxy error:', error)
    return NextResponse.json({ error: '代理获取音频失败' }, { status: 502 })
  }
}
