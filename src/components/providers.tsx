'use client'

import { LanguageProvider } from '@/lib/i18n/language-context'
import { AuthProvider } from '@/components/auth-context'
import { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>{children}</AuthProvider>
    </LanguageProvider>
  )
}
