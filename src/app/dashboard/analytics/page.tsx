'use client'

import { useState, useEffect, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/language-context'
import { BarChart3, RefreshCw, Loader2, TrendingUp, Pill, AlertCircle, FileText, MessageSquare, Sparkles, User, Heart, Users, FolderOpen } from 'lucide-react'
import { AiOrb } from '@/components/ai-orb'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useUser } from '@/components/auth-context'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'

interface AnalyticsData {
  labTrends?: { test: string; values: { date: string; value: number; unit: string; flag: string }[] }[]
  medicationSummary?: { active: number; total: number }
  conditionSummary?: { active: number; resolved: number; chronic: number }
  reportStats?: { total: number; processed: number; pending: number }
  healthScore?: number
  insights?: string[]
}

interface FamilySnapshot {
  user_id: string
  name: string
  data: AnalyticsData
}

const COLORS = ['#0059bb', '#00E0FF', '#a9c7ff', '#002b5b']

function AnalyticsContent() {
  const { t } = useLanguage()
  const { user } = useUser()
  const isCaregiver = user?.role === 'caregiver' || user?.user_metadata?.elder_care_role === 'caregiver'
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view') || 'me'

  const [ownData, setOwnData] = useState<AnalyticsData | null>(null)
  const [family, setFamily] = useState<FamilySnapshot[]>([])
  const [viewing, setViewing] = useState<string>(viewParam)
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [isCaregiver])

  useEffect(() => {
    if (viewParam && viewParam !== viewing) {
      setViewing(viewParam)
    }
  }, [viewParam])

  async function fetchAnalytics() {
    setLoading(true)
    try {
      const res = await fetch('/api/analytics/data')
      const json = await res.json()
      setOwnData(json.data || null)
      const fam = json.family || []
      setFamily(fam)
      if (isCaregiver && fam.length > 0 && (viewing === 'me' || !viewing)) {
        setViewing(fam[0].user_id)
      }
    } catch {
      console.error('Failed to fetch analytics')
    }
    setLoading(false)
  }

  async function handleRegenerate() {
    setRegenerating(true)
    try {
      const res = await fetch('/api/analytics/regenerate', { method: 'POST' })
      const json = await res.json()
      if (json.ok) setOwnData(json.data)
    } catch {
      console.error('Failed to regenerate')
    }
    setRegenerating(false)
  }

  const viewingFamily = family.find((f) => f.user_id === viewing)
  const data = viewing === 'me' ? ownData : viewingFamily?.data ?? null

  const labChartData = data?.labTrends?.flatMap(trend =>
    trend.values.map(v => ({
      name: trend.test,
      date: v.date,
      value: v.value,
      unit: v.unit,
    }))
  ) || []

  const conditionData = data?.conditionSummary
    ? [
        { name: t('analytics.chart.active'), value: data.conditionSummary.active || 0 },
        { name: t('analytics.chart.chronic'), value: data.conditionSummary.chronic || 0 },
        { name: t('analytics.chart.resolved'), value: data.conditionSummary.resolved || 0 },
      ].filter(d => d.value > 0)
    : []

  const reportData = data?.reportStats
    ? [
        { name: t('analytics.chart.processed'), value: data.reportStats.processed || 0 },
        { name: t('analytics.chart.pending'), value: data.reportStats.pending || 0 },
      ]
    : []

  const statCards = [
    { label: t('analytics.healthScore'), value: data?.healthScore || '—', icon: TrendingUp, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: t('analytics.activeMedications'), value: data?.medicationSummary?.active || 0, icon: Pill, color: 'text-electric-blue', bg: 'bg-electric-blue/10' },
    { label: t('analytics.conditions'), value: data?.conditionSummary?.active || 0, icon: AlertCircle, color: 'text-primary', bg: 'bg-primary/10' },
    { label: t('analytics.reports'), value: data?.reportStats?.total || 0, icon: FileText, color: 'text-secondary', bg: 'bg-secondary/10' },
  ]

  return (
    <div className="p-4 sm:p-5 md:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-deep-navy">
            {isCaregiver ? 'Patient Medical Stats & Biomarkers' : 'Health Analytics & Biomarkers'}
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-on-surface-variant">
            {isCaregiver
              ? 'Interactive biomarker tracking, vital trends, and lab results for your connected patients.'
              : 'Interactive biomarker tracking, medication adherence, and health trends for you and connected patients.'}
          </p>
        </div>
        {!isCaregiver && viewing === 'me' && (
          <Button onClick={handleRegenerate} disabled={regenerating} variant="outline" className="w-full sm:w-auto border-outline-variant/50 hover:bg-surface-container">
            {regenerating ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            {t('analytics.regenerate')}
          </Button>
        )}
      </div>

      {/* If caregiver has no connected patients */}
      {isCaregiver && family.length === 0 && (
        <div className="glass-panel organic-radius p-8 text-center max-w-lg mx-auto my-10 border border-white">
          <div className="size-14 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mx-auto mb-3">
            <BarChart3 className="size-7" />
          </div>
          <h3 className="text-[17px] font-bold text-deep-navy">No Connected Patients Yet</h3>
          <p className="mt-1.5 text-[13px] text-on-surface-variant leading-relaxed">
            As a caregiver, you monitor the medical stats, glucose, BP, and vital trends of your connected patients. Connect your patients first to view their health metrics.
          </p>
          <Link
            href="/dashboard/family"
            className="mt-4 btn-primary-gradient px-4 py-2 rounded-xl text-[13px] font-bold inline-flex items-center gap-2"
          >
            <Users className="size-4" />
            <span>Connect Patients</span>
          </Link>
        </div>
      )}

      {/* Patient Switcher Tabs */}
      {family.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 bg-surface-container-low/70 p-2 rounded-2xl border border-outline-variant/30">
          {!isCaregiver && (
            <button
              onClick={() => setViewing('me')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                viewing === 'me'
                  ? 'bg-primary text-white shadow-sm ring-1 ring-secondary/50'
                  : 'bg-white text-on-surface-variant hover:bg-white/80 border border-outline-variant/40'
              }`}
            >
              <User className="size-3.5" />
              <span>My Analytics</span>
            </button>
          )}
          {family.map((f) => (
            <button
              key={f.user_id}
              onClick={() => setViewing(f.user_id)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
                viewing === f.user_id
                  ? 'bg-primary text-white shadow-sm ring-2 ring-secondary'
                  : 'bg-white text-deep-navy hover:bg-white/80 border border-outline-variant/40'
              }`}
            >
              <Heart className="size-3.5" />
              <span>{f.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Active Patient Banner */}
      {viewing !== 'me' && viewingFamily && (
        <div className="mb-6 glass-panel rounded-2xl p-4 border border-secondary/30 bg-secondary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-[14px] font-bold text-deep-navy">
                Viewing Medical Stats for {viewingFamily.name}
              </p>
              <p className="text-[12px] text-on-surface-variant">
                Live biomarkers, active medications, and condition status from verified medical records.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <Link
              href={`/dashboard/chat?patient=${viewingFamily.user_id}`}
              className="btn-primary-gradient px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <MessageSquare className="size-3.5" />
              <span>Ask AI About {viewingFamily.name.split(' ')[0]}</span>
            </Link>
            <Link
              href={`/dashboard/reports?patientId=${viewingFamily.user_id}`}
              className="bg-white hover:bg-white/90 text-deep-navy border border-outline-variant/50 px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <FolderOpen className="size-3.5 text-secondary" />
              <span>Reports</span>
            </Link>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-6 animate-fadeIn py-2">
          <div className="flex justify-center py-4">
            <AiOrb mode="report" size={20} state="solving" statusText="Analyzing health trends & biomarkers...." />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="size-9 rounded-xl bg-surface-container-high/70 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-20 bg-surface-container/70 rounded animate-pulse" />
                  <div className="h-6 w-16 bg-surface-container-high/80 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            {statCards.map((card) => (
              <div key={card.label} className="glass-panel rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`size-8 sm:size-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                    <card.icon className={`size-4 sm:size-5 ${card.color}`} />
                  </div>
                  <div>
                    <span className="text-[11px] sm:text-[12px] font-medium text-on-surface-variant line-clamp-1">{card.label}</span>
                    <span className="text-[18px] sm:text-[22px] font-bold text-deep-navy">{card.value}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* AI Insights */}
          {data?.insights && data.insights.length > 0 && (
            <div className="mb-6 sm:mb-8 glass-panel rounded-xl p-4 sm:p-6 border border-electric-blue/15 ai-glow">
              <h3 className="text-[15px] sm:text-[16px] font-semibold text-deep-navy mb-2 sm:mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                {viewing !== 'me' && viewingFamily ? `${viewingFamily.name.split(' ')[0]}'s AI Clinical Insights` : t('analytics.aiInsights')}
              </h3>
              <ul className="space-y-1.5 sm:space-y-2">
                {data.insights.map((insight, i) => (
                  <li key={i} className="text-[13px] sm:text-[14px] text-on-surface flex items-start gap-2">
                    <span className="text-secondary mt-0.5">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {conditionData.length > 0 && (
              <div className="glass-panel organic-radius p-4 sm:p-5">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-deep-navy mb-3 sm:mb-4">{t('analytics.conditionsBreakdown')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={conditionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {conditionData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {reportData.length > 0 && (
              <div className="glass-panel organic-radius p-4 sm:p-5">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-deep-navy mb-3 sm:mb-4">{t('analytics.reportStatus')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reportData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#c4c6d0" />
                    <XAxis dataKey="name" fontSize={12} tick={{ fill: '#43474f' }} />
                    <YAxis fontSize={12} tick={{ fill: '#43474f' }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0059bb" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {labChartData.length > 1 && (
              <div className="glass-panel organic-radius p-4 sm:p-5">
                <h3 className="text-[15px] sm:text-[16px] font-semibold text-deep-navy mb-3 sm:mb-4">{t('analytics.labTimeline')}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={labChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#c4c6d0" />
                    <XAxis dataKey="date" fontSize={12} tick={{ fill: '#43474f' }} />
                    <YAxis fontSize={12} tick={{ fill: '#43474f' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#0059bb" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex justify-center">
        <AiOrb mode="report" size={20} state="solving" statusText="Loading analytics...." />
      </div>
    }>
      <AnalyticsContent />
    </Suspense>
  )
}
