import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { logAudit } from '@/lib/data/audit'
import type { Tables } from '@/lib/supabase/types'

export async function getReports(targetPatientId?: string): Promise<Tables<'reports'>[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const patientId = targetPatientId && targetPatientId !== user.id ? targetPatientId : user.id

  if (patientId !== user.id) {
    // Verify accepted Care Circle link
    const admin = createAdminSupabaseClient()
    const { data: link } = await admin
      .from('family_members')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(owner_id.eq.${user.id},member_id.eq.${patientId}),and(owner_id.eq.${patientId},member_id.eq.${user.id})`)
      .maybeSingle()

    if (!link) {
      throw new Error("Unauthorized to view this patient's reports")
    }

    const { data, error } = await admin
      .from('reports')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })

    if (error) throw new Error(`getReports: ${error.message}`)
    return data || []
  }

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('patient_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`getReports: ${error.message}`)
  return data || []
}

export async function getReport(id: string): Promise<Tables<'reports'> | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', id)
    .single()

  if (!error && data) {
    if (data.patient_id === user.id) return data

    // Check if user is linked caregiver/family member
    const admin = createAdminSupabaseClient()
    const { data: link } = await admin
      .from('family_members')
      .select('id')
      .eq('status', 'accepted')
      .or(`and(owner_id.eq.${user.id},member_id.eq.${data.patient_id}),and(owner_id.eq.${data.patient_id},member_id.eq.${user.id})`)
      .maybeSingle()

    if (link) return data
  }

  return null
}

export async function createReport(
  title: string,
  filePath: string,
  mimeType: string
): Promise<Tables<'reports'> | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('reports')
    .insert({
      patient_id: user.id,
      title,
      file_path: filePath,
      mime_type: mimeType,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw new Error(`createReport: ${error.message}`)
  return data
}

export async function deleteReport(id: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: report } = await supabase
    .from('reports')
    .select('file_path')
    .eq('id', id)
    .eq('patient_id', user.id)
    .single()

  if (report) {
    await supabase.storage.from('reports').remove([report.file_path])
  }

  const { error } = await supabase
    .from('reports')
    .delete()
    .eq('id', id)
    .eq('patient_id', user.id)

  if (!error) {
    await logAudit({ actorId: user.id, action: 'DELETE', table: 'reports', recordId: id })
  }

  return !error
}

export async function getReportUrl(filePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage
    .from('reports')
    .createSignedUrl(filePath, 3600)

  return data?.signedUrl || null
}
