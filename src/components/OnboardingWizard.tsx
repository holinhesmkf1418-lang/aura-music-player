'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GENRE_TAGS, ERA_TAGS } from '@/lib/types'

interface OnboardingWizardProps {
  onComplete?: () => void
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedEras, setSelectedEras] = useState<string[]>([])
  const [artistInput, setArtistInput] = useState('')
  const [artists, setArtists] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const steps = [
    { title: '选择你喜欢的音乐风格', subtitle: '至少选择 2 个风格，我们会据此为你推荐音乐' },
    { title: '选择你喜欢的年代', subtitle: '选择你常听的音乐年代' },
    { title: '关注喜欢的歌手', subtitle: '输入歌手名字，我们会重点关注他们的作品' },
  ]

  const toggleGenre = (id: string) => {
    setSelectedGenres(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleEra = (id: string) => {
    setSelectedEras(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const addArtist = () => {
    const name = artistInput.trim()
    if (name && !artists.includes(name)) {
      setArtists(prev => [...prev, name])
      setArtistInput('')
    }
  }

  const removeArtist = (name: string) => {
    setArtists(prev => prev.filter(a => a !== name))
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genres: selectedGenres,
          eras: selectedEras,
          artists,
        }),
      })
      onComplete?.()
      router.push('/')
    } catch (error) {
      console.error('Save preferences failed:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= step ? 'bg-[#8b5cf6]' : 'bg-[#2d2d4a]'
              }`}
            />
          ))}
        </div>

        {/* Step title */}
        <h2 className="text-xl font-bold text-white mb-1">{steps[step].title}</h2>
        <p className="text-sm text-[#a0a0b8] mb-6">{steps[step].subtitle}</p>

        {/* Step 0: Genre selection */}
        {step === 0 && (
          <div className="grid grid-cols-3 gap-2.5">
            {GENRE_TAGS.map((genre) => (
              <button
                key={genre.id}
                onClick={() => toggleGenre(genre.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  selectedGenres.includes(genre.id)
                    ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-white'
                    : 'bg-[#1e1e35] border-[#2d2d4a] text-[#a0a0b8] hover:border-[#6b6b85]'
                }`}
              >
                <span className="text-2xl">{genre.emoji}</span>
                <span className="text-xs">{genre.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Era selection */}
        {step === 1 && (
          <div className="grid grid-cols-3 gap-2.5">
            {ERA_TAGS.map((era) => (
              <button
                key={era.id}
                onClick={() => toggleEra(era.id)}
                className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border transition-all ${
                  selectedEras.includes(era.id)
                    ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-white'
                    : 'bg-[#1e1e35] border-[#2d2d4a] text-[#a0a0b8] hover:border-[#6b6b85]'
                }`}
              >
                <span className="text-2xl">{era.emoji}</span>
                <span className="text-xs">{era.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Artists */}
        {step === 2 && (
          <div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={artistInput}
                onChange={(e) => setArtistInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addArtist())}
                placeholder="输入歌手名字后按回车..."
                className="flex-1 bg-[#252540] text-white px-3 py-2 rounded-lg border border-[#2d2d4a] focus:outline-none focus:border-[#8b5cf6] text-sm placeholder:text-[#6b6b85]"
              />
              <button
                onClick={addArtist}
                className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors"
              >
                添加
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {artists.map((artist) => (
                <span
                  key={artist}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#252540] text-white rounded-full text-sm"
                >
                  {artist}
                  <button
                    onClick={() => removeArtist(artist)}
                    className="text-[#a0a0b8] hover:text-[#ef4444] transition-colors"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
            {artists.length === 0 && (
              <p className="text-xs text-[#6b6b85] mt-2">可以不填，跳过即可</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            className={`px-6 py-2.5 rounded-lg text-sm transition-colors ${
              step === 0
                ? 'text-[#6b6b85] cursor-not-allowed'
                : 'text-[#a0a0b8] hover:text-white hover:bg-[#252540]'
            }`}
            disabled={step === 0}
          >
            上一步
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(prev => prev + 1)}
              className="px-6 py-2.5 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors"
            >
              下一步
            </button>
          ) : (
            <button
              onClick={savePreferences}
              disabled={saving}
              className="px-6 py-2.5 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '完成'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
