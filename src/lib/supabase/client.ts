import { createBrowserClient } from '@supabase/ssr'
import { env } from '@/env'
import type { Database } from './types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Supabase client for client-side components (runs in browser).
 * Uses browser cookies for automatic session management.
 */
export function createClient() {
  if (typeof window === 'undefined') {
    return createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }

  if (!client) {
    client = createBrowserClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
  }
  return client
}

// Named alias for convenience
export const createBrowserSupabaseClient = createClient
