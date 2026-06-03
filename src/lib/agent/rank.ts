import type { Track } from '@/lib/types'
import type { RankHints } from './types'
import { chatWithDeepSeek } from '@/lib/deepseek'

/**
 * 用 DeepSeek 对搜索结果进行排序
 * 按用户请求的匹配度从高到低排列
 */
export async function rankTracks(
  tracks: Track[],
  rankHints: RankHints,
  onFallback?: (reason: string) => void,
): Promise<Track[]> {
  if (tracks.length <= 1) return tracks

  // 构建紧凑的候选列表
  const candidateLines = tracks
    .map((t, i) => `${i}: ${t.title} - ${t.artist}`)
    .join('\n')

  const contextDesc = buildContextDescription(rankHints)

  const systemPrompt = `你是一个音乐推荐排序助手。根据用户的需求，对候选歌曲进行排序。

用户需求：${contextDesc}

候选歌曲列表：
${candidateLines}

请根据匹配度从高到低输出歌曲的序号（按重要性排序），只输出一个 JSON 数字数组，如 [2, 0, 3, 1]，不要加其他文字。
如果列表为空或无法判断，输出 []`

  const result = await chatWithDeepSeek([
    { role: 'system', content: '你是音乐排序助手，只输出 JSON 数组。' },
    { role: 'user', content: systemPrompt },
  ], undefined, { callLabel: 'track-rank' })

  if (!result) {
    onFallback?.('deepseek_no_response')
    return tracks
  }

  try {
    const indices: number[] = JSON.parse(result)
    if (!Array.isArray(indices) || indices.length === 0) {
      onFallback?.('empty_indices')
      return tracks
    }

    // 按 DeepSeek 返回的顺序重新排列，忽略无效索引
    const ordered: Track[] = []
    const used = new Set<number>()

    for (const idx of indices) {
      if (idx >= 0 && idx < tracks.length && !used.has(idx)) {
        used.add(idx)
        ordered.push(tracks[idx])
      }
    }

    // 追加未排序的歌曲
    for (let i = 0; i < tracks.length; i++) {
      if (!used.has(i)) {
        ordered.push(tracks[i])
      }
    }

    return ordered
  } catch {
    onFallback?.('json_parse_error')
    return tracks
  }
}

function buildContextDescription(rankHints: RankHints): string {
  const parts: string[] = []
  if (rankHints.topic) parts.push(`主题：${rankHints.topic}`)
  if (rankHints.scene) parts.push(`场景：${rankHints.scene}`)
  if (rankHints.mood?.length) parts.push(`情绪：${rankHints.mood.join('、')}`)
  if (rankHints.genres?.length) parts.push(`风格：${rankHints.genres.join('、')}`)
  if (rankHints.language === 'zh') parts.push('语言：中文')
  if (rankHints.language === 'en') parts.push('语言：英文')
  if (rankHints.language === 'mixed') parts.push('语言：中英文混合')
  if (rankHints.energy === 'high') parts.push('能量：高/节奏强劲')
  if (rankHints.energy === 'low') parts.push('能量：低/舒缓')
  if (rankHints.energy === 'medium') parts.push('能量：适中')
  return parts.join('；') || '无特定要求'
}
