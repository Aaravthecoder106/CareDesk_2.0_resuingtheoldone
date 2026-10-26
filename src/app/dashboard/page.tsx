import { ensureCurrentUserProvisioned, getCurrentPatient } from '@/lib/data/users'
import { getCriticalAttentionAlerts } from '@/lib/data/messages'
import { getFamilyMembers } from '@/lib/data/family'
import { createClient } from '@/lib/supabase/server'
import { DashboardContent } from './dashboard-content'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await ensureCurrentUserProvisioned()
  const patient = await getCurrentPatient()

  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  const role = (authUser?.user_metadata?.elder_care_role || authUser?.user_metadata?.role || 'caregiver') as 'caregiver' | 'patient'

  const criticalAlerts = await getCriticalAttentionAlerts()
  const members = role === 'caregiver' ? await getFamilyMembers().catch(() => []) : []
  const connectedPatients = members.filter(m => m.status === 'accepted')

  return (
    <DashboardContent
      firstName={user?.first_name}
      hasPatient={!!patient}
      userRole={role}
      criticalAlerts={criticalAlerts}
      connectedPatients={connectedPatients}
    />
  )
}
