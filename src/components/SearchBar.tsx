'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiMic } from 'react-icons/fi'

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}

interface WebkitSpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

type WindowWithSpeechRecognition = Window & {
  webkitSpeechRecognition?: new () => WebkitSpeechRecognitionLike
}

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<WebkitSpeechRecognitionLike | null>(null)

  useEffect(() => {
    const currentWindow = window as WindowWithSpeechRecognition
    if (typeof currentWindow !== 'undefined' && currentWindow.webkitSpeechRecognition) {
      const SpeechRecognition = currentWindow.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'zh-CN'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setQuery(transcript)
        setIsListening(false)
        router.push(`/search?q=${encodeURIComponent(transcript)}`)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  const handleVoiceSearch = () => {
    if (recognitionRef.current) {
      if (isListening) {
        recognitionRef.current.stop()
      } else {
        recognitionRef.current.start()
        setIsListening(true)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑..."
          className="aura-glass-control w-full text-white pl-10 pr-12 py-2.5 focus:outline-none focus:border-[var(--neon-cyan)] focus:ring-1 focus:ring-[var(--border-active)] text-sm transition-all placeholder:text-[var(--text-tertiary)]"
        />
        <button
          type="button"
          onClick={handleVoiceSearch}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
            isListening
              ? 'text-[var(--neon-red)] animate-pulse bg-[var(--bg-hover)]'
              : 'text-[var(--text-tertiary)] hover:text-white'
          }`}
          title="语音搜索"
        >
          <FiMic className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
