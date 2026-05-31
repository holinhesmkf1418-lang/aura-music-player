'use client'

import { usePlayerStore } from '@/store/player-store'
import { EQ_PRESETS, type EqualizerSettings } from '@/lib/types'
import { FiX } from 'react-icons/fi'

type EqualizerBand = keyof Pick<EqualizerSettings, 'bass' | 'mid' | 'treble'>

export function Equalizer() {
  const { equalizer, setEqualizer, toggleEqualizer } = usePlayerStore()

  const handlePresetChange = (preset: string) => {
    const eq = EQ_PRESETS[preset]
    if (eq) {
      setEqualizer({ ...eq, preset })
    }
  }

  return (
    <div className="aura-glass-card fixed bottom-24 right-4 z-50 w-72 p-4 shadow-2xl animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">均衡器</h3>
        <button
          onClick={toggleEqualizer}
          className="p-1 rounded-full text-[var(--text-secondary)] hover:text-white transition-colors"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {Object.keys(EQ_PRESETS).map((preset) => (
          <button
            key={preset}
            onClick={() => handlePresetChange(preset)}
            className={`px-2.5 py-1 rounded-full text-xs transition-all ${
              equalizer.preset === preset
                ? 'bg-[var(--neon-cyan)] text-[var(--bg-deep)]'
                : 'aura-glass-control text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            {preset === 'normal' ? '标准' :
             preset === 'pop' ? '流行' :
             preset === 'rock' ? '摇滚' :
             preset === 'jazz' ? '爵士' :
             preset === 'classical' ? '古典' :
             preset === 'electronic' ? '电子' :
             preset === 'hiphop' ? '嘻哈' :
             preset === 'vocal' ? '人声' : preset}
          </button>
        ))}
      </div>

      {/* Sliders */}
      <div className="space-y-3">
        {([
          { key: 'bass', label: '低音', icon: '🔊' },
          { key: 'mid', label: '中音', icon: '🎵' },
          { key: 'treble', label: '高音', icon: '🔔' },
        ] as Array<{ key: EqualizerBand; label: string; icon: string }>).map(({ key, label, icon }) => {
          const value = equalizer[key]
          const min = -6
          const max = 6
          const percentage = ((value - min) / (max - min)) * 100

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs w-8 text-[var(--text-secondary)]">{icon}</span>
              <span className="text-xs w-8 text-[var(--text-secondary)]">{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => setEqualizer({ [key]: parseInt(e.target.value) })}
                className="flex-1"
                style={{
                  background: `linear-gradient(to right, var(--neon-cyan) ${percentage}%, var(--border-default) ${percentage}%)`,
                }}
              />
              <span className="text-xs text-[var(--text-tertiary)] w-6 text-right tabular-nums">
                {value > 0 ? `+${value}` : value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
