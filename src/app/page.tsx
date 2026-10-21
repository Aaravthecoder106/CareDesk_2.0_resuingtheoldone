'use client'

import Link from 'next/link'
import { BorderBeam } from 'border-beam'
import { Show } from '@/components/auth-context'
import { Logo } from '@/components/logo'
import { useLanguage } from '@/lib/i18n/language-context'
import { useState, useRef } from 'react'
import {
  Menu,
  X,
  Upload,
  Loader2,
  FileText,
  Shield,
  Heart,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Activity,
  Ticket,
  MessageSquare,
  Users,
} from 'lucide-react'

export default function Home() {
  useLanguage()
  const [menuOpen, setMenuOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleAnalyzeFile(file: File) {
    setUploading(true)
    setUploadError('')
    try {
      const res = await sendAnalyzeRequest(file)

      if (res.status === 413) {
        setUploadError('This file is too large to upload. Please try a smaller file (under 20 MB).')
        setUploading(false)
        return
      }

      const text = await res.text()
      let data: {
        token?: string | null
        inline?: boolean
        error?: string
      } = {}
      try {
        data = text ? JSON.parse(text) : {}
      } catch {
        setUploadError(`Upload failed: the server returned an unexpected response (HTTP ${res.status}). Please try again.`)
        setUploading(false)
        return
      }

      if (data.token) {
        window.location.href = `/preview/${data.token}`
      } else if (data.inline) {
        sessionStorage.setItem('previewData', JSON.stringify(data))
        window.location.href = '/preview/inline'
      } else {
        setUploadError(data.error || 'Analysis failed. Please try again.')
        setUploading(false)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network error'
      setUploadError(`Upload failed: ${msg}`)
      setUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleAnalyzeFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleAnalyzeFile(file)
  }

  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      {/* Navigation Shell */}
      <nav className="fixed top-0 w-full z-50 glass-panel-strong border-b border-white/50">
        <div className="flex justify-between items-center px-4 sm:px-6 md:px-16 py-3 sm:py-4 max-w-[1440px] mx-auto">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary text-white tracking-wide uppercase">
              ElderCare
            </span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden md:flex space-x-6 lg:space-x-8 text-[15px]">
            <a className="text-on-surface-variant hover:text-secondary transition-colors px-3 py-2 rounded-lg font-medium" href="#for-caregivers">
              For Caregivers
            </a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors px-3 py-2 rounded-lg font-medium" href="#how-it-works">
              Game-Style Pairing
            </a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors px-3 py-2 rounded-lg font-medium" href="#features">
              Health Intelligence
            </a>
            <a className="text-on-surface-variant hover:text-secondary transition-colors px-3 py-2 rounded-lg font-medium" href="#trust">
              Stories
            </a>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <button
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-surface-container transition-colors"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
            <Show when="signed-out">
              <Link
                href="/sign-in"
                className="hidden sm:inline-flex text-[14px] font-medium text-secondary hover:text-primary px-3 py-2 transition-colors mr-1"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="btn-primary-gradient px-4 sm:px-6 py-2 rounded-full font-bold text-[13px] sm:text-[14px] active:scale-95 transition-transform duration-200"
              >
                Get Started Free
              </Link>
            </Show>
            <Show when="signed-in">
              <Link
                href="/dashboard"
                className="btn-primary-gradient px-4 sm:px-6 py-2 rounded-full font-bold text-[13px] sm:text-[14px] active:scale-95 transition-transform duration-200"
              >
                Dashboard
              </Link>
            </Show>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {menuOpen && (
          <div className="md:hidden glass-panel-strong border-t border-white/30 px-4 py-3">
            <nav className="space-y-1">
              <a className="block text-on-surface-variant hover:text-secondary transition-colors px-3 py-2.5 rounded-lg text-[15px] font-medium" href="#for-caregivers" onClick={() => setMenuOpen(false)}>
                For Caregivers
              </a>
              <a className="block text-on-surface-variant hover:text-secondary transition-colors px-3 py-2.5 rounded-lg text-[15px] font-medium" href="#how-it-works" onClick={() => setMenuOpen(false)}>
                Game-Style Pairing
              </a>
              <a className="block text-on-surface-variant hover:text-secondary transition-colors px-3 py-2.5 rounded-lg text-[15px] font-medium" href="#features" onClick={() => setMenuOpen(false)}>
                Health Intelligence
              </a>
              <a className="block text-on-surface-variant hover:text-secondary transition-colors px-3 py-2.5 rounded-lg text-[15px] font-medium" href="#trust" onClick={() => setMenuOpen(false)}>
                Stories
              </a>
              <Link href="/sign-in" className="block text-secondary font-semibold px-3 py-2.5 text-[15px]" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
            </nav>
          </div>
        )}
      </nav>

      <main>
        {/* Hero Section */}
        <section className="pt-[95px] sm:pt-[115px] pb-12 sm:pb-20 px-4 sm:px-6 md:px-16 max-w-[1440px] mx-auto relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center min-h-[50vh] sm:min-h-[70vh]">
            
            {/* Hero Left Content (7 Cols) */}
            <div className="flex flex-col items-start z-10 lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-panel border border-electric-blue/40 mb-4 sm:mb-6 shadow-sm">
                <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] sm:text-[12px] font-bold tracking-[0.08em] uppercase text-deep-navy">
                  Connected Elder Care & Health Intelligence
                </span>
              </div>

              <h1 className="text-[30px] leading-[38px] sm:text-[38px] sm:leading-[46px] md:text-[46px] md:leading-[56px] font-extrabold text-deep-navy mb-4 sm:mb-5 tracking-tight">
                Caring for Aging Loved Ones,<br />
                <span className="gradient-text">Connected & Simplified.</span>
              </h1>

              <p className="text-[15px] sm:text-[17px] leading-[26px] sm:leading-[30px] text-on-surface-variant mb-6 sm:mb-8 max-w-xl">
                Bridge the distance between senior parents and family caregivers. Connect in 10 seconds via Care Code, access real-time medical stats & lab trends, and consult our AI assistant with questions tailored specifically to your loved one&apos;s health.
              </p>

              {/* Dual Role Signup Pathways */}
              <Show when="signed-out">
                <div className="w-full max-w-xl space-y-3 mb-6">
                  <div className="text-[13px] font-semibold uppercase tracking-wider text-secondary flex items-center gap-1.5">
                    <Sparkles className="size-4" />
                    <span>Choose your role to get started:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Role 1: Caregiver */}
                    <Link
                      href="/sign-up?role=caregiver"
                      className="group glass-panel rounded-2xl p-4 sm:p-5 border-2 border-secondary/30 hover:border-secondary transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between bg-gradient-to-br from-white/90 to-surface-container-low/70"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform">
                            <Shield className="size-5" />
                          </div>
                          <span className="text-[11px] font-bold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                            For Families
                          </span>
                        </div>
                        <h3 className="text-[16px] font-bold text-deep-navy group-hover:text-secondary transition-colors">
                          I am a Caregiver
                        </h3>
                        <p className="text-[13px] text-on-surface-variant mt-1 leading-snug">
                          Caring for elderly parents or relatives. Track vitals, medications & ask AI about their health.
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-secondary">
                        <span>Join as Caregiver</span>
                        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>

                    {/* Role 2: Senior / Patient */}
                    <Link
                      href="/sign-up?role=patient"
                      className="group glass-panel rounded-2xl p-4 sm:p-5 border-2 border-outline-variant/40 hover:border-deep-navy transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 flex flex-col justify-between bg-gradient-to-br from-white/90 to-surface-container-low/70"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-deep-navy group-hover:scale-110 transition-transform">
                            <User className="size-5" />
                          </div>
                          <span className="text-[11px] font-bold text-deep-navy bg-primary/10 px-2 py-0.5 rounded-full">
                            For Seniors
                          </span>
                        </div>
                        <h3 className="text-[16px] font-bold text-deep-navy group-hover:text-primary transition-colors">
                          I am an Elder / Patient
                        </h3>
                        <p className="text-[13px] text-on-surface-variant mt-1 leading-snug">
                          Managing my own health & independence. Easily scan lab reports and share with caregivers.
                        </p>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-[13px] font-semibold text-deep-navy">
                        <span>Join as Senior</span>
                        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Link>
                  </div>
                </div>

                {/* Instant Quick Dropzone for Immediate Lab / Rx Testing */}
                <div className="w-full max-w-xl pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    className={`rounded-xl border-2 border-dashed p-3.5 sm:p-4 transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                      dragOver
                        ? 'border-electric-blue bg-electric-blue/10 scale-[1.01]'
                        : 'border-outline-variant/50 hover:border-secondary hover:bg-surface-container-low/50'
                    } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => !uploading && fileInputRef.current?.click()}
                  >
                    <div className="w-10 h-10 rounded-xl bg-electric-blue/15 flex items-center justify-center shrink-0">
                      {uploading ? (
                        <Loader2 className="size-5 text-secondary animate-spin" />
                      ) : (
                        <Upload className="size-5 text-secondary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-deep-navy truncate">
                        {uploading ? 'AI is reading report… (10s)' : 'Or test instant report scanning without account'}
                      </p>
                      <p className="text-[12px] text-on-surface-variant truncate">
                        Drop any blood test or prescription PDF/JPG for an instant AI preview
                      </p>
                    </div>
                    <span className="hidden sm:inline-block text-[12px] font-bold text-secondary">
                      Browse
                    </span>
                  </div>
                  {uploadError && (
                    <p className="mt-2 text-[12px] text-destructive">{uploadError}</p>
                  )}
                </div>
              </Show>

              <Show when="signed-in">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto mt-2">
                  <Link href="/dashboard" className="btn-primary-gradient text-[15px] sm:text-[16px] px-7 sm:px-9 py-3 sm:py-3.5 rounded-full font-bold flex justify-center items-center gap-2 active:scale-[0.98] transition-transform">
                    Go to Caregiver & Elder Portal
                    <ArrowRight className="size-5" />
                  </Link>
                </div>
              </Show>
            </div>

            {/* Hero Right Visual: Connected Elder Care Simulation (5 Cols) */}
            <div className="relative w-full lg:col-span-5 mt-4 lg:mt-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-tr from-secondary/20 via-electric-blue/20 to-primary/10 rounded-[2.5rem] transform rotate-2 blur-2xl opacity-60"></div>
              
              <BorderBeam size="md" colorVariant="ocean" strength={0.75} theme="light">
                <div className="relative w-full glass-panel-strong rounded-[2rem] p-5 sm:p-6 border border-white shadow-2xl space-y-4">
                
                {/* Game-Style Pairing Beacon */}
                <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-[12px] font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Pairing Active
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[12px] font-bold text-deep-navy bg-surface-container px-2.5 py-1 rounded-lg border border-outline-variant/40">
                    <Ticket className="size-3.5 text-secondary" />
                    <span>CARE-782</span>
                  </div>
                </div>

                {/* Connected Elder Identity Card */}
                <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-low border border-white/60">
                  <div className="size-12 rounded-full bg-secondary/15 flex items-center justify-center text-deep-navy font-bold text-[16px] border border-secondary/20">
                    MM
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-[15px] font-bold text-deep-navy truncate">Margaret Miller</h4>
                      <span className="text-[11px] font-semibold text-secondary bg-secondary/10 px-2 py-0.5 rounded-full">
                        Mother (74)
                      </span>
                    </div>
                    <p className="text-[12px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                      <Activity className="size-3.5 text-emerald-600" />
                      <span>Vitals Normal • Last synced 2h ago</span>
                    </p>
                  </div>
                </div>

                {/* Vitals & Biomarkers Quick Matrix */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-white/70 border border-outline-variant/30">
                    <span className="text-[11px] text-on-surface-variant block">Blood Pressure</span>
                    <span className="text-[14px] font-bold text-deep-navy">122/80</span>
                    <span className="text-[10px] text-emerald-700 block font-semibold">Optimal</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 border border-outline-variant/30">
                    <span className="text-[11px] text-on-surface-variant block">Fasting Glucose</span>
                    <span className="text-[14px] font-bold text-deep-navy">98 mg/dL</span>
                    <span className="text-[10px] text-emerald-700 block font-semibold">Normal</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/70 border border-outline-variant/30">
                    <span className="text-[11px] text-on-surface-variant block">HbA1c</span>
                    <span className="text-[14px] font-bold text-deep-navy">5.6%</span>
                    <span className="text-[10px] text-secondary block font-semibold">Tracked</span>
                  </div>
                </div>

                {/* Caregiver AI Health Consult Preview */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-secondary">
                    <MessageSquare className="size-3.5" />
                    <span>Caregiver AI Consultation</span>
                  </div>

                  {/* Question from caregiver */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-white text-[12px] px-3.5 py-2 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm">
                      Are Mom&apos;s blood pressure medications safe with her new cough syrup?
                    </div>
                  </div>

                  {/* Answer from AI referencing Margaret's records */}
                  <div className="flex justify-start">
                    <div className="glass-panel text-deep-navy text-[12px] px-3.5 py-2.5 rounded-2xl rounded-tl-none max-w-[90%] border border-electric-blue/30 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-secondary">
                        <Sparkles className="size-3" />
                        <span>Referencing Margaret&apos;s Verified Records:</span>
                      </div>
                      <p className="text-on-surface leading-relaxed text-[12px]">
                        Margaret is on <strong>Lisinopril 10mg</strong>. Avoid cough syrups with pseudoephedrine as it can spike BP. Look for dextromethorphan-only formulations.
                      </p>
                    </div>
                  </div>
                </div>

              </div>
              </BorderBeam>
            </div>

          </div>
        </section>

        {/* Game-Style Pairing Section */}
        <section id="how-it-works" className="py-12 sm:py-20 px-4 sm:px-6 md:px-16 bg-surface-container-low/60 border-y border-outline-variant/30">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <span className="text-[12px] font-bold uppercase tracking-widest text-secondary block mb-2">
                Fast & Frictionless
              </span>
              <h2 className="text-[26px] sm:text-[32px] leading-[34px] sm:leading-[42px] font-bold text-deep-navy mb-3">
                Connect in 10 Seconds Like a Game Invite
              </h2>
              <p className="text-[15px] sm:text-[17px] text-on-surface-variant">
                No complex paperwork, no bureaucratic authorizations. Seniors and caregivers link with a single room code.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Step 1 */}
              <div className="glass-panel organic-radius p-6 sm:p-7 flex flex-col items-start border border-white">
                <div className="size-12 rounded-2xl bg-secondary/15 flex items-center justify-center mb-4 text-secondary font-bold text-lg">
                  1
                </div>
                <h3 className="text-[18px] font-bold text-deep-navy mb-2">Generate Care Code</h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  Either the caregiver or the senior parent clicks <strong>&ldquo;Generate Code&rdquo;</strong> to produce a friendly 6-digit code like <code className="text-secondary font-bold font-mono">CARE-782</code>.
                </p>
              </div>

              {/* Step 2 */}
              <BorderBeam size="md" colorVariant="ocean" strength={0.7} theme="light">
                <div className="glass-panel organic-radius p-6 sm:p-7 flex flex-col items-start border-2 border-electric-blue/40 relative h-full">
                  <div className="size-12 rounded-2xl bg-electric-blue/20 flex items-center justify-center mb-4 text-deep-navy font-bold text-lg">
                    2
                  </div>
                  <h3 className="text-[18px] font-bold text-deep-navy mb-2">Share via WhatsApp or SMS</h3>
                  <p className="text-[14px] text-on-surface-variant leading-relaxed">
                    Send the code or 1-click link over WhatsApp, SMS, or tell your parent over the phone. The recipient enters the code in their dashboard.
                  </p>
                </div>
              </BorderBeam>

              {/* Step 3 */}
              <div className="glass-panel organic-radius p-6 sm:p-7 flex flex-col items-start border border-white">
                <div className="size-12 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4 text-emerald-800 font-bold text-lg">
                  3
                </div>
                <h3 className="text-[18px] font-bold text-deep-navy mb-2">Instantly Paired & Synced</h3>
                <p className="text-[14px] text-on-surface-variant leading-relaxed">
                  Both accounts connect instantly. The caregiver immediately sees lab results, medications, and can ask AI health questions about their parent.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* For Caregivers Deep Dive */}
        <section id="for-caregivers" className="py-12 sm:py-20 px-4 sm:px-6 md:px-16 max-w-[1440px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 mb-4">
                <Shield className="size-3.5 text-secondary" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">Caregiver Command Center</span>
              </div>
              <h2 className="text-[26px] sm:text-[34px] leading-[34px] sm:leading-[44px] font-bold text-deep-navy mb-4">
                Full Visibility Into Your Loved One&apos;s Health From Anywhere
              </h2>
              <p className="text-[15px] sm:text-[16px] text-on-surface-variant leading-relaxed mb-6">
                Whether you live across town or across the country, CareDesk ElderCare gives you the answers and peace of mind you need.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary shrink-0 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-deep-navy">Real-Time Biomarkers & Vitals</h4>
                    <p className="text-[13px] text-on-surface-variant">Track blood pressure, fasting blood sugar, cholesterol, and kidney metrics across multiple lab tests over time.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-electric-blue/20 flex items-center justify-center text-deep-navy shrink-0 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-deep-navy">Ask AI Questions About Connected Elders</h4>
                    <p className="text-[13px] text-on-surface-variant">Consult the AI directly with questions like &ldquo;Is Dad&apos;s glucose improving?&rdquo; or &ldquo;What questions should I ask Mom&apos;s cardiologist?&rdquo; grounded in their exact records.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </div>
                  <div>
                    <h4 className="text-[15px] font-bold text-deep-navy">Care Circle Collaboration</h4>
                    <p className="text-[13px] text-on-surface-variant">Connect siblings and other family members to the same senior profile so everyone stays aligned without repetitive phone calls.</p>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/sign-up?role=caregiver"
                  className="btn-primary-gradient px-6 py-3 rounded-full text-[14px] font-bold inline-flex items-center gap-2"
                >
                  Join as Family Caregiver
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass-panel organic-radius p-5 space-y-2 border border-white">
                <div className="size-10 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary">
                  <Activity className="size-5" />
                </div>
                <h4 className="text-[15px] font-bold text-deep-navy">Prescription Sync</h4>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  Keep active medications, doses, and schedules synchronized so missed doses and contraindications are avoided.
                </p>
              </div>

              <div className="glass-panel organic-radius p-5 space-y-2 border border-white">
                <div className="size-10 rounded-xl bg-electric-blue/20 flex items-center justify-center text-deep-navy">
                  <FileText className="size-5" />
                </div>
                <h4 className="text-[15px] font-bold text-deep-navy">Plain-Language Reports</h4>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  Dense hospital summaries and lab sheets are translated into clear, human explanations highlighting what matters.
                </p>
              </div>

              <div className="glass-panel organic-radius p-5 space-y-2 border border-white">
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-deep-navy">
                  <Users className="size-5" />
                </div>
                <h4 className="text-[15px] font-bold text-deep-navy">Multi-Elder Switching</h4>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  Caring for both Mom and Dad? Switch profiles with one click from your Caregiver dashboard.
                </p>
              </div>

              <div className="glass-panel organic-radius p-5 space-y-2 border border-white">
                <div className="size-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800">
                  <Heart className="size-5" />
                </div>
                <h4 className="text-[15px] font-bold text-deep-navy">100% Free & Unlimited</h4>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  Zero subscription barriers or hidden paywalls. Unlimited report scanning, vitals tracking, and AI consults.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Stories / Testimonials */}
        <section id="trust" className="py-12 sm:py-20 px-4 sm:px-6 md:px-16 bg-surface-container-low/40">
          <div className="max-w-[1440px] mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-14">
              <span className="text-[12px] font-bold uppercase tracking-widest text-secondary block mb-2">
                Trusted by Families
              </span>
              <h2 className="text-[26px] sm:text-[32px] font-bold text-deep-navy">
                Stories From Real Family Caregivers
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              <div className="glass-panel organic-radius p-6 sm:p-8 space-y-4 border border-white">
                <p className="text-[14px] sm:text-[15px] text-deep-navy italic leading-relaxed">
                  &ldquo;I live 400 miles away from my 78-year-old mother. With CareDesk, she simply snaps a photo of her blood work at the clinic. I get an instant breakdown of her glucose and kidney numbers, and I can ask the AI what her cardiologist might suggest. It has been a lifesaver.&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-outline-variant/30">
                  <div className="size-10 rounded-full bg-secondary/15 flex items-center justify-center font-bold text-secondary text-sm">
                    SK
                  </div>
                  <div>
                    <h5 className="text-[14px] font-bold text-deep-navy">Sunita K.</h5>
                    <p className="text-[12px] text-on-surface-variant">Caring for Mother (Bengaluru)</p>
                  </div>
                </div>
              </div>

              <div className="glass-panel organic-radius p-6 sm:p-8 space-y-4 border border-white">
                <p className="text-[14px] sm:text-[15px] text-deep-navy italic leading-relaxed">
                  &ldquo;The Care Code invite took literally 10 seconds. My dad is not tech-savvy, but I just told him to open the app and type &apos;CARE-419&apos;. We were immediately paired, and now my sister and I can both monitor his hypertension medications together.&rdquo;
                </p>
                <div className="flex items-center gap-3 pt-2 border-t border-outline-variant/30">
                  <div className="size-10 rounded-full bg-electric-blue/25 flex items-center justify-center font-bold text-deep-navy text-sm">
                    MR
                  </div>
                  <div>
                    <h5 className="text-[14px] font-bold text-deep-navy">Michael R.</h5>
                    <p className="text-[12px] text-on-surface-variant">Caring for Father (Mumbai)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full bg-deep-navy text-white px-4 sm:px-6 md:px-16 py-10 sm:py-12 border-t border-white/10">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-center">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Logo size="md" light />
                <span className="text-[11px] font-bold bg-white/10 text-white px-2 py-0.5 rounded-full uppercase">
                  ElderCare
                </span>
              </div>
              <p className="text-surface-dim/70 text-[13px]">
                Connected health intelligence and compassionate caregiving for aging loved ones.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 sm:gap-6 md:justify-end text-[13px] text-surface-dim/70">
              <Link href="/sign-up?role=caregiver" className="hover:text-white transition-colors">Caregivers</Link>
              <Link href="/sign-up?role=patient" className="hover:text-white transition-colors">Seniors</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/about" className="hover:text-white transition-colors">About Us</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

/** Above this size, upload in slices to stay under host request-body limits. */
const CHUNK_THRESHOLD = 3 * 1024 * 1024
const CHUNK_SIZE = 3 * 1024 * 1024

async function sendAnalyzeRequest(file: File): Promise<Response> {
  if (file.size <= CHUNK_THRESHOLD) {
    const formData = new FormData()
    formData.append('file', file)
    return fetch('/api/public/analyze', { method: 'POST', body: formData })
  }

  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const total = Math.ceil(file.size / CHUNK_SIZE)

  for (let index = 0; index < total; index++) {
    const blob = file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
    const formData = new FormData()
    formData.append('file', blob, file.name)
    if (index === total - 1) {
      formData.append('fileName', file.name)
      formData.append('mimeType', file.type)
    }
    const res = await fetch('/api/public/analyze', {
      method: 'POST',
      body: formData,
      headers: {
        'X-Upload-Id': uploadId,
        'X-File-Index': String(index),
        'X-File-Total': String(total),
      },
    })
    if (index < total - 1) {
      if (!res.ok) return res
      continue
    }
    return res
  }

  throw new Error('Chunked upload failed')
}
