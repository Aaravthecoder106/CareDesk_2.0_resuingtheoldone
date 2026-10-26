'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { BorderBeam } from 'border-beam'
import { useUser } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/language-context'
import {
  Users,
  Check,
  X,
  Trash2,
  Loader2,
  Mail,
  Bell,
  Copy,
  Ticket,
  MessageCircle,
  Share2,
  Shield,
  Heart,
  BarChart3,
  MessageSquare,
  FileText,
  Sparkles,
  ArrowRight,
  Info,
} from 'lucide-react'
import { AiOrb } from '@/components/ai-orb'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface FamilyMember {
  id: string
  owner_id: string
  member_id: string
  relation: string | null
  status: string
  created_at: string
  display_name?: string
  member_email?: string
  connected_user_id?: string
}

interface Invite {
  id: string
  email: string
  relation: string | null
  token: string
  status: string
  created_at: string
}

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

function FamilyContent() {
  const { user } = useUser()
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const initialCode = searchParams.get('code') || ''

  const [members, setMembers] = useState<FamilyMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRelation, setInviteRelation] = useState('')
  const [inviting, setInviting] = useState(false)
  const [message, setMessage] = useState('')
  const [acceptCode, setAcceptCode] = useState(initialCode)
  const [accepting, setAccepting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeCareCode, setActiveCareCode] = useState<string | null>(null)

  const isCaregiver = user?.role === 'caregiver' || user?.user_metadata?.elder_care_role === 'caregiver' || user?.role !== 'patient'

  const fetchData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const [membersRes, invitesRes, notifRes] = await Promise.all([
        fetch('/api/family/members'),
        fetch('/api/family/invites'),
        fetch('/api/notifications'),
      ])
      const membersData = await membersRes.json()
      const invitesData = await invitesRes.json()
      const notifData = await notifRes.json()
      setMembers(membersData.members || [])
      setInvites(invitesData.invites || [])
      setNotifications((notifData.notifications || []).filter((n: Notification) => !n.read_at))
    } catch {
      console.error('Failed to fetch connection data')
    }
    if (showSpinner) setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (initialCode && !acceptCode) {
      setAcceptCode(initialCode)
    }
  }, [initialCode, acceptCode])

  const acceptedMembers = members.filter((m) => m.status === 'accepted')
  const patientAlreadyHasCaregiver = !isCaregiver && acceptedMembers.length >= 1

  async function handleGenerateQuickCareCode() {
    if (patientAlreadyHasCaregiver) {
      setMessage('Patients can only connect to 1 caregiver. Disconnect your existing caregiver first to link a new one.')
      return
    }

    setInviting(true)
    setMessage('')
    try {
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '',
          relation: inviteRelation || (isCaregiver ? 'Patient' : 'Caregiver'),
        }),
      })
      const data = await res.json()
      if (data.ok && data.token) {
        setActiveCareCode(data.token)
        setMessage(`Care Code generated: ${data.token}! Share it with your ${isCaregiver ? 'patient' : 'caregiver'} to pair.`)
        fetchData(false)
      } else {
        setMessage(data.error || 'Failed to generate Care Code')
      }
    } catch {
      setMessage('Failed to generate Care Code')
    }
    setInviting(false)
  }

  async function handleInviteWithEmail() {
    if (patientAlreadyHasCaregiver) {
      setMessage('Patients can only connect to 1 caregiver. Disconnect your existing caregiver first to link a new one.')
      return
    }

    setInviting(true)
    setMessage('')
    try {
      const sentTo = inviteEmail.trim()
      const res = await fetch('/api/family/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: sentTo || undefined,
          relation: inviteRelation || (isCaregiver ? 'Patient' : 'Caregiver'),
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setInviteEmail('')
        setShowInviteModal(false)
        if (data.token) {
          setActiveCareCode(data.token)
        }
        if (data.emailSent) {
          setMessage(`Invitation sent to ${sentTo}.`)
        } else {
          setMessage(`Care Code generated: ${data.token}. Share it directly via WhatsApp, SMS, or copy link!`)
        }
        fetchData(false)
      } else {
        setMessage(data.error || 'Invitation failed')
      }
    } catch {
      setMessage('Invitation failed')
    }
    setInviting(false)
  }

  async function handleAcceptCode() {
    if (!acceptCode.trim()) return

    if (patientAlreadyHasCaregiver) {
      setMessage('Patients can only connect to 1 caregiver. Disconnect your existing caregiver first to link a new one.')
      return
    }

    setAccepting(true)
    setMessage('')
    try {
      const res = await fetch('/api/family/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: acceptCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (data.ok) {
        setMessage(`Connected successfully! You are now paired. Shared medical stats, AI health consults, and care messages are unlocked.`)
        setAcceptCode('')
        fetchData(false)
      } else {
        setMessage(data.error || 'Failed to connect with code')
      }
    } catch {
      setMessage('Failed to connect with code')
    }
    setAccepting(false)
  }

  async function handleRemove(memberId: string) {
    const confirmText = isCaregiver
      ? 'Are you sure you want to disconnect this patient?'
      : 'Are you sure you want to disconnect your caregiver?'

    if (!confirm(confirmText)) return
    try {
      const res = await fetch(`/api/family/member?id=${memberId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.ok) fetchData(false)
    } catch {
      console.error('Failed to remove connection')
    }
  }

  async function handleMarkRead(id: string) {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch {
      console.error('Failed to mark read')
    }
  }

  function handleCopyCode(code: string, id: string = 'active') {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  function handleShareWhatsApp(code: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://caredesk.app'
    const link = `${origin}/dashboard/family?code=${encodeURIComponent(code)}`
    const text = isCaregiver
      ? `Hi! Let's connect on CareDesk to track health and lab reports together. Click this link or enter Care Code: *${code}*\n\n${link}`
      : `Hi! Connect as my caregiver on CareDesk. Click this link or enter Care Code: *${code}*\n\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  function handleShareSMS(code: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://caredesk.app'
    const link = `${origin}/dashboard/family?code=${encodeURIComponent(code)}`
    const text = `Connect on CareDesk. Enter Care Code: ${code} or click: ${link}`
    window.open(`sms:?body=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="p-4 sm:p-5 md:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-primary text-white">
              {isCaregiver ? <Shield className="size-3.5" /> : <Heart className="size-3.5" />}
              {isCaregiver ? 'Caregiver Command Hub' : 'Patient Health Profile'}
            </span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-deep-navy">
            {isCaregiver ? 'connect your patients you want to care' : 'connect your caregiver'}
          </h1>
          <p className="mt-1 text-[14px] text-on-surface-variant">
            {isCaregiver
              ? 'Caregivers can connect multiple patients to monitor health vitals, review lab panels, and receive AI critical alerts.'
              : 'Patients can connect 1 caregiver to share lab results, monitor vital trends, and coordinate care.'}
          </p>
        </div>

        {!patientAlreadyHasCaregiver && (
          <div className="flex items-center gap-2.5">
            <Button onClick={handleGenerateQuickCareCode} disabled={inviting} className="btn-primary-gradient w-full sm:w-auto">
              {inviting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Ticket className="mr-2 size-4" />}
              Generate Care Code
            </Button>
            <Button variant="outline" onClick={() => setShowInviteModal(true)} className="border-outline-variant/60 hidden sm:inline-flex">
              <Mail className="mr-2 size-4 text-on-surface-variant" />
              Email Invite
            </Button>
          </div>
        )}
      </div>

      {/* Patient 1-Caregiver Rule Banner */}
      {!isCaregiver && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
          <Info className="size-5 text-primary shrink-0 mt-0.5" />
          <div className="text-[13px] text-on-surface leading-relaxed">
            <strong>Caregiver Limit:</strong> For patients, the caregiver can only be 1.
            {patientAlreadyHasCaregiver
              ? ' You are currently paired with your caregiver below. To link a different caregiver, disconnect the current one first.'
              : ' Connect your caregiver below using an instant Care Code or accept your caregiver\'s code.'}
          </div>
        </div>
      )}

      {/* Caregiver Multi-Patient Rule Banner */}
      {isCaregiver && (
        <div className="mb-6 rounded-2xl border border-secondary/20 bg-secondary/5 p-4 flex items-start gap-3">
          <Info className="size-5 text-secondary shrink-0 mt-0.5" />
          <div className="text-[13px] text-on-surface leading-relaxed">
            <strong>Multi-Patient Support:</strong> As a caregiver, you can connect multiple patients you want to care for. Each patient will be listed in your Care Circle with real-time AI alerts.
          </div>
        </div>
      )}

      {/* Status / Celebration Message */}
      {message && (
        <div className="mb-6 glass-panel rounded-2xl p-4 border border-secondary/30 bg-secondary/5 animate-fadeIn flex items-center justify-between">
          <p className="text-[14px] font-medium text-deep-navy">{message}</p>
          <button onClick={() => setMessage('')} className="text-on-surface-variant hover:text-on-surface p-1">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Pairing Section (Hidden for patients who already have 1 caregiver) */}
      {!patientAlreadyHasCaregiver && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 mb-8">
          {/* Left: Enter Care Code to Pair */}
          <div className="lg:col-span-6 h-full">
            <BorderBeam size="md" colorVariant="ocean" strength={0.7} theme="light">
              <div className="glass-panel-strong rounded-2xl p-5 sm:p-6 border-2 border-electric-blue/40 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-electric-blue text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        sports_esports
                      </span>
                      <h3 className="text-[17px] font-bold text-deep-navy">
                        {isCaregiver ? 'connect your patients you want to care' : 'connect your caregiver'}
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                      Instant Pairing
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant mb-4 leading-relaxed">
                    {isCaregiver
                      ? 'Have a Care Code from a patient? Enter it below to link in 10 seconds:'
                      : 'Have a Care Code from your caregiver? Enter it below to connect your caregiver in 10 seconds:'}
                  </p>

                  <div className="space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        value={acceptCode}
                        onChange={(e) => setAcceptCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === 'Enter' && handleAcceptCode()}
                        placeholder="e.g. CARE-782"
                        className="w-full text-center tracking-[0.2em] font-mono font-bold text-[18px] sm:text-[20px] rounded-xl bg-white/80 border-2 border-outline-variant/60 focus:border-secondary px-4 py-3 text-deep-navy outline-none uppercase shadow-inner"
                      />
                    </div>
                    <Button
                      onClick={handleAcceptCode}
                      disabled={accepting || !acceptCode.trim()}
                      className="w-full btn-primary-gradient py-3 text-[14px] font-bold flex items-center justify-center gap-2"
                    >
                      {accepting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Connect & Pair Now
                    </Button>
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant/70 text-center mt-3">
                  Pairing grants shared access to lab results, vitals trends, and AI care messages.
                </p>
              </div>
            </BorderBeam>
          </div>

          {/* Right: Active / Generated Care Code Display */}
          <div className="lg:col-span-6 h-full">
            <BorderBeam size="md" colorVariant="ocean" strength={0.7} theme="light">
              <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="size-5 text-secondary" />
                      <h3 className="text-[17px] font-bold text-deep-navy">Your Care Code</h3>
                    </div>
                    <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Ready to Share
                    </span>
                  </div>
                  <p className="text-[13px] text-on-surface-variant mb-4 leading-relaxed">
                    {isCaregiver
                      ? 'Share this code with the patients you want to care for:'
                      : 'Share this code with your caregiver to connect:'}
                  </p>

                  {activeCareCode || invites[0]?.token ? (
                    <div className="space-y-3">
                      <div className="bg-surface-container rounded-2xl p-4 flex items-center justify-between border border-secondary/20 shadow-sm">
                        <div>
                          <span className="text-[11px] text-on-surface-variant font-medium block">Active Room Code</span>
                          <span className="text-[22px] sm:text-[24px] font-mono font-extrabold tracking-wider text-deep-navy">
                            {activeCareCode || invites[0]?.token}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyCode(activeCareCode || invites[0]?.token, 'main')}
                          className="border-outline-variant/60 font-semibold"
                        >
                          <Copy className="mr-1.5 size-3.5" />
                          {copiedId === 'main' ? 'Copied!' : 'Copy Code'}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareWhatsApp(activeCareCode || invites[0]?.token)}
                          className="border-green-500/30 text-green-700 hover:bg-green-50/60 font-semibold text-[13px]"
                        >
                          <MessageCircle className="mr-1.5 size-3.5" />
                          WhatsApp
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShareSMS(activeCareCode || invites[0]?.token)}
                          className="border-blue-500/30 text-blue-700 hover:bg-blue-50/60 font-semibold text-[13px]"
                        >
                          <Share2 className="mr-1.5 size-3.5" />
                          SMS
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-6 text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant/60">
                      <Ticket className="size-8 text-on-surface-variant/40 mb-2" />
                      <p className="text-[13px] text-on-surface-variant mb-3">No active Care Code generated yet</p>
                      <Button size="sm" onClick={handleGenerateQuickCareCode} disabled={inviting} className="btn-primary-gradient">
                        Generate Care Code in 1 Click
                      </Button>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-on-surface-variant/70">
                  <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Codes connect accounts in 10 seconds.</span>
                </div>
              </div>
            </BorderBeam>
          </div>
        </div>
      )}

      {/* Modal: Invite with Email */}
      {showInviteModal && !patientAlreadyHasCaregiver && (
        <div className="mb-6 glass-panel-strong rounded-2xl p-5 border-2 border-secondary/30 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[16px] font-bold text-deep-navy">Send Email Invitation</h3>
            <button onClick={() => setShowInviteModal(false)} className="text-on-surface-variant hover:text-on-surface">
              <X className="size-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder={isCaregiver ? 'patient@example.com' : 'caregiver@example.com'}
              className="sm:col-span-8 rounded-xl bg-white/70 border border-outline-variant/60 px-3.5 py-2.5 text-[14px] outline-none focus:border-secondary"
            />
            <Button onClick={handleInviteWithEmail} disabled={inviting || !inviteEmail.trim()} className="sm:col-span-4 btn-primary-gradient">
              {inviting ? <Loader2 className="size-4 animate-spin" /> : <Mail className="mr-1.5 size-4" />}
              Send Invite
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4 animate-fadeIn py-4">
          <div className="flex justify-center py-4">
            <AiOrb size={20} state="connecting" statusText="Connecting care accounts...." />
          </div>
          <div className="glass-panel organic-radius p-5 space-y-3">
            <div className="h-5 w-40 bg-surface-container-high/70 rounded animate-pulse" />
            <div className="h-10 w-full bg-surface-container/60 rounded-lg animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          {/* Notifications */}
          {notifications.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-deep-navy">
                <Bell className="size-4 text-secondary" /> Care Alerts
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-white font-bold">
                  {notifications.length}
                </span>
              </h2>
              <div className="space-y-2">
                {notifications.slice(0, 5).map((n) => (
                  <div key={n.id} className="glass-panel rounded-xl p-3.5 flex items-center justify-between border border-secondary/20">
                    <div className="min-w-0 pr-3">
                      <p className="text-[13px] font-semibold text-deep-navy">{n.title}</p>
                      {n.body && <p className="text-[12px] text-on-surface-variant truncate">{n.body}</p>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(n.id)} className="shrink-0 hover:bg-surface-container text-xs">
                      <Check className="mr-1 size-3 text-emerald-600" /> Dismiss
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connected Members */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-secondary" />
                <h2 className="text-[17px] font-bold text-deep-navy">
                  {isCaregiver
                    ? `Connected Patients (${acceptedMembers.length})`
                    : `Connected Caregiver (${acceptedMembers.length}/1)`}
                </h2>
              </div>
              <span className="text-[12px] text-on-surface-variant">Real-time sync enabled</span>
            </div>

            {acceptedMembers.length === 0 ? (
              <div className="glass-panel organic-radius flex flex-col items-center justify-center py-14 text-center p-6 border border-white">
                <div className="size-14 rounded-full bg-secondary/10 flex items-center justify-center text-secondary mb-3">
                  <Users className="size-7" />
                </div>
                <h3 className="text-[16px] font-bold text-deep-navy">
                  {isCaregiver ? 'No Connected Patients Yet' : 'No Caregiver Connected Yet'}
                </h3>
                <p className="mt-1 text-[13px] text-on-surface-variant max-w-md">
                  {isCaregiver
                    ? 'Use the Care Code above to connect your patients you want to care for.'
                    : 'Use the Care Code above to connect your caregiver.'}
                </p>
                <Button size="sm" onClick={handleGenerateQuickCareCode} className="mt-4 btn-primary-gradient">
                  Generate Care Code Now
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {acceptedMembers.map((m) => {
                  const targetUserId = m.connected_user_id || (m.owner_id === user?.id ? m.member_id : m.owner_id)
                  const displayName = m.display_name || (isCaregiver ? 'Patient' : 'Caregiver')
                  const initials = displayName
                    .split(' ')
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || (isCaregiver ? 'PT' : 'CG')

                  return (
                    <div key={m.id} className="glass-panel-strong rounded-2xl p-5 border border-white shadow-sm flex flex-col justify-between">
                      <div>
                        {/* Member Card Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="size-11 rounded-full bg-secondary/15 flex items-center justify-center font-bold text-secondary text-sm border border-secondary/20">
                              {initials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-[15px] font-bold text-deep-navy">{displayName}</h4>
                                <span className="size-2 rounded-full bg-emerald-500" title="Connected" />
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-surface-container border border-outline-variant/30 text-on-surface-variant">
                                  {isCaregiver ? 'Patient' : 'Caregiver'}
                                </span>
                              </div>
                              <p className="text-[12px] text-on-surface-variant">
                                Linked on {new Date(m.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemove(m.id)}
                            title={isCaregiver ? 'Disconnect patient' : 'Disconnect caregiver'}
                            className="text-on-surface-variant hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Care Actions */}
                      <div className="pt-3 border-t border-outline-variant/30 flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/messages`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors border border-rose-200"
                        >
                          <Mail className="size-3.5" />
                          <span>{isCaregiver ? 'Messages & Alerts' : 'Message Caregiver'}</span>
                        </Link>

                        {isCaregiver ? (
                          <>
                            <Link
                              href={`/dashboard/analytics?view=${targetUserId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
                            >
                              <BarChart3 className="size-3.5" />
                              <span>Medical Stats</span>
                            </Link>

                            <Link
                              href={`/dashboard/chat?patient=${targetUserId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-primary text-white hover:bg-primary/90 transition-colors"
                            >
                              <MessageSquare className="size-3.5" />
                              <span>Ask AI</span>
                            </Link>

                            <Link
                              href={`/dashboard/reports?patientId=${targetUserId}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-surface-container hover:bg-surface-container-high text-deep-navy transition-colors"
                            >
                              <FileText className="size-3.5" />
                              <span>Reports</span>
                            </Link>
                          </>
                        ) : (
                          <span className="text-[11px] text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-md border border-outline-variant/30">
                            Authorized to monitor your vitals & lab reports
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Pending Invitations List */}
          {invites.length > 0 && !patientAlreadyHasCaregiver && (
            <div>
              <h2 className="mb-3 text-[14px] font-bold text-deep-navy">Generated Care Codes ({invites.length})</h2>
              <div className="space-y-2">
                {invites.map((inv) => (
                  <div key={inv.id} className="glass-panel rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-outline-variant/30">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-surface-container flex items-center justify-center font-mono font-bold text-xs text-secondary">
                        #
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="text-[14px] font-mono font-bold text-deep-navy">{inv.token}</code>
                          <span className="text-[11px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                            Waiting for acceptance
                          </span>
                        </div>
                        <p className="text-[12px] text-on-surface-variant">
                          Created {new Date(inv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button variant="outline" size="sm" onClick={() => handleCopyCode(inv.token, inv.id)} className="text-xs h-8">
                        <Copy className="mr-1 size-3" />
                        {copiedId === inv.id ? 'Copied' : 'Copy'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShareWhatsApp(inv.token)} className="text-xs h-8 text-green-700 border-green-500/30 hover:bg-green-50">
                        WhatsApp
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleShareSMS(inv.token)} className="text-xs h-8 text-blue-700 border-blue-500/30 hover:bg-blue-50">
                        SMS
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function FamilyPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex justify-center">
        <AiOrb size={20} state="connecting" statusText="Loading connection hub...." />
      </div>
    }>
      <FamilyContent />
    </Suspense>
  )
}
