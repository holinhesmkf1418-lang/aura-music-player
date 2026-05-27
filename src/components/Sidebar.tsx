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
    <aside className="w-60 bg-[var(--bg-deep)] border-r border-[var(--border-subtle)] flex flex-col shrink-0">
      <div className="p-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[6px] bg-[var(--neon-cyan)] shadow-[var(--glow-cyan)] flex items-center justify-center">
            <span className="text-[var(--bg-deep)] font-bold text-sm">A</span>
          </div>
          <span className="neon-text-cyan text-lg font-bold tracking-[0.12em]">AURA</span>
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
                  ? 'bg-[var(--bg-hover)] text-[var(--neon-cyan)] font-medium'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-[var(--border-subtle)]">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-[var(--neon-cyan)] shadow-[var(--glow-cyan)] flex items-center justify-center text-[var(--bg-deep)] text-xs font-bold">
                {user.username[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white truncate">{user.username}</p>
                <p className="text-xs text-[var(--text-tertiary)] truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2 rounded-[6px] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white transition-all"
            >
              <FiLogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <Link
              href="/login"
              className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white transition-all"
            >
              <FiLogIn className="w-4 h-4" />
              登录
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-3 px-3 py-2.5 rounded-[6px] text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-white transition-all"
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
