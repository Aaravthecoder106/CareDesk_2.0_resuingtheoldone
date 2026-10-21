import 'server-only'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex')
}

export async function hasLibraryPassword(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase
    .from('library_settings')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return !!data
}

export async function setLibraryPassword(
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const salt = crypto.randomBytes(16).toString('hex')
  const passwordHash = hashPassword(password, salt)

  const { error } = await supabase
    .from('library_settings')
    .upsert(
      { user_id: user.id, password_hash: passwordHash, salt },
      { onConflict: 'user_id' }
    )

  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function verifyLibraryPassword(
  password: string
): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('library_settings')
    .select('password_hash, salt')
    .eq('user_id', user.id)
    .maybeSingle()

  // No password set -> library is unlocked. A read error must fail CLOSED.
  if (error) return false
  if (!data) return true

  const hash = Buffer.from(hashPassword(password, data.salt), 'hex')
  const stored = Buffer.from(data.password_hash, 'hex')
  return hash.length === stored.length && crypto.timingSafeEqual(hash, stored)
}

export async function removeLibraryPassword(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('library_settings')
    .delete()
    .eq('user_id', user.id)

  return !error
}
