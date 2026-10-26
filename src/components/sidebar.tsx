'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Show, useUser } from '@/components/auth-context'
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
  Mail,
} from 'lucide-react'

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useLanguage()
  const { user } = useUser()
  const [pendingHref, setPendingHref] = useState<string | null>(null)

  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  const isCaregiver = user?.role === 'caregiver' || user?.user_metadata?.elder_care_role === 'caregiver'

  const navItems = isCaregiver
    ? [
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/dashboard/family', label: 'Patients', icon: Users },
        { href: '/dashboard/analytics', label: 'Medical Stats', icon: BarChart3 },
        { href: '/dashboard/messages', label: t('nav.messages'), icon: Mail },
        { href: '/dashboard/settings', label: t('nav.settings'), icon: Settings },
      ]
    : [
        { href: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
        { href: '/dashboard/reports', label: t('nav.reports'), icon: FolderOpen },
        { href: '/dashboard/messages', label: t('nav.messages'), icon: Mail },
        { href: '/dashboard/chat', label: t('nav.chat'), icon: MessageSquare },
        { href: '/dashboard/analytics', label: 'Medical Stats', icon: BarChart3 },
        { href: '/dashboard/family', label: 'Caregiver', icon: Users },
        { href: '/dashboard/settings', label: t('nav.settings'), icon: Settings },
      ]

  return (
    <aside className="hidden w-56 shrink-0 border-r border-outline-variant/40 bg-surface-container-low lg:block">
      <div className="flex h-full flex-col">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-outline-variant/30">
          <Logo size="md" />
        </div>

        {/* Nav Items */}
        <nav className="flex-1 space-y-1 p-3 mt-2">
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
                }}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
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

        {/* Account */}
        <div className="border-t border-outline-variant/30 p-3">
          <Show when="signed-in">
            <div className="flex items-center gap-2.5 px-3 py-2">
              <UserMenu />
              <span className="text-xs text-on-surface-variant">{t('nav.account')}</span>
            </div>
          </Show>
        </div>
      </div>
    </aside>
  )
}
