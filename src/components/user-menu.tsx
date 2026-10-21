'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Loader2, Settings, Sparkles } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuth, useUser } from '@/components/auth-context'

export function UserMenu() {
  const router = useRouter()
  const { signOut } = useAuth()
  const { user, isLoaded, isSignedIn } = useUser()
  const [signingOut, setSigningOut] = useState(false)

  if (!isLoaded) {
    return <div className="size-8 animate-pulse rounded-full bg-surface-container" aria-hidden />
  }

  if (!isSignedIn || !user) return null

  const name = user.fullName || user.firstName || 'Account'
  const email = user.email ?? ''
  const initials = name
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      window.location.assign('/sign-in')
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-secondary/40"
        aria-label="Account menu"
      >
        <Avatar className="size-8 border border-outline-variant/40">
          {user.imageUrl && <AvatarImage src={user.imageUrl} alt={name} />}
          <AvatarFallback className="bg-secondary/15 text-[11px] font-semibold text-deep-navy">
            {initials || '?'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="px-2 py-1.5">
          <p className="truncate text-sm font-semibold text-deep-navy">{name}</p>
          {email && <p className="truncate text-xs font-normal text-on-surface-variant">{email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="gap-2 px-2 py-2 text-sm"
          onClick={() => router.push('/dashboard/settings')}
        >
          <Settings className="size-4 text-on-surface-variant" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={signingOut}
          className="gap-2 px-2 py-2 text-sm"
          onClick={handleSignOut}
        >
          {signingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
