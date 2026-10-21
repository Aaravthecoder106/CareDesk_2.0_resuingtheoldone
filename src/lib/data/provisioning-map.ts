import type { TablesInsert } from '@/lib/supabase/types'

export type NormalizedUser = {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
}

export interface UserJSONLike {
  id: string
  first_name?: string | null
  last_name?: string | null
  primary_email_address_id?: string | null
  email_addresses: Array<{ id: string; email_address: string }>
}

export interface UserResourceLike {
  id: string
  firstName?: string | null
  lastName?: string | null
  primaryEmailAddressId?: string | null
  emailAddresses: Array<{ id: string; emailAddress: string }>
}

export interface SupabaseAuthUserLike {
  id: string
  email?: string | null
  user_metadata?: {
    first_name?: string
    last_name?: string
    full_name?: string
    [key: string]: unknown
  }
}

/** Normalize a Supabase Auth User object */
export function fromSupabaseUser(user: SupabaseAuthUserLike): NormalizedUser {
  const firstName =
    user.user_metadata?.first_name ||
    user.user_metadata?.full_name?.split(' ')[0] ||
    null
  const lastName =
    user.user_metadata?.last_name ||
    user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ||
    null

  return {
    id: user.id,
    email: user.email ?? null,
    firstName,
    lastName,
  }
}

/** Normalize a payload with snake_case email addresses */
export function fromUserJSON(user: UserJSONLike): NormalizedUser {
  const primary = user.email_addresses.find(
    (e) => e.id === user.primary_email_address_id,
  )
  const email =
    primary?.email_address ?? user.email_addresses[0]?.email_address ?? null
  return {
    id: user.id,
    email,
    firstName: user.first_name ?? null,
    lastName: user.last_name ?? null,
  }
}

/** Normalize a resource with camelCase email addresses */
export function fromUserResource(user: UserResourceLike): NormalizedUser {
  const primary = user.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )
  const email =
    primary?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null
  return {
    id: user.id,
    email,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
  }
}

/** Map a normalized user to a public.users insert row. */
export function mapToUserRow(
  user: NormalizedUser,
): TablesInsert<'users'> | null {
  if (!user.email) return null
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
  }
}
