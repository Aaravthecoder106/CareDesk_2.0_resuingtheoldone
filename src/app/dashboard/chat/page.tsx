'use client'

import { useState, useRef, useEffect, useCallback, Suspense } from 'react'
import { BorderBeam } from 'border-beam'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/lib/i18n/language-context'
import { Send, Trash2, Loader2, ImagePlus, X, Users, Sparkles, Shield, User, Heart } from 'lucide-react'
import { Markdown } from '@/components/markdown'
import { AiOrb } from '@/components/ai-orb'
import { useSearchParams } from 'next/navigation'

interface Message {
  id: string
  role: string
  content: string
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

function ChatContent() {
  const { t } = useLanguage()
  const searchParams = useSearchParams()
  const patientParam = searchParams.get('patient') || 'me'

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeMode, setActiveMode] = useState<'chat' | 'image'>('chat')
  const [historyLoading, setHistoryLoading] = useState(true)
  const [image, setImage] = useState<{ data: string; mimeType: string; preview: string } | null>(null)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientParam)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchHistory = useCallback(async (targetPatientId?: string) => {
    setHistoryLoading(true)
    try {
      const param = targetPatientId && targetPatientId !== 'me' ? `?patient=${encodeURIComponent(targetPatientId)}` : ''
      const res = await fetch(`/api/chat/history${param}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      } else {
        console.error('Failed to fetch history, status:', res.status)
      }
    } catch (err) {
      console.error('Failed to fetch history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFamily()
  }, [])

  useEffect(() => {
    if (patientParam && patientParam !== selectedPatientId) {
      setSelectedPatientId(patientParam)
    }
  }, [patientParam])

  useEffect(() => {
    fetchHistory(selectedPatientId)
  }, [selectedPatientId, fetchHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function fetchFamily() {
    try {
      const res = await fetch('/api/family/members')
      if (res.ok) {
        const data = await res.json()
        const accepted = (data.members || []).filter((m: FamilyMember) => m.status === 'accepted')
        setFamilyMembers(accepted)
      }
    } catch (e) {
      console.error('Failed to load family members:', e)
    }
  }

  function handlePickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      alert(t('chat.imageOnly'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || ''
      setImage({ data: base64, mimeType: file.type, preview: result })
    }
    reader.readAsDataURL(file)
  }

  async function handleSend(customText?: string) {
    const textToSend = customText !== undefined ? customText : input
    if ((!textToSend.trim() && !image) || loading) return

    const userText = textToSend.trim() || 'Please analyze this image.'
    const attached = image

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: attached ? `${userText} [image attached]` : userText,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setImage(null)
    setActiveMode(attached ? 'image' : 'chat')
    setLoading(true)

    const assistantId = crypto.randomUUID()
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const targetPatient = selectedPatientId === 'me' ? undefined : selectedPatientId

      if (!attached) {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            patientId: targetPatient,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Chat failed' }))
          throw new Error(errData.error || 'Chat failed')
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let content = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          content += chunk
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content } : m,
            ),
          )
        }
      } else {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userText,
            patientId: targetPatient,
            history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
            image: { data: attached.data, mimeType: attached.mimeType },
          }),
        })
        const data = await res.json()
        if (data.ok) {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: data.reply } : m,
            ),
          )
        } else {
          throw new Error(data.error || 'Chat failed')
        }
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? { ...m, content: err instanceof Error ? err.message : t('chat.error') }
            : m,
        ),
      )
    }
    setLoading(false)
  }

  async function handleClear() {
    const targetPatient = selectedPatientId === 'me' ? undefined : selectedPatientId
    const param = targetPatient ? `?patient=${encodeURIComponent(targetPatient)}` : ''
    await fetch(`/api/chat/clear${param}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId: targetPatient }),
    })
    setMessages([])
  }

  const activePatient = familyMembers.find(m => m.connected_user_id === selectedPatientId || m.member_id === selectedPatientId || m.owner_id === selectedPatientId)
  const patientFirstName = activePatient?.display_name?.split(' ')[0] || 'Patient'

  const patientSuggestedPrompts = [
    `Summarize ${patientFirstName}'s latest lab tests and any flagged biomarkers.`,
    `Are there any potential side effects or drug interactions with ${patientFirstName}'s current medications?`,
    `What key questions should I ask the doctor at the next appointment?`,
    `What dietary recommendations can help support ${patientFirstName}'s active conditions?`,
  ]

  return (
    <div className="flex h-full min-h-0 flex-col p-4 sm:p-5 md:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold text-deep-navy">CareDesk AI Health Consult</h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-on-surface-variant">
            Ask clinical and daily care questions grounded in verified medical records and lab reports.
          </p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="self-start sm:self-auto hover:bg-destructive/10">
            <Trash2 className="mr-2 size-4 text-destructive" />
            {t('chat.clear')}
          </Button>
        )}
      </div>

      {/* Patient Switcher for Caregivers */}
      {familyMembers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 bg-surface-container-low/70 p-2.5 rounded-2xl border border-outline-variant/30">
          <span className="text-[12px] font-bold text-deep-navy flex items-center gap-1.5 pl-1">
            <Users className="size-3.5 text-secondary" /> Context:
          </span>
          <button
            onClick={() => setSelectedPatientId('me')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
              selectedPatientId === 'me'
                ? 'bg-primary text-white shadow-sm ring-1 ring-secondary/50'
                : 'bg-white text-on-surface-variant hover:bg-white/80 border border-outline-variant/40'
            }`}
          >
            <User className="size-3.5" />
            <span>My Own Health</span>
          </button>
          {familyMembers.map((m) => {
            const memberTargetId = m.connected_user_id || m.member_id
            const isSelected = selectedPatientId === memberTargetId
            return (
              <button
                key={m.id}
                onClick={() => setSelectedPatientId(memberTargetId)}
                className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
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

      {/* Active Context Banner */}
      {activePatient && selectedPatientId !== 'me' && (
        <div className="mb-3">
          <BorderBeam size="line" colorVariant="ocean" strength={0.8} theme="light">
            <div className="glass-panel rounded-xl px-3.5 py-2 border border-secondary/30 bg-secondary/5 flex items-center justify-between animate-fadeIn">
              <div className="flex items-center gap-2 text-[12px] text-deep-navy">
                <Sparkles className="size-3.5 text-secondary shrink-0" />
                <span>
                  Consulting AI regarding <strong>{activePatient.display_name}</strong> ({activePatient.relation || 'Connected Patient'}). Verified medical reports, labs & medications are referenced.
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-secondary bg-secondary/10 px-2 py-0.5 rounded-full shrink-0">
                Caregiver Mode
              </span>
            </div>
          </BorderBeam>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden glass-panel organic-radius flex flex-col border border-white/60 shadow-sm">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {historyLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <AiOrb mode="chat" size={20} state="searching" statusText="Loading conversation history...." />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-center max-w-lg mx-auto">
              <AiOrb size={64} mode="chat" showLabel={false} className="mb-4" />
              <h3 className="text-[17px] font-bold text-deep-navy">
                {activePatient ? `Ask anything about ${activePatient.display_name}'s health` : t('chat.empty.title')}
              </h3>
              <p className="mt-1 text-[13px] text-on-surface-variant leading-relaxed mb-6">
                {activePatient
                  ? `AI has analyzed ${activePatient.display_name}'s blood tests, vitals, and medications to answer your caregiving questions.`
                  : t('chat.empty.desc')}
              </p>

              {/* Suggested Prompts */}
              <div className="w-full space-y-2 text-left">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary block pl-1">
                  Suggested Questions:
                </span>
                {(activePatient ? patientSuggestedPrompts : [
                  'Summarize my latest blood test and any flagged values.',
                  'Explain my current medication routine and precautions.',
                  'What questions should I ask my physician at my next visit?',
                ]).map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left p-2.5 rounded-xl bg-white/70 hover:bg-white hover:border-secondary/40 border border-outline-variant/30 text-[12px] sm:text-[13px] text-deep-navy transition-all flex items-center justify-between group"
                  >
                    <span>{prompt}</span>
                    <Sparkles className="size-3.5 text-secondary opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-[14px] ${
                    msg.role === 'user'
                      ? 'bg-primary text-white shadow-sm'
                      : !msg.content && loading && msg.id === messages[messages.length - 1]?.id
                      ? 'bg-transparent border-none p-0 shadow-none'
                      : 'glass-panel text-on-surface border border-outline-variant/30'
                  }`}
                >
                  {msg.content ? (
                    <div className="space-y-2">
                      <Markdown content={msg.content} />
                      {msg.role === 'assistant' && loading && msg.id === messages[messages.length - 1]?.id && (
                        <div className="flex items-center gap-2 pt-2 mt-2 border-t border-outline-variant/25 text-[12px] text-secondary font-medium">
                          <AiOrb size={20} state="working" showLabel={false} theme="light" />
                          <span className="animate-pulse">Formulating clinical response...</span>
                        </div>
                      )}
                    </div>
                  ) : msg.role === 'assistant' && loading && msg.id === messages[messages.length - 1]?.id ? (
                    <div className="py-1">
                      <AiOrb mode={activeMode} size={20} statusText={activePatient ? `Analyzing ${patientFirstName}'s records....` : undefined} />
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-outline-variant/30 p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/40">
          {image && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.preview}
                  alt="attachment preview"
                  className="size-16 rounded-lg border border-outline-variant object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute -right-2 -top-2 rounded-full bg-white border border-outline-variant p-0.5 shadow-sm"
                  aria-label={t('chat.removeImage')}
                >
                  <X className="size-3" />
                </button>
              </div>
              <span className="text-[12px] text-on-surface-variant">{t('chat.imageAttached')}</span>
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePickImage}
            />
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title={t('chat.attachImage')}
              className="border-outline-variant/50 hover:bg-surface-container shrink-0"
            >
              <ImagePlus className="size-4 text-on-surface-variant" />
            </Button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={activePatient ? `Ask anything about ${activePatient.display_name}'s health, labs, or meds...` : t('chat.input.placeholder')}
              className="flex-1 rounded-xl bg-white/70 border border-outline-variant/50 px-3 sm:px-4 py-2.5 text-[13px] sm:text-[14px] outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary transition-all min-w-0"
              disabled={loading}
            />
            <Button type="submit" size="icon" disabled={loading || (!input.trim() && !image)} className="btn-primary-gradient rounded-xl shrink-0">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex justify-center">
        <AiOrb mode="chat" size={20} state="searching" statusText="Loading AI Consult...." />
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
