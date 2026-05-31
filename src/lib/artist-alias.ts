const ARTIST_ALIASES: Record<string, string> = {
  邓紫琪: '邓紫棋',
  gem: '邓紫棋',
  'g.e.m': '邓紫棋',
  'g.e.m.': '邓紫棋',
  'g.e.m.邓紫棋': '邓紫棋',
}

function aliasKey(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, '')
}

export function normalizeArtistAlias(name: string): string {
  const trimmed = name.trim()
  return ARTIST_ALIASES[aliasKey(trimmed)] || trimmed
}

export function normalizeArtistForMatch(name: string): string {
  return normalizeArtistAlias(name)
    .toLowerCase()
    .replace(/\s+/g, '')
}

export function artistNameMatches(candidate: string, requested: string): boolean {
  const candidateName = normalizeArtistForMatch(candidate)
  const requestedName = normalizeArtistForMatch(requested)

  if (!candidateName || !requestedName) return false
  return candidateName === requestedName
    || candidateName.includes(requestedName)
    || requestedName.includes(candidateName)
}
