'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiSearch, FiMic } from 'react-icons/fi'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [isListening, setIsListening] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'zh-CN'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event: any) => {
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
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b85]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索歌曲、歌手、专辑..."
          className="w-full bg-[#252540] text-white pl-10 pr-12 py-2.5 rounded-xl border border-[#2d2d4a] focus:outline-none focus:border-[#8b5cf6] focus:ring-1 focus:ring-[#8b5cf6]/50 text-sm transition-all placeholder:text-[#6b6b85]"
        />
        <button
          type="button"
          onClick={handleVoiceSearch}
          className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
            isListening
              ? 'text-[#ef4444] animate-pulse bg-[#ef4444]/10'
              : 'text-[#6b6b85] hover:text-white'
          }`}
          title="语音搜索"
        >
          <FiMic className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
