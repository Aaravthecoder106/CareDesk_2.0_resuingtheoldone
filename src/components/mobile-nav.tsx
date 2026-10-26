'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Show } from '@/components/auth-context'
import { UserMenu } from '@/components/user-menu'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  BarChart3,
  Users,
  Settings,
  Sparkles,
  Menu,
  X,
  Mail,
} from 'lucide-react'
import { useState, useEffect } from 'react'

export function MobileNav() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const navItems = [
    { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { href: '/dashboard/reports', label: t('nav.reports'), icon: FolderOpen },
    { href: '/dashboard/messages', label: t('nav.messages'), icon: Mail },
    { href: '/dashboard/chat', label: t('nav.chat'), icon: MessageSquare },
    { href: '/dashboard/analytics', label: t('nav.analytics'), icon: BarChart3 },
    { href: '/dashboard/family', label: t('nav.family'), icon: Users },
    { href: '/dashboard/settings', label: t('nav.settings'), icon: Settings },
  ]

  return (
    <>
      {/* Top bar for mobile */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/40 glass-panel-strong lg:hidden pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Logo size="md" />
        <div className="flex items-center gap-2">
          <Show when="signed-in">
            <UserMenu />
          </Show>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors"
          >
            {isOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="lg:hidden glass-panel-strong border-b border-outline-variant/40 px-4 py-3">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isPending = pendingHref === item.href
              const isActive =
                isPending ||
                (item.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (item.href !== pathname) setPendingHref(item.href)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200 active:bg-surface-container',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/10'
                      : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                  )}
                >
                  <item.icon className={cn('size-4 shrink-0', isActive && 'text-primary')} />
                  <span>{item.label}</span>
                  {isPending && (
                    <span className="ml-auto flex size-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                      <span className="relative inline-flex rounded-full size-2 bg-secondary" />
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}
