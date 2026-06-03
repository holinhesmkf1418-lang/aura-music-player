import { prisma } from './prisma'

export interface TokenUsageRecord {
  label: string
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * 写入一条 token 用量记录（fire-and-forget，不阻塞主流程）
 */
export async function recordTokenUsage(record: TokenUsageRecord): Promise<void> {
  try {
    await prisma.tokenUsage.create({
      data: {
        label: record.label,
        model: record.model,
        promptTokens: record.promptTokens,
        completionTokens: record.completionTokens,
        totalTokens: record.totalTokens,
      },
    })
  } catch (error) {
    console.warn('Failed to record token usage:', error)
  }
}
