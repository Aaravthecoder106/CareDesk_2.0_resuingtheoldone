'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useUser } from '@/components/auth-context'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Bell,
  Send,
  User,
  Shield,
  Heart,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  Users,
} from 'lucide-react'
import Link from 'next/link'

interface CriticalAlert {
  id: string
  patientId: string
  patientName: string
  title: string
  message: string
  severity: 'critical' | 'warning' | 'info'
  testName?: string
  value?: number | null
  unit?: string | null
  flag?: string | null
  createdAt: string
  readAt?: string | null
}

interface DirectMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: 'caregiver' | 'patient'
  recipientId: string
  recipientName: string
  content: string
  createdAt: string
  readAt?: string | null
}

interface ConnectedPartner {
  id: string
  connected_user_id: string
  display_name?: string
  member_email?: string
  relation?: string | null
}

export default function MessagesPage() {
  const { user } = useUser()
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([])
  const [directMessages, setDirectMessages] = useState<DirectMessage[]>([])
  const [connectedPartners, setConnectedPartners] = useState<ConnectedPartner[]>([])
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>('')
  const [newMessageText, setNewMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'alerts' | 'direct'>('all')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const userRole = (user?.role || user?.user_metadata?.elder_care_role || 'caregiver') as 'caregiver' | 'patient'
  const isCaregiver = userRole === 'caregiver'

  const fetchMessages = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true)
    try {
      const res = await fetch('/api/messages')
      if (res.ok) {
        const data = await res.json()
        setCriticalAlerts(data.criticalAlerts || [])
        setDirectMessages(data.directMessages || [])
        setConnectedPartners(data.connectedPartners || [])

        if (data.connectedPartners && data.connectedPartners.length > 0 && !selectedPartnerId) {
          setSelectedPartnerId(data.connectedPartners[0].connected_user_id)
        }
      }
    } catch {
      console.error('Failed to load messages')
    }
    if (showSpinner) setLoading(false)
  }, [selectedPartnerId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [directMessages])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessageText.trim() || !selectedPartnerId || sending) return

    setSending(true)
    const textToSend = newMessageText.trim()
    setNewMessageText('')

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedPartnerId,
          content: textToSend,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.message) {
          setDirectMessages((prev) => [...prev, data.message])
        }
      } else {
        // Rollback text if failed
        setNewMessageText(textToSend)
      }
    } catch {
      setNewMessageText(textToSend)
    }
    setSending(false)
  }

  const selectedPartner = connectedPartners.find((p) => p.connected_user_id === selectedPartnerId)

  // Filter messages for current conversation
  const partnerMessages = directMessages.filter(
    (m) =>
      (m.senderId === user?.id && m.recipientId === selectedPartnerId) ||
      (m.senderId === selectedPartnerId && m.recipientId === user?.id)
  )

  return (
    <div className="p-4 sm:p-5 md:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold bg-primary text-white">
              {isCaregiver ? <Shield className="size-3.5" /> : <Heart className="size-3.5" />}
              {isCaregiver ? 'Caregiver Messages' : 'Patient Messages'}
            </span>
            {criticalAlerts.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                <span className="size-1.5 rounded-full bg-rose-600 animate-pulse" />
                {criticalAlerts.length} Attention Needed
              </span>
            )}
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-deep-navy">Care Messages & Critical AI Alerts</h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-on-surface-variant">
            {isCaregiver
              ? 'Review automated AI attention alerts for connected patients and communicate directly.'
              : 'View health alerts from AI and stay connected with your caregiver.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMessages(false)}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
          <Link
            href="/dashboard/family"
            className="btn-primary-gradient px-3 py-1.5 rounded-xl text-[13px] font-bold inline-flex items-center gap-1.5"
          >
            <Users className="size-3.5" />
            <span>{isCaregiver ? 'Connect Patients' : 'Connect Caregiver'}</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-outline-variant/30 pb-3">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          All Updates
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'alerts'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <AlertTriangle className="size-3.5" />
          <span>Critical AI Attention ({criticalAlerts.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('direct')}
          className={`px-3.5 py-1.5 rounded-xl text-[13px] font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'direct'
              ? 'bg-primary text-white shadow-sm'
              : 'bg-surface hover:bg-surface-container text-on-surface-variant'
          }`}
        >
          <Send className="size-3.5" />
          <span>Direct Messages</span>
        </button>
      </div>

      {/* SECTION 1: CRITICAL AI ATTENTION BOX */}
      {(activeTab === 'all' || activeTab === 'alerts') && (
        <div className="mb-8">
          <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/60 via-white to-amber-50/40 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-sm">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <h2 className="text-[16px] sm:text-[18px] font-bold text-deep-navy">
                    {isCaregiver ? 'Critical AI Attention Alerts' : 'Health Findings Needing Attention'}
                  </h2>
                  <p className="text-[12px] sm:text-[13px] text-on-surface-variant">
                    {isCaregiver
                      ? 'AI automatically flags abnormal biomarkers and critical lab reports from your connected patients.'
                      : 'AI automatically reviews your reports and flags items that you and your caregiver should review.'}
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                {criticalAlerts.length} Active {criticalAlerts.length === 1 ? 'Alert' : 'Alerts'}
              </span>
            </div>

            {criticalAlerts.length === 0 ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-3">
                <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
                <div className="text-[13px] text-emerald-900">
                  <strong>All values within stable limits.</strong> AI health monitoring is active. No critical lab flags or urgent medication conflicts detected.
                </div>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {criticalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-xl border border-rose-200/90 bg-white p-4 shadow-sm hover:border-rose-300 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
                          <AlertTriangle className="size-3" />
                          {alert.severity === 'critical' ? 'Critical Flag' : 'Needs Attention'}
                        </span>
                        <span className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1">
                          <Clock className="size-3" />
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-[14px] font-bold text-deep-navy mb-1">
                        {alert.title}
                      </div>

                      <p className="text-[13px] text-on-surface-variant leading-relaxed mb-3">
                        {alert.message}
                      </p>

                      {alert.testName && (
                        <div className="mb-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-surface-container-low text-[12px] font-mono border border-outline-variant/30">
                          <span className="font-semibold text-deep-navy">{alert.testName}:</span>
                          <span className="font-bold text-rose-600">{alert.value ?? 'Abnormal'} {alert.unit ?? ''}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2.5 border-t border-outline-variant/20 flex items-center justify-between text-[12px]">
                      <span className="text-on-surface-variant font-medium">
                        Patient: <strong className="text-deep-navy">{alert.patientName}</strong>
                      </span>
                      <Link
                        href={`/dashboard/chat?patient=${alert.patientId}`}
                        className="font-bold text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <span>Ask AI Consult</span>
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

      {/* SECTION 2: DIRECT CAREGIVER-PATIENT MESSAGING */}
      {(activeTab === 'all' || activeTab === 'direct') && (
        <div className="rounded-2xl border border-outline-variant/40 bg-surface-container-lowest shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-outline-variant/30 bg-surface-container-low/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] sm:text-[18px] font-bold text-deep-navy">
                {isCaregiver ? 'Direct Message with Connected Patients' : 'Direct Message with Your Caregiver'}
              </h2>
              <p className="text-[12px] sm:text-[13px] text-on-surface-variant">
                Send notes, medication updates, and check-ins directly between caregiver and patient.
              </p>
            </div>

            {connectedPartners.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-on-surface-variant">Active Connection:</span>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => setSelectedPartnerId(e.target.value)}
                  className="rounded-xl border border-outline-variant/50 bg-white px-3 py-1.5 text-[13px] font-bold text-deep-navy focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {connectedPartners.map((p) => (
                    <option key={p.connected_user_id} value={p.connected_user_id}>
                      {p.display_name || p.member_email || 'Connected Member'}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {connectedPartners.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                <Users className="size-6 text-primary" />
              </div>
              <h3 className="text-[16px] font-bold text-deep-navy mb-1">
                {isCaregiver ? 'No Connected Patients Yet' : 'No Caregiver Connected Yet'}
              </h3>
              <p className="text-[13px] text-on-surface-variant max-w-md mx-auto mb-4">
                {isCaregiver
                  ? 'Connect the patients you want to care for using an instant Care Code to unlock direct messaging and AI health monitoring.'
                  : 'Connect your caregiver using an instant Care Code so they can review your reports and receive AI critical alerts.'}
              </p>
              <Link
                href="/dashboard/family"
                className="btn-primary-gradient px-4 py-2 rounded-xl text-[13px] font-bold inline-flex items-center gap-2"
              >
                <span>{isCaregiver ? 'Connect Patients' : 'Connect Caregiver'}</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="flex flex-col h-[460px]">
              {/* Message thread */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3 bg-surface/30">
                {partnerMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-on-surface-variant">
                    <MessageSquare className="size-8 text-outline-variant mb-2" />
                    <p className="text-[13px] font-medium">No messages yet with {selectedPartner?.display_name || 'your partner'}.</p>
                    <p className="text-[12px] text-on-surface-variant/70">Send a quick note or reminder below.</p>
                  </div>
                ) : (
                  partnerMessages.map((msg) => {
                    const isMe = msg.senderId === user?.id
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-1.5 mb-1 text-[11px] text-on-surface-variant">
                          <span className="font-bold text-deep-navy">{isMe ? 'You' : msg.senderName}</span>
                          <span className="uppercase text-[9px] font-bold px-1.5 py-0.2 rounded bg-surface-container border border-outline-variant/30">
                            {msg.senderRole}
                          </span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                            isMe
                              ? 'bg-primary text-white rounded-br-none'
                              : 'bg-white border border-outline-variant/40 text-on-surface rounded-bl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-outline-variant/30 bg-surface flex items-center gap-2.5"
              >
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={`Write a message to ${selectedPartner?.display_name || (isCaregiver ? 'patient' : 'caregiver')}...`}
                  className="flex-1 rounded-xl border border-outline-variant/50 bg-surface-container-lowest px-4 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  type="submit"
                  disabled={!newMessageText.trim() || sending}
                  className="btn-primary-gradient px-4 py-2.5 rounded-xl text-[13px] font-bold shrink-0 flex items-center gap-1.5"
                >
                  <Send className="size-4" />
                  <span>Send</span>
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
