'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()

    // Initial user fetch
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    setUser(null)
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const { user, loading, signOut } = useContext(AuthContext)
  return {
    userId: user?.id ?? null,
    user,
    loading,
    isSignedIn: !!user,
    signOut,
  }
}

export function useUser() {
  const { user, loading } = useContext(AuthContext)
  return {
    user: user
      ? {
          id: user.id,
          email: user.email,
          fullName:
            user.user_metadata?.full_name ||
            [user.user_metadata?.first_name, user.user_metadata?.last_name]
              .filter(Boolean)
              .join(' ') ||
            null,
          firstName: user.user_metadata?.first_name || null,
          lastName: user.user_metadata?.last_name || null,
          imageUrl: user.user_metadata?.avatar_url || null,
        }
      : null,
    isLoaded: !loading,
    isSignedIn: !!user,
  }
}

/** Conditional rendering helper matching previous <Show when="signed-in"> API */
export function Show({
  when,
  children,
}: {
  when: 'signed-in' | 'signed-out'
  children: ReactNode
}) {
  const { isSignedIn, loading } = useAuth()

  if (loading) return null

  if (when === 'signed-in' && isSignedIn) return <>{children}</>
  if (when === 'signed-out' && !isSignedIn) return <>{children}</>

  return null
}
