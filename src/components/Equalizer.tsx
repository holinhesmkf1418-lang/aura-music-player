'use client'

import { usePlayerStore } from '@/store/player-store'
import { EQ_PRESETS } from '@/lib/types'
import { FiX } from 'react-icons/fi'

export function Equalizer() {
  const { equalizer, setEqualizer, toggleEqualizer } = usePlayerStore()

  const handlePresetChange = (preset: string) => {
    const eq = EQ_PRESETS[preset]
    if (eq) {
      setEqualizer({ ...eq, preset })
    }
  }

  return (
    <div className="fixed bottom-24 right-4 w-72 bg-[#1a1a2e] border border-[#2d2d4a] rounded-xl p-4 shadow-2xl z-50 animate-slide-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white">均衡器</h3>
        <button
          onClick={toggleEqualizer}
          className="p-1 rounded-full text-[#a0a0b8] hover:text-white transition-colors"
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
                ? 'bg-[#8b5cf6] text-white'
                : 'bg-[#252540] text-[#a0a0b8] hover:bg-[#2d2d4a] hover:text-white'
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
        {[
          { key: 'bass', label: '低音', icon: '🔊' },
          { key: 'mid', label: '中音', icon: '🎵' },
          { key: 'treble', label: '高音', icon: '🔔' },
        ].map(({ key, label, icon }) => {
          const value = (equalizer as any)[key] as number
          const min = -6
          const max = 6
          const percentage = ((value - min) / (max - min)) * 100

          return (
            <div key={key} className="flex items-center gap-3">
              <span className="text-xs w-8 text-[#a0a0b8]">{icon}</span>
              <span className="text-xs w-8 text-[#a0a0b8]">{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => setEqualizer({ [key]: parseInt(e.target.value) })}
                className="flex-1"
                style={{
                  background: `linear-gradient(to right, #8b5cf6 ${percentage}%, #2d2d4a ${percentage}%)`,
                }}
              />
              <span className="text-xs text-[#6b6b85] w-6 text-right tabular-nums">
                {value > 0 ? `+${value}` : value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
