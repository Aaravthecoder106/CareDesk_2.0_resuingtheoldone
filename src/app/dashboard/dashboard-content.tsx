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
} from 'lucide-react'
import Link from 'next/link'

interface DashboardContentProps {
  firstName?: string | null
  hasPatient: boolean
}

export function DashboardContent({ firstName, hasPatient }: DashboardContentProps) {
  const { t } = useLanguage()

  const quickActions = [
    {
      icon: Users,
      title: 'Elder Care Circle',
      description: 'Pair with senior parents or caregivers via instant Care Code',
      href: '/dashboard/family',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
      badge: 'Game Pairing',
    },
    {
      icon: MessageSquare,
      title: 'AI Health Consult',
      description: 'Ask clinical and caregiving questions about connected elders',
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
      {/* Header with ElderCare branding */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white tracking-wide uppercase">
              CareDesk ElderCare
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
            Your connected elder health command center. Review live vitals, shared medical records, and AI care recommendations.
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

      {/* Featured Elder Care Banner */}
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
                  Keep Aging Parents & Family Caregivers In Complete Sync
                </h2>
                <p className="text-[13px] sm:text-[14px] text-on-surface-variant leading-relaxed">
                  Generate a friendly 6-character Care Code (e.g. <code className="font-mono font-bold text-deep-navy">CARE-782</code>) to connect elders and caregivers in 10 seconds. Unlocks shared blood panels, prescription alerts, and AI health consults.
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/dashboard/family"
                  className="bg-primary text-white hover:bg-primary/90 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <Users className="size-4" />
                  <span>Open Care Circle</span>
                </Link>
                <Link
                  href="/dashboard/chat"
                  className="bg-white/80 hover:bg-white text-deep-navy border border-outline-variant/60 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all inline-flex items-center gap-2"
                >
                  <MessageSquare className="size-4 text-secondary" />
                  <span>Ask AI Consult</span>
                </Link>
              </div>
            </div>
          </div>
        </BorderBeam>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickActions.map((action) => (
          <Link key={action.href} href={action.href} className="block group">
            <div className="glass-panel organic-radius p-5 sm:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98] active:ring-2 active:ring-secondary/40 cursor-pointer h-full select-none group-hover:border-secondary/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${action.bg} flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                    <action.icon className={`size-6 ${action.color}`} />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                    {action.badge}
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-deep-navy mb-1.5">{action.title}</h3>
                <p className="text-[13px] text-on-surface-variant leading-[20px]">
                  {action.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-outline-variant/20 flex items-center gap-1 text-[12px] font-semibold text-secondary group-hover:translate-x-1 transition-transform">
                <span>Access Feature</span>
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

      {/* Security & HIPAA Compliance Badge */}
      <div className="mt-8 glass-panel rounded-2xl p-5 flex items-center gap-4 border border-white">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Shield className="size-6 text-primary" />
        </div>
        <div>
          <h3 className="text-[15px] font-bold text-deep-navy">Private, Secure & Protected</h3>
          <p className="text-[13px] text-on-surface-variant">
            Row-level encryption protects all senior health files and caregiver communications. Data is only accessible to authorized Care Circle members.
          </p>
        </div>
      </div>
    </div>
  )
}
