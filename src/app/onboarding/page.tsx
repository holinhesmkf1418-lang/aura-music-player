'use client'

import { useAuthStore } from '@/store/auth-store'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import Link from 'next/link'

export default function OnboardingPage() {
  const { user } = useAuthStore()

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">🎵</div>
          <h2 className="text-lg font-medium text-white mb-2">请先登录</h2>
          <p className="text-sm text-[#a0a0b8] mb-4">需要登录后才能设置音乐偏好</p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/login"
              className="px-5 py-2.5 bg-[#8b5cf6] text-white rounded-lg text-sm hover:bg-[#7c3aed] transition-colors"
            >
              去登录
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 bg-[#252540] text-[#a0a0b8] rounded-lg text-sm hover:text-white transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <OnboardingWizard />
}
