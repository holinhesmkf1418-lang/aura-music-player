import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function aggregateByDay(
  records: { timestamp: Date; totalTokens: number }[],
): { date: string; tokens: number; calls: number }[] {
  const map = new Map<string, { tokens: number; calls: number }>()
  for (const r of records) {
    const day = r.timestamp.toISOString().slice(0, 10)
    const entry = map.get(day) || { tokens: 0, calls: 0 }
    entry.tokens += r.totalTokens
    entry.calls += 1
    map.set(day, entry)
  }
  return Array.from(map.entries())
    .map(([date, v]) => ({ date, tokens: v.tokens, calls: v.calls }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = Math.min(parseInt(searchParams.get('days') || '7', 10), 90)

    const since = new Date()
    since.setDate(since.getDate() - days)

    const [records, aggregated] = await Promise.all([
      prisma.tokenUsage.findMany({
        where: { timestamp: { gte: since } },
        orderBy: { timestamp: 'desc' },
        take: 500,
      }),
      prisma.tokenUsage.groupBy({
        by: ['label'],
        where: { timestamp: { gte: since } },
        _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
        _count: true,
      }),
    ])

    const totalCount = await prisma.tokenUsage.count()
    const dailyTotals = aggregateByDay(records)
    const totalTokens = aggregated.reduce(
      (sum, g) => sum + (g._sum.totalTokens || 0),
      0,
    )

    return NextResponse.json({
      totalTokens,
      totalCalls: totalCount,
      dailyTotals,
      byLabel: aggregated.map((g) => ({
        label: g.label,
        calls: g._count,
        promptTokens: g._sum.promptTokens || 0,
        completionTokens: g._sum.completionTokens || 0,
        totalTokens: g._sum.totalTokens || 0,
      })),
    })
  } catch (error) {
    console.error('Token usage query error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
