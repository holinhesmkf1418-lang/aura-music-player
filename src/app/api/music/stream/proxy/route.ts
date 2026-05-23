import { NextResponse } from 'next/server'

/**
 * 音频代理路由
 * 从网易云 CDN 获取音频并通过本服务转发，绕过浏览器 CDN 限制
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const audioUrl = searchParams.get('url')

  if (!audioUrl) {
    return NextResponse.json({ error: '缺少音频 URL' }, { status: 400 })
  }

  try {
    const decodedUrl = decodeURIComponent(audioUrl)
    const response = await fetch(decodedUrl, {
      headers: {
        'Referer': 'https://music.163.com/',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 11; M2007J3SC) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ error: '获取音频失败' }, { status: 502 })
    }

    // 流式转发音频数据
    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'audio/mpeg',
        'Content-Length': response.headers.get('Content-Length') || String(audioBuffer.byteLength),
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Audio proxy error:', error)
    return NextResponse.json({ error: '代理获取音频失败' }, { status: 502 })
  }
}
