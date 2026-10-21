import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import { mapToUserRow, type NormalizedUser } from './provisioning-map'

export {
  fromUserJSON,
  fromUserResource,
  fromSupabaseUser,
  mapToUserRow,
  type NormalizedUser,
} from './provisioning-map'

type AdminClient = SupabaseClient<Database>

/**
 * Upsert the users row and ensure the matching patients profile exists.
 */
export async function provisionUser(
  admin: AdminClient,
  user: NormalizedUser,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = mapToUserRow(user)
  if (!row) return { ok: false, error: 'user has no email address' }

  const { error: userError } = await admin
    .from('users')
    .upsert(row, { onConflict: 'id' })

  if (userError) {
    if (userError.code !== '23505') {
      return { ok: false, error: `users upsert: ${userError.message}` }
    }
    const { error: reconcileError } = await admin
      .from('users')
      .delete()
      .eq('email', row.email)
      .neq('id', row.id)
    if (reconcileError) {
      return { ok: false, error: `users email reconcile: ${reconcileError.message}` }
    }
    const { error: retryError } = await admin
      .from('users')
      .upsert(row, { onConflict: 'id' })
    if (retryError) {
      return { ok: false, error: `users upsert retry: ${retryError.message}` }
    }
  }

  // Idempotent patient provisioning
  const { error: patientError } = await admin
    .from('patients')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
  if (patientError) {
    return { ok: false, error: `patients upsert: ${patientError.message}` }
  }

  return { ok: true }
}

/**
 * Delete the users row (patients/reports/... cascade via FK) and remove user's uploaded files.
 */
export async function deprovisionUser(
  admin: AdminClient,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const storageError = await removeUserStorage(admin, userId)
  if (storageError) {
    return { ok: false, error: `storage cleanup: ${storageError}` }
  }

  const { error } = await admin.from('users').delete().eq('id', userId)
  if (error) return { ok: false, error: `users delete: ${error.message}` }

  return { ok: true }
}

async function removeUserStorage(
  admin: AdminClient,
  userId: string,
): Promise<string | null> {
  const bucket = admin.storage.from('reports')
  const pageSize = 100
  let offset = 0

  for (;;) {
    const { data: objects, error: listError } = await bucket.list(userId, {
      limit: pageSize,
      offset,
    })
    if (listError) return listError.message
    if (!objects || objects.length === 0) break

    const paths = objects.map((o) => `${userId}/${o.name}`)
    const { error: removeError } = await bucket.remove(paths)
    if (removeError) return removeError.message

    if (objects.length < pageSize) break
    offset += pageSize
  }

  return null
}
