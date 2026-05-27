'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/auth-store'

export function useAuthInit() {
  const checkSession = useAuthStore((s) => s.checkSession)

  useEffect(() => {
    checkSession()
  }, [checkSession])
}
