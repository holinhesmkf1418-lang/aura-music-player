export interface LyricLine {
  time: number | null
  text: string
}

function parseLyricTime(raw: string): number {
  const [minutePart, secondPart = '0'] = raw.split(':')
  const minutes = Number(minutePart)
  const seconds = Number(secondPart.replace('.', ''))
  const decimalLength = secondPart.includes('.') ? secondPart.split('.')[1]?.length || 0 : 0

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) return 0
  if (decimalLength > 0) return minutes * 60 + seconds / (10 ** decimalLength)
  return minutes * 60 + seconds
}

export function parseLyrics(raw: string | null): LyricLine[] {
  if (!raw) return []

  const timedLines: LyricLine[] = []
  const plainLines: LyricLine[] = []

  for (const line of raw.split(/\r?\n/)) {
    const text = line.replace(/\[[^\]]+\]/g, '').trim()
    const timestamps = [...line.matchAll(/\[(\d{1,2}:\d{2}(?:[.:]\d{1,3})?)\]/g)]

    if (timestamps.length > 0 && text) {
      for (const match of timestamps) {
        timedLines.push({ time: parseLyricTime(match[1]), text })
      }
    } else if (text && !/^(ar|ti|al|by|offset):/i.test(text)) {
      plainLines.push({ time: null, text })
    }
  }

  if (timedLines.length > 0) {
    return timedLines.sort((a, b) => (a.time || 0) - (b.time || 0))
  }

  return plainLines
}

export function getActiveLyricIndex(lines: LyricLine[], currentTime: number, duration: number): number {
  if (lines.length === 0) return -1

  if (lines.some((line) => line.time !== null)) {
    let active = 0

    for (let i = 0; i < lines.length; i++) {
      const lineTime = lines[i].time
      if (lineTime !== null && lineTime <= currentTime + 0.18) active = i
    }

    return active
  }

  if (duration <= 0) return 0

  const ratio = Math.max(0, Math.min(0.999, currentTime / duration))
  return Math.floor(ratio * lines.length)
}
