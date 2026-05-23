'use client'

import { useState, useRef, useEffect } from 'react'
import { Track } from '@/lib/types'
import { usePlayerStore } from '@/store/player-store'
import { FiSend, FiPlay, FiMusic } from 'react-icons/fi'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  tracks?: Track[]
}

export function MusicChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'SYSTEM INITIALIZED.\nNeural agent ready. Describe the music you want to hear.\n\nExamples:\n> 我想听周杰伦的歌\n> 推荐适合跑步听的歌\n> 来点舒缓的纯音乐',
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { play } = usePlayerStore()
  const setSearchedTracks = usePlayerStore((s) => s.setSearchedTracks)

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    const userMessage: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])

    setIsLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      })

      if (!res.ok) throw new Error('API error')

      const data = await res.json()

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'Search complete.',
        tracks: data.tracks || [],
      }

      setMessages((prev) => [...prev, assistantMessage])

      // Update the left panel's song list
      if (data.tracks && data.tracks.length > 0) {
        setSearchedTracks(data.tracks)
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '> ERROR: Connection failed. Retry transmission?' },
      ])
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

  const handlePlayTrack = (track: Track, tracks: Track[]) => {
    play(track, tracks)
  }

  return (
    <div className="h-full flex flex-col bg-black/20">
      {/* Header - system status bar */}
      <div className="shrink-0 border-b border-[rgba(0,240,255,0.1)] bg-[rgba(0,0,0,0.3)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 flex items-center justify-center border border-[rgba(0,240,255,0.2)]">
              <FiMusic className="w-3.5 h-3.5 text-[var(--neon-cyan)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-white tracking-wider">DJ_AGENT</span>
                <span className={`w-1.5 h-1.5 ${isLoading ? 'bg-[var(--neon-green)] animate-neon-pulse' : 'bg-[var(--neon-cyan)]'}`} />
              </div>
              <span className="text-[9px] font-mono text-[var(--text-tertiary)] tracking-widest uppercase">
                Neural Interface // DeepSeek + NetEase
              </span>
            </div>
          </div>
          <div className="text-[9px] font-mono text-[var(--text-tertiary)] tracking-widest">
            AI v2.4.1
          </div>
        </div>
      </div>

      {/* Messages - terminal style scroll */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 terminal-scroll">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[88%] px-3 py-2 text-[13px] font-mono leading-relaxed
                ${msg.role === 'user'
                  ? 'border border-[rgba(0,240,255,0.15)] bg-[rgba(0,240,255,0.03)] text-white'
                  : 'text-[var(--text-primary)]'
                }`}
            >
              {msg.role === 'assistant' && (
                <span className="text-[var(--neon-green)] text-[11px] mr-1">&gt;</span>
              )}
              <span className="whitespace-pre-wrap">{msg.content}</span>

              {/* Song cards */}
              {msg.tracks && msg.tracks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.tracks.slice(0, 5).map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-2 px-2 py-1.5 border border-[rgba(0,240,255,0.08)] hover:border-[var(--neon-cyan)] transition-all cursor-pointer group bg-[rgba(0,0,0,0.3)]"
                      onClick={() => handlePlayTrack(track, msg.tracks!)}
                    >
                      <div className="w-5 h-5 border border-[rgba(0,240,255,0.15)] flex items-center justify-center shrink-0">
                        <FiMusic className="w-2.5 h-2.5 text-[var(--neon-cyan)] opacity-60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-mono text-white truncate">{track.title}</p>
                        <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate opacity-60">{track.artist}</p>
                      </div>
                      <FiPlay className="w-3 h-3 text-[var(--neon-cyan)] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="px-3 py-2 flex items-center gap-1">
              <span className="text-[var(--neon-green)] text-[11px]">&gt;</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-typing-dot" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-typing-dot" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)] animate-typing-dot" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input - command line style */}
      <div className="shrink-0 border-t border-[rgba(0,240,255,0.08)] bg-[rgba(0,0,0,0.3)]">
        <div className="px-3 py-2.5 flex items-center gap-2">
          <span className="text-[var(--neon-green)] text-sm font-mono shrink-0">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入指令..."
            className="flex-1 bg-transparent border-none px-2 py-1.5 text-sm font-mono text-white placeholder-[var(--text-tertiary)] outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="w-8 h-8 border border-[var(--neon-cyan)] text-[var(--neon-cyan)] flex items-center justify-center hover:bg-[rgba(0,240,255,0.1)] transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
          >
            <FiSend className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
