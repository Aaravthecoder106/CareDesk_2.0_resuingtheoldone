'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/language-context'
import { FolderOpen, Upload, Trash2, RefreshCw, FileText, Loader2, Lock, Eye, Users, MessageSquare, Sparkles, User, Heart } from 'lucide-react'
import { AiOrb } from '@/components/ai-orb'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface Report {
  id: string
  title: string
  file_path: string
  mime_type: string | null
  ai_summary: string | null
  status: string
  created_at: string
}

interface FamilyMember {
  id: string
  owner_id: string
  member_id: string
  relation: string | null
  status: string
  display_name?: string
  connected_user_id?: string
}

const STATUS_STYLES: Record<string, string> = {
  pending: 'text-amber-600',
  processing: 'text-blue-600',
  ready: 'text-green-600',
  failed: 'text-destructive',
}

const PRESIGN_THRESHOLD = 3 * 1024 * 1024 // 3 MB

function ReportsContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const initialPatient = searchParams.get('patientId') || 'me'

  const [locked, setLocked] = useState<boolean | null>(null)
  const [gatePassword, setGatePassword] = useState('')
  const [gateError, setGateError] = useState('')
  const [unlocking, setUnlocking] = useState(false)

  const [reports, setReports] = useState<Report[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatient)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [error, setError] = useState('')
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('/api/library/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'status' }),
        })
        const data = await res.json()
        setLocked(!!data.locked)
      } catch {
        setLocked(false)
      }
    })()
    fetchFamily()
  }, [])

  useEffect(() => {
    if (initialPatient && initialPatient !== selectedPatientId) {
      setSelectedPatientId(initialPatient)
    }
  }, [initialPatient])

  async function fetchFamily() {
    try {
      const res = await fetch('/api/family/members')
      if (res.ok) {
        const data = await res.json()
        const accepted = (data.members || []).filter((m: FamilyMember) => m.status === 'accepted')
        setFamilyMembers(accepted)
      }
    } catch (e) {
      console.error('Failed to load family:', e)
    }
  }

  const fetchReports = useCallback(async (showSpinner = true, targetId = selectedPatientId) => {
    if (showSpinner) setLoading(true)
    try {
      const url = targetId === 'me' ? '/api/reports/list' : `/api/reports/list?patientId=${targetId}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.error) setError(data.error)
      setReports(data.reports || [])
    } catch {
      setError(t('reports.errors.fetchFailed'))
    }
    if (showSpinner) setLoading(false)
  }, [t, selectedPatientId])

  useEffect(() => {
    if (locked === false) fetchReports(true, selectedPatientId)
  }, [locked, selectedPatientId, fetchReports])

  useEffect(() => {
    const busy = reports.some((r) => r.status === 'pending' || r.status === 'processing')
    if (!busy) return
    const t2 = setInterval(() => fetchReports(false, selectedPatientId), 4000)
    return () => clearInterval(t2)
  }, [reports, selectedPatientId, fetchReports])

  async function handleUnlock() {
    setUnlocking(true)
    setGateError('')
    try {
      const res = await fetch('/api/library/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', password: gatePassword }),
      })
      const data = await res.json()
      if (data.ok) setLocked(false)
      else setGateError(t('reports.errors.incorrectPassword'))
    } catch {
      setGateError(t('reports.errors.verificationFailed'))
    }
    setUnlocking(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    setUploadProgress('')

    try {
      if (file.size > PRESIGN_THRESHOLD) {
        setUploadProgress('Preparing upload...')
        const presignRes = await fetch('/api/reports/presign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type, fileSize: file.size }),
        })
        const presignData = await presignRes.json()
        if (!presignData.ok) throw new Error(presignData.error || 'Failed to get upload URL')

        setUploadProgress('Uploading file...')
        const uploadRes = await fetch(presignData.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        })
        if (!uploadRes.ok) throw new Error(`Direct upload failed: ${uploadRes.statusText}`)

        setUploadProgress('Finalizing...')
        const finalizeRes = await fetch('/api/reports/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filePath: presignData.filePath,
            fileName: file.name,
            mimeType: file.type || 'application/pdf',
            fileSize: file.size,
          }),
        })
        const finalizeData = await finalizeRes.json()
        if (finalizeData.ok) {
          setReports(prev => [finalizeData.report, ...prev])
        } else {
          setError(finalizeData.error || t('reports.errors.uploadFailed'))
        }
      } else {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/reports/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.ok) {
          setReports(prev => [data.report, ...prev])
        } else {
          setError(data.error || t('reports.errors.uploadFailed'))
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(`Upload failed: ${msg}`)
      console.error('Upload error:', err)
    }
    setUploading(false)
    setUploadProgress('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/reports/delete?id=${id}`, { method: 'DELETE' })
      setReports(prev => prev.filter(r => r.id !== id))
    } catch {
      console.error('Delete failed')
    }
  }

  async function handleReanalyze(id: string) {
    setAnalyzing(id)
    setError('')
    try {
      const res = await fetch('/api/reports/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: id }),
      })
      const data = await res.json()
      if (data.error || data.ok === false) setError(data.error || t('reports.errors.analysisFailed'))
      fetchReports(false, selectedPatientId)
    } catch {
      setError(t('reports.errors.analysisFailed'))
    }
    setAnalyzing(null)
  }

  async function handlePreview(id: string) {
    setPreviewingId(id)
    setError('')
    try {
      const res = await fetch(`/api/reports/preview?id=${id}`)
      const data = await res.json()
      if (data.url) {
        window.open(data.url, '_blank')
      } else {
        setError(data.error || t('reports.errors.previewFailed'))
      }
    } catch {
      setError(t('reports.errors.previewFailed'))
    }
    setPreviewingId(null)
  }

  if (locked === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 animate-fadeIn">
        <AiOrb mode="report" size={20} state="searching" statusText="Verifying medical library access...." />
      </div>
    )
  }

  if (locked) {
    return (
      <div className="p-4 sm:p-5 md:p-8">
        <div className="max-w-md mx-auto mt-12 sm:mt-16 glass-panel organic-radius p-6 sm:p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
              <Lock className="size-6 text-secondary" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold text-deep-navy">{t('reports.locked.title')}</h2>
              <p className="mt-1 text-[14px] text-on-surface-variant">
                {t('reports.locked.desc')}
              </p>
            </div>
            <input
              type="password"
              value={gatePassword}
              onChange={(e) => setGatePassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder={t('reports.locked.placeholder')}
              className="w-full rounded-lg bg-white/50 border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary"
              autoFocus
            />
            {gateError && <p className="text-sm text-destructive">{gateError}</p>}
            <Button className="w-full btn-primary-gradient" onClick={handleUnlock} disabled={unlocking || !gatePassword}>
              {unlocking ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Lock className="mr-2 size-4" />}
              {t('reports.locked.unlock')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const activePatient = familyMembers.find(m => m.connected_user_id === selectedPatientId || m.member_id === selectedPatientId)

  return (
    <div className="p-4 sm:p-5 md:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-deep-navy">Medical Report Library</h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-on-surface-variant">
            Upload, analyze, and review medical documents, blood panels, and clinical histories.
          </p>
        </div>
        <div className="shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleUpload}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn-primary-gradient w-full sm:w-auto">
            {uploading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Upload className="mr-2 size-4" />
            )}
            {uploading && uploadProgress ? uploadProgress : 'Upload Document'}
          </Button>
        </div>
      </div>

      {/* Patient Switcher Tabs */}
      {familyMembers.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2 bg-surface-container-low/70 p-2 rounded-2xl border border-outline-variant/30">
          <button
            onClick={() => setSelectedPatientId('me')}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${
              selectedPatientId === 'me'
                ? 'bg-primary text-white shadow-sm ring-1 ring-secondary/50'
                : 'bg-white text-on-surface-variant hover:bg-white/80 border border-outline-variant/40'
            }`}
          >
            <User className="size-3.5" />
            <span>My Reports</span>
          </button>
          {familyMembers.map((m) => {
            const memberTargetId = m.connected_user_id || m.member_id
            const isSelected = selectedPatientId === memberTargetId
            return (
              <button
                key={m.id}
                onClick={() => setSelectedPatientId(memberTargetId)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-primary text-white shadow-sm ring-2 ring-secondary'
                    : 'bg-white text-deep-navy hover:bg-white/80 border border-outline-variant/40'
                }`}
              >
                <Heart className="size-3.5" />
                <span>{m.display_name}</span>
                {m.relation && <span className="text-[10px] opacity-80 font-normal">({m.relation})</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Active Patient Banner */}
      {activePatient && selectedPatientId !== 'me' && (
        <div className="mb-6 glass-panel rounded-2xl p-4 border border-secondary/30 bg-secondary/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-[14px] font-bold text-deep-navy">
                Viewing Medical Reports for {activePatient.display_name} ({activePatient.relation || 'Connected Patient'})
              </p>
              <p className="text-[12px] text-on-surface-variant">
                Full access enabled via Care Circle. All reports are verified and synchronized in real-time.
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/chat?patient=${activePatient.connected_user_id || activePatient.member_id}`}
            className="btn-primary-gradient px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <MessageSquare className="size-3.5" />
            <span>Ask AI About {activePatient.display_name?.split(' ')[0]}</span>
          </Link>
        </div>
      )}

      {/* Uploading & AI Processing State with Thinking Orb */}
      {uploading && (
        <div className="mb-6 flex justify-center py-2">
          <AiOrb mode="report" size={20} statusText={uploadProgress || undefined} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 glass-panel rounded-xl p-4 border border-destructive/30">
          <p className="text-[14px] text-destructive">{error}</p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-4 animate-fadeIn py-2">
          <div className="flex justify-center py-4">
            <AiOrb mode="report" size={20} state="searching" statusText="Loading medical reports & documents...." />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-surface-container-high/70 animate-pulse" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-44 bg-surface-container-high/80 rounded animate-pulse" />
                    <div className="h-3 w-28 bg-surface-container/70 rounded animate-pulse" />
                  </div>
                </div>
                <div className="h-8 w-20 bg-surface-container/60 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : reports.length === 0 ? (
        <div className="glass-panel organic-radius flex flex-col items-center justify-center py-16 border border-white">
          <AiOrb mode="report" size={64} showLabel={false} className="mb-3" />
          <h3 className="mt-2 text-[16px] font-bold text-deep-navy">
            {activePatient ? `No reports uploaded for ${activePatient.display_name} yet` : t('reports.empty.title')}
          </h3>
          <p className="mt-1 text-[14px] text-on-surface-variant text-center max-w-sm">
            {activePatient
              ? 'Click "Upload Document" to add lab sheets, prescription slips, or clinical PDFs for this patient.'
              : t('reports.empty.desc')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className={`glass-panel rounded-xl p-4 hover:bg-white/60 transition-all duration-200 cursor-pointer border ${report.status === 'failed' ? 'border-destructive/30' : 'border-outline-variant/30'} relative overflow-hidden`}>
              {report.status === 'failed' && (
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive"></div>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                    <FileText className="size-5 text-secondary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[16px] font-semibold text-deep-navy">{report.title}</h3>
                    <p className="text-[12px] text-on-surface-variant">
                      {new Date(report.created_at).toLocaleDateString()}
                      <span className={`ml-2 capitalize ${STATUS_STYLES[report.status] || ''}`}>
                        {report.status === 'ready' ? t('reports.status.analyzed') : report.status}
                        {(report.status === 'pending' || report.status === 'processing') && (
                          <Loader2 className="ml-1 inline size-3 animate-spin" />
                        )}
                      </span>
                    </p>
                    {report.ai_summary && (
                      <div className="mt-2 bg-electric-blue/5 rounded-lg p-2.5 border border-electric-blue/10">
                        <p className="text-[14px] text-on-surface line-clamp-2">
                          {report.ai_summary}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handlePreview(report.id)}
                    disabled={previewingId === report.id}
                    title={t('reports.viewDocument')}
                    className="hover:bg-surface-container"
                  >
                    {previewingId === report.id ? (
                      <Loader2 className="size-4 animate-spin text-secondary" />
                    ) : (
                      <Eye className="size-4 text-on-surface-variant" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleReanalyze(report.id)}
                    disabled={analyzing === report.id}
                    title={t('reports.reanalyze')}
                    className="hover:bg-surface-container"
                  >
                    {analyzing === report.id ? (
                      <Loader2 className="size-4 animate-spin text-secondary" />
                    ) : (
                      <RefreshCw className="size-4 text-on-surface-variant" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDelete(report.id)}
                    className="hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex justify-center">
        <AiOrb mode="report" size={20} state="searching" statusText="Loading Medical Library...." />
      </div>
    }>
      <ReportsContent />
    </Suspense>
  )
}
