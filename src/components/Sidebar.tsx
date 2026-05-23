'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/auth-store'
import { FiHome, FiSearch, FiMusic, FiSettings, FiLogIn, FiUserPlus, FiLogOut } from 'react-icons/fi'

export function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()

  const navItems = [
    { href: '/', label: '首页', icon: FiHome },
    { href: '/search', label: '搜索', icon: FiSearch },
    { href: '/library', label: '我的音乐', icon: FiMusic },
    { href: '/settings', label: '设置', icon: FiSettings },
  ]

  return (
    <aside className="w-60 bg-[#15152a] border-r border-[#2d2d4a] flex flex-col shrink-0">
      <div className="p-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] flex items-center justify-center">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          <span className="text-lg font-bold gradient-text">WavePlayer</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-[#8b5cf6]/20 text-[#8b5cf6] font-medium'
                  : 'text-[#a0a0b8] hover:bg-[#252540] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[#2d2d4a]">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#8b5cf6] to-[#06b6d4] flex items-center justify-center text-white text-xs font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{user.username}</p>
                <p className="text-xs text-[#6b6b85] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-sm text-[#a0a0b8] hover:bg-[#252540] hover:text-white transition-all"
            >
              <FiLogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <Link
              href="/login"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a0a0b8] hover:bg-[#252540] hover:text-white transition-all"
            >
              <FiLogIn className="w-4 h-4" />
              登录
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#a0a0b8] hover:bg-[#252540] hover:text-white transition-all"
            >
              <FiUserPlus className="w-4 h-4" />
              注册
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
