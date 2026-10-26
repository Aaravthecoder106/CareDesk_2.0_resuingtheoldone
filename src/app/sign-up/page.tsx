'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Loader2, AlertCircle, CheckCircle2, Shield, HeartHandshake, User } from 'lucide-react'

function SignUpContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'
  const roleParam = searchParams.get('role')

  const [role, setRole] = useState<'caregiver' | 'patient'>(
    roleParam === 'patient' ? 'patient' : 'caregiver'
  )
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    if (supabaseUrl.includes('placeholder') || !supabaseUrl) {
      setErrorMessage('Supabase is not configured yet. Please configure NEXT_PUBLIC_SUPABASE_URL in your environment.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            role: role,
            elder_care_role: role,
          },
        },
      })

      if (error) {
        setErrorMessage(error.message)
        setLoading(false)
        return
      }

      // If Supabase has email confirmation disabled, a session is created immediately
      if (data.session) {
        router.push(redirectUrl)
        router.refresh()
        return
      }

      // If email confirmation is enabled in Supabase settings
      if (data.user && !data.session) {
        setEmailSent(true)
        setLoading(false)
        return
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Sign-up failed')
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    setErrorMessage('')
    setOauthLoading(true)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    if (supabaseUrl.includes('placeholder') || !supabaseUrl) {
      setErrorMessage('Google OAuth is not configured: Supabase URL is set to placeholder. Please configure your environment variables or use Email/Password sign up.')
      setOauthLoading(false)
      return
    }

    try {
      const supabase = createBrowserSupabaseClient()
      const origin = window.location.origin
      const callbackUrl = `${origin}/api/auth/callback?next=${encodeURIComponent(redirectUrl)}&role=${role}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      })

      if (error) {
        setErrorMessage(error.message)
        setOauthLoading(false)
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Google sign-up failed')
      setOauthLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo size="md" className="justify-center" />
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20">
            <span className="material-symbols-outlined text-secondary text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>vital_signs</span>
            <span className="text-[11px] font-bold tracking-wider uppercase text-secondary">Elder Care Platform</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-deep-navy">Join CareDesk ElderCare</h1>
          <p className="mt-1 text-[14px] text-on-surface-variant">Connecting seniors and family caregivers with real-time health intelligence</p>
        </div>

        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-8 shadow-sm">
          {emailSent ? (
            <div className="text-center py-4">
              <CheckCircle2 className="mx-auto h-12 w-12 text-secondary mb-3" />
              <h2 className="text-lg font-semibold text-on-surface">Check your email</h2>
              <p className="mt-2 text-[14px] text-on-surface-variant leading-relaxed">
                We sent a verification link to <strong className="text-on-surface">{email}</strong>. Please click the link in your inbox to confirm your account and get started.
              </p>
              <div className="mt-6">
                <Link
                  href="/sign-in"
                  className="inline-block text-[14px] font-medium text-secondary hover:underline"
                >
                  Return to sign in
                </Link>
              </div>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-6 flex items-start gap-3 rounded-xl bg-destructive/10 p-4 text-[13px] text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Role Selection */}
              <div className="mb-6">
                <label className="block text-[13px] font-semibold text-deep-navy mb-2">
                  I am signing up as:
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('caregiver')}
                    className={`flex flex-col items-center text-center p-3.5 rounded-xl border-2 transition-all ${
                      role === 'caregiver'
                        ? 'border-secondary bg-secondary/10 shadow-sm ring-1 ring-secondary/30'
                        : 'border-outline-variant/30 hover:border-outline-variant/60 bg-surface'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center mb-2">
                      <Shield className="size-5 text-secondary" />
                    </div>
                    <span className="text-[13px] font-bold text-deep-navy">Family Caregiver</span>
                    <span className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
                      Caring for elderly parents or family
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('patient')}
                    className={`flex flex-col items-center text-center p-3.5 rounded-xl border-2 transition-all ${
                      role === 'patient'
                        ? 'border-secondary bg-secondary/10 shadow-sm ring-1 ring-secondary/30'
                        : 'border-outline-variant/30 hover:border-outline-variant/60 bg-surface'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-electric-blue/20 flex items-center justify-center mb-2">
                      <User className="size-5 text-deep-navy" />
                    </div>
                    <span className="text-[13px] font-bold text-deep-navy">Senior / Patient</span>
                    <span className="text-[11px] text-on-surface-variant leading-tight mt-0.5">
                      Managing my own health & vitals
                    </span>
                  </button>
                </div>
              </div>

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={oauthLoading || loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-outline-variant/40 bg-surface px-4 py-2.5 text-[14px] font-medium text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50"
              >
                {oauthLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-secondary" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>

              <div className="relative my-6 text-center text-xs text-on-surface-variant">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/30" />
                </div>
                <span className="relative bg-surface-container-lowest px-2 uppercase tracking-wider text-[11px]">
                  Or sign up with email
                </span>
              </div>

              {/* Email / Password Form */}
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[13px] font-medium text-on-surface mb-1">
                      First name
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jane"
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-medium text-on-surface mb-1">
                      Last name
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Doe"
                      className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-on-surface mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-on-surface mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-outline-variant/40 bg-surface px-3.5 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-secondary focus:outline-none focus:ring-1 focus:ring-secondary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || oauthLoading}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-[14px] font-medium text-secondary-foreground hover:bg-secondary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </button>
              </form>

              <p className="mt-6 text-center text-[13px] text-on-surface-variant">
                Already have an account?{' '}
                <Link
                  href={`/sign-in${redirectUrl !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                  className="font-medium text-secondary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-[13px] text-on-surface-variant hover:text-on-surface transition-colors">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}

function SignUpFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    </main>
  )
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<SignUpFallback />}>
      <SignUpContent />
    </Suspense>
  )
}
