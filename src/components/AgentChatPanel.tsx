'use client'

import { useState, useRef, useEffect } from 'react'
import { Track } from '@/lib/types'
import { formatDuration } from '@/lib/music-service'
import { usePlayerStore } from '@/store/player-store'
import type { AgentContext, AgentResponse, AgentAction } from '@/lib/agent/types'
import { FiCpu, FiPlay, FiSend } from 'react-icons/fi'

interface Message {
  role: 'user' | 'assistant'
  content: string
  tracks?: Track[]
  meta?: string
}

const INITIAL_MESSAGES: Message[] = [
  {
    role: 'assistant',
    content: '你好，我是 DeepSeek 音乐助手\n你可以用自然语言描述你想听的音乐，我会帮你找到合适的歌曲',
  },
]

export function AgentChatPanel() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [agentContext, setAgentContext] = useState<AgentContext | null>(null)
  const [currentResults, setCurrentResults] = useState<Track[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { play, pause, resume, next: nextTrack, prev: prevTrack, addToQueue } = usePlayerStore()
  const setSearchedTracks = usePlayerStore((s) => s.setSearchedTracks)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  /** 控制类意图：前端只执行 action，不展示 tracks */
  const CONTROL_INTENTS = new Set([
    'pause', 'resume', 'next_track', 'previous_track',
    'play_track', 'add_to_queue',
  ])

  /** 执行后台动作 */
  const executeActions = (actions: AgentAction[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'replace_results':
          setSearchedTracks(action.tracks)
          setCurrentResults(action.tracks)
          break
        case 'play_track':
          play(action.track, currentResults.length > 0 ? currentResults : [action.track])
          break
        case 'append_queue':
          action.tracks.forEach((t) => addToQueue(t))
          break
        case 'pause':
          pause()
          break
        case 'resume':
          resume()
          break
        case 'next_track':
          nextTrack()
          break
        case 'previous_track':
          prevTrack()
          break
      }
    }
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text, meta: currentTimeLabel() }])
    setIsLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history,
          context: agentContext,
        }),
      })
      if (!res.ok) throw new Error('API error')
      const data: AgentResponse = await res.json()

      // 更新 Agent 上下文
      setAgentContext(data.context)

      // 执行动作
      executeActions(data.actions)

      // 渲染消息（控制类不展示 tracks，推荐类才展示）
      const isControl = CONTROL_INTENTS.has(data.intent)
      const msg: Message = {
        role: 'assistant',
        content: data.reply || '> Search complete.',
        tracks: !isControl && data.tracks.length > 0 ? data.tracks : undefined,
        meta: currentTimeLabel(),
      }
      setMessages((prev) => [...prev, msg])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '> ERROR: Connection failed.', meta: currentTimeLabel() }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="hud-titlebar shrink-0">
        <div className="flex items-center gap-2">
          <FiCpu className="h-4 w-4 text-[var(--neon-cyan)]" />
          <span className="text-[13px] font-semibold tracking-[0.16em] text-[var(--neon-cyan)]">AI AGENT - DEEPSEEK</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] tracking-[0.16em] text-[var(--neon-cyan)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--neon-cyan)] shadow-[0_0_8px_var(--neon-cyan)]" />
          ONLINE
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-5 flex items-start gap-3">
          <RobotAvatar />
          <div className="min-w-0 pt-1">
            <p className="text-[15px] font-semibold text-white">你好，我是 DeepSeek 音乐助手</p>
            <p className="mt-2 text-[12px] leading-relaxed text-[var(--text-secondary)]">
              你可以用自然语言描述你想听的音乐，我会帮你找到合适的歌曲
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {messages.slice(1).map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              onPlay={(track, tracks) => play(track, tracks)}
            />
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
              <RobotAvatar small />
              <span className="h-3 w-3 rounded-full border border-[var(--neon-cyan)] border-t-transparent animate-spin" />
              <span>正在思考中...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-[rgba(0,245,255,0.1)] p-4">
        <div className="flex items-center gap-3 rounded-[4px] border border-[rgba(0,245,255,0.16)] bg-[rgba(0,245,255,0.045)] px-3 py-2.5 shadow-[inset_0_0_22px_rgba(0,245,255,0.035)]">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你想听的音乐描述..."
            disabled={isLoading}
            className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-[var(--text-tertiary)]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="text-[var(--neon-cyan)] transition hover:scale-110 hover:text-white disabled:cursor-not-allowed disabled:opacity-25"
            aria-label="发送"
          >
            <FiSend className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message, onPlay }: { message: Message; onPlay: (track: Track, tracks: Track[]) => void }) {
  const isUser = message.role === 'user'

  if (message.tracks && message.tracks.length > 0) {
    return (
      <div className="flex items-start gap-3">
        <RobotAvatar small />
        <div className="min-w-0 flex-1">
          <p className="mb-3 text-[12px] leading-relaxed text-[var(--text-secondary)]">{message.content}</p>
          <div className="rounded-[5px] border border-[rgba(0,245,255,0.1)] bg-[rgba(2,9,14,0.72)] p-3 shadow-[inset_0_0_28px_rgba(0,245,255,0.03)]">
            <div className="mb-2 text-[11px] tracking-[0.08em] text-[var(--text-secondary)]">
              找到 {message.tracks.length} 首相关歌曲
            </div>
            <div className="space-y-1">
              {message.tracks.slice(0, 8).map((track, index) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => onPlay(track, message.tracks!)}
                  className="group grid h-8 w-full grid-cols-[26px_1.25fr_1fr_42px_22px] items-center gap-2 rounded-[3px] px-1 text-left text-[11px] text-[var(--text-secondary)] transition hover:bg-[rgba(0,245,255,0.06)] hover:text-white"
                >
                  <span className="tabular-nums text-[var(--text-tertiary)]">{index + 1}</span>
                  <span className="truncate font-semibold">{track.title}</span>
                  <span className="truncate text-[var(--text-tertiary)]">{track.artist}</span>
                  <span className="text-right tabular-nums text-[var(--text-tertiary)]">{formatDuration(track.duration)}</span>
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-[rgba(0,245,255,0.5)] text-[var(--neon-cyan)] group-hover:bg-[rgba(0,245,255,0.12)]">
                    <FiPlay className="h-2.5 w-2.5" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`${isUser ? 'max-w-[82%]' : 'max-w-[92%]'}`}>
        <div
          className={`rounded-[5px] border px-4 py-3 text-[12px] leading-relaxed shadow-[inset_0_0_20px_rgba(0,245,255,0.03)]
            ${isUser
              ? 'border-[rgba(0,245,255,0.2)] bg-[rgba(0,245,255,0.11)] text-white'
              : 'border-[rgba(0,245,255,0.1)] bg-[rgba(2,9,14,0.72)] text-[var(--text-secondary)]'
            }`}
        >
          {message.content}
        </div>
        {message.meta && (
          <div className={`mt-1 text-[10px] text-[var(--text-tertiary)] ${isUser ? 'text-right' : 'text-left'}`}>
            {message.meta}
          </div>
        )}
      </div>
    </div>
  )
}

function RobotAvatar({ small = false }: { small?: boolean }) {
  return (
    <div className={`${small ? 'h-7 w-7' : 'h-14 w-14'} relative shrink-0 rounded-full border border-[rgba(0,245,255,0.25)] bg-[rgba(0,245,255,0.06)] shadow-[0_0_22px_rgba(0,245,255,0.12)]`}>
      <div className="absolute inset-[18%] rounded-[35%] border border-[rgba(0,245,255,0.28)] bg-[rgba(0,8,12,0.95)]">
        <span className="absolute left-[25%] top-[38%] h-[10%] w-[15%] rounded-full bg-[var(--neon-cyan)] shadow-[0_0_7px_var(--neon-cyan)]" />
        <span className="absolute right-[25%] top-[38%] h-[10%] w-[15%] rounded-full bg-[var(--neon-cyan)] shadow-[0_0_7px_var(--neon-cyan)]" />
        <span className="absolute bottom-[24%] left-[36%] h-[6%] w-[28%] rounded-full bg-[rgba(0,245,255,0.45)]" />
      </div>
    </div>
  )
}

function currentTimeLabel() {
  return new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
}
