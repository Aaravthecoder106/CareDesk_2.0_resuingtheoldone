'use client'

import { BorderBeam } from 'border-beam'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  FolderOpen,
  MessageSquare,
  BarChart3,
  Users,
  Sparkles,
  Shield,
  Ticket,
  ArrowRight,
  Heart,
  Activity,
  AlertTriangle,
  Mail,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import type { CriticalAttentionAlert } from '@/lib/data/messages'
import type { FamilyMemberWithDetails } from '@/lib/data/family'

interface DashboardContentProps {
  firstName?: string | null
  hasPatient: boolean
  userRole?: 'caregiver' | 'patient'
  criticalAlerts?: CriticalAttentionAlert[]
  connectedPatients?: FamilyMemberWithDetails[]
}

export function DashboardContent({
  firstName,
  hasPatient,
  userRole = 'caregiver',
  criticalAlerts = [],
  connectedPatients = [],
}: DashboardContentProps) {
  const { t } = useLanguage()
  const isCaregiver = userRole === 'caregiver'

  const quickActions = isCaregiver
    ? [
        {
          icon: Users,
          title: 'Connect Patients',
          description: 'Connect your patients you want to care via instant Care Code',
          href: '/dashboard/family',
          color: 'text-secondary',
          bg: 'bg-secondary/10',
          badge: 'Multi-Patient',
        },
        {
          icon: Mail,
          title: 'Care Messages',
          description: 'Review critical AI attention alerts and direct patient care messages',
          href: '/dashboard/messages',
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          badge: `${criticalAlerts.length} Alerts`,
        },
        {
          icon: BarChart3,
          title: 'Patient Medical Stats',
          description: 'Monitor vital trends, blood glucose, BP, and clinical biomarkers',
          href: '/dashboard/analytics',
          color: 'text-primary',
          bg: 'bg-primary/10',
          badge: 'Live Trends',
        },
      ]
    : [
        {
          icon: Heart,
          title: 'Connect Caregiver',
          description: 'Connect your caregiver via instant Care Code',
          href: '/dashboard/family',
          color: 'text-secondary',
          bg: 'bg-secondary/10',
          badge: '1 Caregiver',
        },
        {
          icon: Mail,
          title: 'Care Messages',
          description: 'Review critical AI attention alerts and direct care messages',
          href: '/dashboard/messages',
          color: 'text-rose-600',
          bg: 'bg-rose-50',
          badge: `${criticalAlerts.length} Alerts`,
        },
        {
          icon: MessageSquare,
          title: 'AI Health Consult',
          description: 'Ask AI questions about your lab tests and prescriptions',
          href: '/dashboard/chat',
          color: 'text-electric-blue',
          bg: 'bg-electric-blue/10',
          badge: 'Grounded AI',
        },
        {
          icon: BarChart3,
          title: 'Medical Biomarkers',
          description: 'Track glucose, BP, cholesterol, and condition trends',
          href: '/dashboard/analytics',
          color: 'text-primary',
          bg: 'bg-primary/10',
          badge: 'Live Trends',
        },
        {
          icon: FolderOpen,
          title: 'Report Library',
          description: 'Upload and review verified lab panels & prescriptions',
          href: '/dashboard/reports',
          color: 'text-secondary',
          bg: 'bg-secondary/10',
          badge: 'Auto-Analyzed',
        },
      ]

  return (
    <div className="p-4 sm:p-5 md:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white tracking-wide uppercase">
              {isCaregiver ? 'Caregiver Command Hub' : 'Patient Health Profile'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
              <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Connected & Synced
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[26px] font-bold text-deep-navy">
            {t('dashboard.welcome')}{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-on-surface-variant">
            {isCaregiver
              ? 'Your connected caregiver health command center. Review live vitals, shared medical records, and AI care recommendations.'
              : 'Your health records and vital biomarker trends. Connected with your caregiver for continuous care.'}
          </p>
        </div>

        <Link
          href="/dashboard/family"
          className="btn-primary-gradient px-4 py-2.5 rounded-xl text-[13px] font-bold inline-flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Ticket className="size-4" />
          <span>Care Code Pairing</span>
        </Link>
      </div>

      {/* CRITICAL MESSAGE BOX IN CAREGIVER */}
      {isCaregiver && (
        <div className="mb-8">
          <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-r from-rose-50/70 via-white to-amber-50/40 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[17px] font-bold text-deep-navy">Critical AI Attention Alerts</h2>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                      Caregiver Attention Box
                    </span>
                  </div>
                  <p className="text-[12px] sm:text-[13px] text-on-surface-variant">
                    When AI identifies abnormal labs or conditions requiring clinical attention, automated alerts are sent here.
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard/messages"
                className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-[12px] font-bold inline-flex items-center gap-1.5 shadow-2xs"
              >
                <span>Open All Messages</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {criticalAlerts.length === 0 ? (
              <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-4 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div className="text-[13px] text-emerald-900">
                  <strong>Normal status:</strong> All connected patient biomarkers are within expected limits. AI real-time monitoring is active.
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {criticalAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-rose-200 bg-white p-3.5 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                          {alert.severity === 'critical' ? 'Critical' : 'Attention'}
                        </span>
                        <span className="text-[11px] font-semibold text-deep-navy">
                          Patient: {alert.patientName}
                        </span>
                      </div>
                      <h4 className="text-[13px] font-bold text-deep-navy line-clamp-1 mb-1">
                        {alert.title}
                      </h4>
                      <p className="text-[12px] text-on-surface-variant line-clamp-2 mb-2 leading-relaxed">
                        {alert.message}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between text-[11px]">
                      {alert.testName ? (
                        <span className="font-mono text-rose-600 font-bold">
                          {alert.testName}: {alert.value ?? ''} {alert.unit ?? ''}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant">AI Alert</span>
                      )}
                      <Link
                        href={`/dashboard/chat?patient=${alert.patientId}`}
                        className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>Ask AI</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Featured Pairing Banner */}
      <div className="mb-8">
        <BorderBeam size="md" colorVariant="ocean" strength={0.7} theme="light">
          <div className="glass-panel-strong rounded-2xl p-5 sm:p-6 border border-electric-blue/30 bg-gradient-to-r from-secondary/10 via-white/80 to-electric-blue/10 shadow-sm relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 text-secondary font-bold text-[12px] uppercase tracking-wider">
                  <Sparkles className="size-4" />
                  <span>Instant Game-Style Invite & Connect</span>
                </div>
                <h2 className="text-[17px] sm:text-[19px] font-bold text-deep-navy">
                  Keep Caregivers & Patients In Complete Sync
                </h2>
                <p className="text-[13px] sm:text-[14px] text-on-surface-variant leading-relaxed">
                  Generate a friendly 6-character Care Code (e.g. <code className="font-mono font-bold text-deep-navy">CARE-782</code>) to connect caregivers and patients in 10 seconds. Unlocks shared blood panels, prescription alerts, and AI health consults.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/dashboard/family"
                  className="bg-primary text-white hover:bg-primary/90 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <Users className="size-4" />
                  <span>{isCaregiver ? 'Connect Patients' : 'Connect Caregiver'}</span>
                </Link>
                {!isCaregiver && (
                  <Link
                    href="/dashboard/chat"
                    className="bg-white/80 hover:bg-white text-deep-navy border border-outline-variant/60 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all inline-flex items-center gap-2"
                  >
                    <MessageSquare className="size-4 text-secondary" />
                    <span>Ask AI Consult</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </BorderBeam>
      </div>

      {/* Connected Patients Health Monitoring (Caregivers Only) */}
      {isCaregiver && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="size-5 text-secondary" />
              <h2 className="text-[18px] font-bold text-deep-navy">Connected Patients Health Monitoring</h2>
            </div>
            <Link href="/dashboard/family" className="text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
              <span>Manage Patients ({connectedPatients.length})</span>
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {connectedPatients.length === 0 ? (
            <div className="glass-panel organic-radius p-6 border border-white flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                  <Users className="size-5" />
                </div>
                <div>
                  <h4 className="text-[14px] font-bold text-deep-navy">No Connected Patients Yet</h4>
                  <p className="text-[12px] text-on-surface-variant">
                    Connect your patients you want to care for to monitor their medical stats, review reports, and consult AI.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/family" className="btn-primary-gradient px-4 py-2 rounded-xl text-[12px] font-bold shrink-0">
                Connect Patient Now
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connectedPatients.map((patient) => {
                const displayName = patient.display_name || 'Connected Patient'
                const patientId = patient.connected_user_id || patient.member_id

                return (
                  <div key={patient.id} className="glass-panel-strong rounded-2xl p-5 border border-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-9 rounded-full bg-secondary/15 flex items-center justify-center font-bold text-secondary text-xs border border-secondary/20">
                            PT
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-deep-navy">{displayName}</h4>
                            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Monitoring
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-outline-variant/20 grid grid-cols-2 gap-2 text-[12px]">
                      <Link
                        href={`/dashboard/chat?patient=${patientId}`}
                        className="px-2.5 py-1.5 rounded-lg bg-primary text-white font-semibold text-center hover:bg-primary/90 flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <Sparkles className="size-3.5" />
                        <span>Ask AI</span>
                      </Link>

                      <Link
                        href={`/dashboard/analytics?view=${patientId}`}
                        className="px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary font-semibold text-center hover:bg-secondary/20 flex items-center justify-center gap-1.5"
                      >
                        <BarChart3 className="size-3.5" />
                        <span>Medical Stats</span>
                      </Link>

                      <Link
                        href={`/dashboard/reports?patientId=${patientId}`}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container text-deep-navy font-semibold text-center hover:bg-surface-container-high flex items-center justify-center gap-1.5"
                      >
                        <FolderOpen className="size-3.5" />
                        <span>Reports</span>
                      </Link>

                      <Link
                        href="/dashboard/messages"
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-semibold text-center hover:bg-rose-100 flex items-center justify-center gap-1.5 border border-rose-200/60"
                      >
                        <Mail className="size-3.5" />
                        <span>Messages</span>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Quick Actions Grid */}
      <div className={`grid gap-4 sm:grid-cols-2 ${isCaregiver ? 'lg:grid-cols-3' : 'lg:grid-cols-5'}`}>
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="block group">
            <div className="glass-panel organic-radius p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] active:ring-2 active:ring-secondary/40 cursor-pointer h-full select-none group-hover:border-secondary/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <action.icon className={`size-6 ${action.color}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                    {action.badge}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold text-deep-navy mb-1.5">{action.title}</h3>
                <p className="text-[12px] text-on-surface-variant leading-[19px]">
                  {action.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center gap-1 text-[12px] font-semibold text-secondary group-hover:translate-x-1 transition-transform">
                <span>Access</span>
                <ArrowRight className="size-3.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Profile Setup Notice */}
      {!hasPatient && (
        <div className="mt-6 glass-panel organic-radius p-5 border border-electric-blue/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-electric-blue/10 flex items-center justify-center shrink-0">
              <Sparkles className="size-5 text-electric-blue" />
            </div>
            <p className="text-[14px] text-on-surface">
              {t('dashboard.profileSetup')}
            </p>
          </div>
        </div>
      )}

      {/* Security Compliance Badge */}
      <div className="mt-8 glass-panel rounded-2xl p-5 flex items-center gap-4 border border-white">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="size-6 text-primary" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-deep-navy">Private, Secure & Protected</h3>
          <p className="text-[13px] text-on-surface-variant">
            Row-level encryption protects all patient health files and caregiver communications. Data is only accessible to authorized connected caregivers and patients.
          </p>
        </div>
      </div>
    </div>
  )
}
