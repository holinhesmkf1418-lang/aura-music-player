'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'
import { usePlayerStore } from '@/store/player-store'
import { Equalizer } from '@/components/Equalizer'
import { LyricsDisplay } from '@/components/LyricsDisplay'
import { FiSettings, FiKey, FiVolume2, FiUser, FiRefreshCw, FiHeadphones } from 'react-icons/fi'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { quality, setQuality } = usePlayerStore()
  const { showEqualizer, showLyrics } = usePlayerStore()
  const [youtubeKey, setYoutubeKey] = useState('')
  const [saved, setSaved] = useState(false)

  const [neteaseCookie, setNeteaseCookie] = useState('')
  const [cookieSaved, setCookieSaved] = useState(false)
  const [cookieLoading, setCookieLoading] = useState(false)
  const [savingCookie, setSavingCookie] = useState(false)

  // 加载已保存的 Cookie
  useEffect(() => {
    if (!user) return
    setCookieLoading(true)
    fetch('/api/user/preferences')
      .then(r => r.json())
      .then(data => {
        if (data.preferences?.neteaseCookie) {
          setNeteaseCookie(data.preferences.neteaseCookie)
        }
      })
      .catch(() => {})
      .finally(() => setCookieLoading(false))
  }, [user])

  const qualityOptions = [
    { value: 'standard' as const, label: '标准', desc: '128kbps - 320kbps MP3' },
    { value: 'high' as const, label: '高品质', desc: '320kbps+ 高码率' },
    { value: 'lossless' as const, label: '无损', desc: 'FLAC / WAV 无损格式' },
  ]

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <div className="flex items-center gap-2">
        <FiSettings className="w-5 h-5 text-[#8b5cf6]" />
        <h1 className="text-2xl font-bold text-white">设置</h1>
      </div>

      {/* Audio quality */}
      <section className="bg-[#1e1e35] rounded-xl p-5 border border-[#2d2d4a]">
        <h2 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
          <FiVolume2 className="w-4 h-4 text-[#8b5cf6]" />
          音质选择
        </h2>
        <div className="space-y-2">
          {qualityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setQuality(option.value)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                quality === option.value
                  ? 'bg-[#8b5cf6]/20 border-[#8b5cf6]'
                  : 'bg-[#252540] border-[#2d2d4a] hover:border-[#6b6b85]'
              }`}
            >
              <div className="text-left">
                <p className={`text-sm ${quality === option.value ? 'text-[#8b5cf6]' : 'text-white'}`}>
                  {option.label}
                </p>
                <p className="text-xs text-[#6b6b85] mt-0.5">{option.desc}</p>
              </div>
              {quality === option.value && (
                <div className="w-4 h-4 rounded-full bg-[#8b5cf6] flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* DeepSeek API Key */}
      <section className="bg-[#1e1e35] rounded-xl p-5 border border-[#2d2d4a]">
        <h2 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
          <FiKey className="w-4 h-4 text-[#8b5cf6]" />
          DeepSeek API Key（已配置）
        </h2>
        <p className="text-xs text-[#a0a0b8] mb-3">
          DeepSeek AI 已集成！用于智能搜索（理解自然语言）、个性化推荐（分析偏好+听歌历史）、歌词翻译等功能。
          当前使用环境变量中的 API Key，无需手动输入。
        </p>
        <div className="bg-[#252540] rounded-lg p-3 border border-[#2d2d4a]">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[#22c55e]">DeepSeek 已就绪</span>
          </div>
          <p className="text-xs text-[#6b6b85] mt-2">
            试试在搜索框输入自然语言，如"来点适合跑步听的歌"或"推荐类似周杰伦的中国风歌曲"
          </p>
        </div>
      </section>

      {/* NetEase Cookie */}
      <section className="bg-[#1e1e35] rounded-xl p-5 border border-[#2d2d4a]">
        <h2 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
          <FiHeadphones className="w-4 h-4 text-[#f59e0b]" />
          网易云音乐 Cookie
        </h2>
        {user ? (
          <>
            <p className="text-xs text-[#a0a0b8] mb-3">
              填入你的网易云音乐登录 Cookie，所有用户将使用你的会员权益获取完整歌曲音源。
              Cookie 过期后重新登录获取即可。
            </p>
            <details className="mb-3">
              <summary className="text-xs text-[#8b5cf6] cursor-pointer hover:text-[#a78bfa]">
                如何获取 Cookie？
              </summary>
              <ol className="mt-2 text-xs text-[#a0a0b8] space-y-1 list-decimal list-inside">
                <li>用 Chrome 打开 <span className="text-white">music.163.com</span> 并登录</li>
                <li>按 <span className="text-white">F12</span> 打开开发者工具</li>
                <li>点顶部 <span className="text-white">Application</span> 标签</li>
                <li>左侧找到 <span className="text-white">Cookies → music.163.com</span></li>
                <li>找到 <span className="text-white">MUSIC_U</span> 和 <span className="text-white">__csrf</span>，把整行 Cookie 复制下来</li>
              </ol>
            </details>
            <div className="flex gap-2">
              <input
                type="text"
                value={neteaseCookie}
                onChange={(e) => { setNeteaseCookie(e.target.value); setCookieSaved(false) }}
                placeholder={cookieLoading ? '加载中...' : "粘贴 MUSIC_U=xxx; __csrf=xxx"}
                disabled={cookieLoading}
                className="flex-1 bg-[#252540] text-white px-3 py-2.5 rounded-lg border border-[#2d2d4a] focus:outline-none focus:border-[#f59e0b] text-sm placeholder:text-[#6b6b85] disabled:opacity-50"
              />
              <button
                onClick={async () => {
                  setSavingCookie(true)
                  try {
                    const res = await fetch('/api/user/preferences', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ neteaseCookie }),
                    })
                    if (res.ok) {
                      setCookieSaved(true)
                      setTimeout(() => setCookieSaved(false), 3000)
                    }
                  } catch {}
                  setSavingCookie(false)
                }}
                disabled={savingCookie || cookieLoading}
                className="px-4 py-2 bg-[#f59e0b] text-white rounded-lg text-sm hover:bg-[#d97706] transition-colors disabled:opacity-50"
              >
                {savingCookie ? '保存中...' : '保存'}
              </button>
            </div>
            {cookieSaved && (
              <p className="text-xs text-[#22c55e] mt-2 flex items-center gap-1">
                <FiRefreshCw className="w-3 h-3" />
                Cookie 已保存，搜索歌曲时将使用你的会员权益
              </p>
            )}
            {neteaseCookie && !cookieSaved && (
              <p className="text-xs text-[#f59e0b] mt-2">有修改，记得点保存</p>
            )}
          </>
        ) : (
          <div>
            <p className="text-xs text-[#a0a0b8] mb-3">
              登录后即可配置网易云音乐 Cookie，使用你的 VIP 会员权益让所有用户听到完整歌曲。
            </p>
            <p className="text-xs text-[#6b6b85]">
              当前未登录，服务默认使用环境变量中的 Cookie（如有配置）。
            </p>
          </div>
        )}
      </section>

      {/* YouTube API Key */}
      <section className="bg-[#1e1e35] rounded-xl p-5 border border-[#2d2d4a]">
        <h2 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
          <FiRefreshCw className="w-4 h-4 text-[#8b5cf6]" />
          YouTube API Key
        </h2>
        <p className="text-xs text-[#6b6b85] mb-3">
          配置 YouTube Data API Key 以从 YouTube 搜索和播放音乐。如果为空则使用内置示例数据。
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={youtubeKey}
            onChange={(e) => { setYoutubeKey(e.target.value); setSaved(false) }}
            placeholder="输入你的 YouTube API Key"
            className="flex-1 bg-[#252540] text-white px-3 py-2.5 rounded-lg border border-[#2d2d4a] focus:outline-none focus:border-[#8b5cf6] text-sm placeholder:text-[#6b6b85]"
          />
          <button
            onClick={() => setSaved(true)}
            className="px-4 py-2 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors"
          >
            保存
          </button>
        </div>
        {saved && !cookieSaved && (
          <p className="text-xs text-[#22c55e] mt-2 flex items-center gap-1">
            <FiRefreshCw className="w-3 h-3" />
            API Key 已保存（本地存储）
          </p>
        )}
      </section>

      {/* Account info */}
      <section className="bg-[#1e1e35] rounded-xl p-5 border border-[#2d2d4a]">
        <h2 className="text-sm font-medium text-white flex items-center gap-2 mb-3">
          <FiUser className="w-4 h-4 text-[#8b5cf6]" />
          账户信息
        </h2>
        {user ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#a0a0b8]">用户名</span>
              <span className="text-white">{user.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#a0a0b8]">邮箱</span>
              <span className="text-white">{user.email}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#6b6b85]">未登录</p>
        )}
      </section>

      {showEqualizer && <Equalizer />}
      {showLyrics && <LyricsDisplay />}
    </div>
  )
}
