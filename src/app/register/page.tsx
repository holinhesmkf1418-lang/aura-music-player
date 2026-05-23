'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { setUser } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      })

      const data = await res.json()

      if (res.ok) {
        setUser(data.user)
        router.push('/onboarding')
        router.refresh()
      } else {
        setError(data.error || '注册失败')
      }
    } catch {
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <h1 className="text-xl font-bold text-white">注册 WavePlayer</h1>
          <p className="text-sm text-[#a0a0b8] mt-1">创建你的音乐账户</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] text-sm px-4 py-2.5 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-[#a0a0b8] mb-1.5">用户名</label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b85]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="你的用户名"
                required
                className="w-full bg-[#252540] text-white pl-10 pr-3 py-2.5 rounded-lg border border-[#2d2d4a] focus:outline-none focus:border-[#8b5cf6] text-sm placeholder:text-[#6b6b85]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#a0a0b8] mb-1.5">邮箱</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b85]" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-[#252540] text-white pl-10 pr-3 py-2.5 rounded-lg border border-[#2d2d4a] focus:outline-none focus:border-[#8b5cf6] text-sm placeholder:text-[#6b6b85]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-[#a0a0b8] mb-1.5">密码</label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6b6b85]" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 位密码"
                required
                minLength={6}
                className="w-full bg-[#252540] text-white pl-10 pr-10 py-2.5 rounded-lg border border-[#2d2d4a] focus:outline-none focus:border-[#8b5cf6] text-sm placeholder:text-[#6b6b85]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b85] hover:text-white"
              >
                {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#8b5cf6] text-white rounded-lg text-sm font-medium hover:bg-[#7c3aed] transition-colors disabled:opacity-50"
          >
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-[#a0a0b8] mt-6">
          已有账号？{' '}
          <Link href="/login" className="text-[#8b5cf6] hover:text-[#7c3aed]">
            立即登录
          </Link>
        </p>
      </div>
    </div>
  )
}
