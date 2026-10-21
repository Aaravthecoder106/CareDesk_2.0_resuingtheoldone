import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { logAudit } from '@/lib/data/audit'
import type { Tables } from '@/lib/supabase/types'

export async function getReports(): Promise<Tables<'reports'>[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

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
    .eq('patient_id', user.id)
    .single()

  if (error) return null
  return data
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
