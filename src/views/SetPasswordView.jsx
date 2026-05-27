import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Shield, AlertCircle, Check, CheckCircle, Mail, KeyRound } from 'lucide-react'
import Logo from '../components/Logo'
import { supabase } from '../lib/supabaseClient'
import { authLinkType, authLinkError, flowHint, prefillEmail, takeTokenHashVerification, authLandingDebug } from '../lib/authLanding'

export default function SetPasswordView() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('checking') // checking | code | ready | success

  // Code-entry (primary, scanner-proof) state.
  const [email, setEmail] = useState(prefillEmail || '')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [note, setNote] = useState('')

  // Set-password state.
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [err, setErr] = useState('')
  const firstFieldRef = useRef(null)

  useEffect(() => {
    let mounted = true
    let settled = false
    console.log('[set-password] landing detected:', authLandingDebug)

    const toReady = () => {
      if (mounted && !settled) {
        settled = true
        setPhase('ready')
      }
    }
    const toCode = (message) => {
      if (mounted && !settled) {
        settled = true
        if (message) setNote(message)
        setPhase('code')
      }
    }

    // Legacy #access_token flow (parsed async by detectSessionInUrl) + recovery event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) toReady()
    })

    async function init() {
      // Fallback 1: a token_hash link, IF one ever survives a scanner unburned.
      const otp = takeTokenHashVerification()
      if (otp) {
        console.log('[set-password] verifyOtp(token_hash) type=', otp.type)
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: otp.token_hash, type: otp.type })
        if (!mounted) return
        if (!error && data?.session) {
          console.log('[set-password] token_hash OK — session established')
          toReady()
          return
        }
        console.warn('[set-password] token_hash failed, using code entry:', error)
        toCode('Enter the code from your email to continue.')
        return
      }

      // Fallback 2: already signed in (legacy hash parsed, or an existing session).
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data.session) {
        toReady()
        return
      }

      // PRIMARY: bare landing (or an expired/burned link) → type the code.
      toCode(authLinkError ? 'That link has expired — enter the code from your email instead.' : '')
    }

    init()
    // Safety net: never get stuck on the spinner.
    const timer = setTimeout(() => toCode(''), 8000)

    return () => {
      mounted = false
      settled = true
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (phase === 'code' || phase === 'ready') {
      const id = setTimeout(() => firstFieldRef.current?.focus(), 60)
      return () => clearTimeout(id)
    }
  }, [phase])

  async function verifyCode(e) {
    e.preventDefault()
    setErr('')
    const cleanEmail = email.trim()
    const cleanCode = code.trim()
    if (!cleanEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErr('Enter the email you were invited with')
      return
    }
    if (cleanCode.length < 6) {
      setErr('Enter the 6-digit code from your email')
      return
    }
    setVerifying(true)
    // If the page link carried a hint use it; otherwise try invite then recovery.
    const typeHint = authLinkType || flowHint
    const types = typeHint ? [typeHint] : ['invite', 'recovery']
    let lastErr = null
    for (const t of types) {
      console.log('[set-password] verifyOtp(code) type=', t)
      const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: t })
      if (!error && data?.session) {
        setVerifying(false)
        setErr('')
        setNote('')
        setPhase('ready')
        return
      }
      lastErr = error
    }
    setVerifying(false)
    console.error('[set-password] code verify failed:', lastErr)
    setErr(lastErr?.message || 'That code is invalid or has expired. Ask for a new invite.')
  }

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (pw.length < 6) {
      setErr('Password must be at least 6 characters')
      return
    }
    if (pw !== pw2) {
      setErr('Passwords don’t match')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setSubmitting(false)
    if (error) {
      setErr(error.message || 'Could not set password — try again.')
      return
    }
    setPhase('success')
    setTimeout(() => navigate('/admin', { replace: true }), 1400)
  }

  return (
    <div className="login">
      <div className="screen-bg" />
      <div className="login__card">
        <div className="login__bolt" aria-hidden="true" />
        <div className="login__brand">
          <Logo withText={false} size="xl" />
          <span className="login__tag">ORGANIZER ACCESS</span>
        </div>

        {phase === 'checking' && (
          <div className="login__heading">
            <h1>Verifying…</h1>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner" /> One moment
            </p>
          </div>
        )}

        {phase === 'code' && (
          <form onSubmit={verifyCode}>
            <div className="login__heading">
              <h1>Enter your code</h1>
              <p>Enter the email you were invited with and the 6-digit code from your email.</p>
            </div>

            {note && !err && (
              <div
                className="login__error"
                style={{
                  background: 'rgba(139,92,246,0.08)',
                  borderColor: 'rgba(139,92,246,0.30)',
                  color: 'var(--violet-ice)',
                }}
              >
                <AlertCircle size={14} />
                <span>{note}</span>
              </div>
            )}
            {err && (
              <div className="login__error" role="alert" key={err}>
                <AlertCircle size={14} />
                <span>{err}</span>
              </div>
            )}

            <div className="field">
              <label className="field__label">Email</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={14}
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }}
                />
                <input
                  ref={firstFieldRef}
                  className="field__input"
                  type="email"
                  placeholder="you@arena.gg"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            <div className="field">
              <label className="field__label">6-digit code</label>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={14}
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }}
                />
                <input
                  className="field__input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                  style={{ paddingLeft: 36, letterSpacing: '0.3em', fontFamily: 'var(--f-mono)' }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn--primary login__btn" disabled={verifying} style={{ marginTop: 6 }}>
              {verifying ? (
                <>
                  <span className="spinner" />
                  Verifying…
                </>
              ) : (
                <>
                  <Check size={14} />
                  Verify code
                </>
              )}
            </button>

            <div className="login__divider" />
            <div
              className="login__footnote"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
            >
              <Shield size={11} />
              Secured by Supabase Auth
            </div>
          </form>
        )}

        {phase === 'ready' && (
          <form onSubmit={submit}>
            <div className="login__heading">
              <h1>Set your password</h1>
              <p>Create a password to finish setting up your organizer account.</p>
            </div>

            {err && (
              <div className="login__error" role="alert" key={err}>
                <AlertCircle size={14} />
                <span>{err}</span>
              </div>
            )}

            <div className="field">
              <label className="field__label">New password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={14}
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }}
                />
                <input
                  ref={firstFieldRef}
                  className="field__input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                />
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="field">
              <label className="field__label">Confirm password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={14}
                  style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }}
                />
                <input
                  className="field__input"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  autoComplete="new-password"
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>

            <button type="submit" className="btn btn--primary login__btn" disabled={submitting} style={{ marginTop: 6 }}>
              {submitting ? (
                <>
                  <span className="spinner" />
                  Saving…
                </>
              ) : (
                <>
                  <Check size={14} />
                  Set password
                </>
              )}
            </button>

            <div className="login__divider" />
            <div
              className="login__footnote"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}
            >
              <Shield size={11} />
              Secured by Supabase Auth
            </div>
          </form>
        )}

        {phase === 'success' && (
          <div className="login__heading">
            <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={20} style={{ color: 'var(--success)' }} /> Password set
            </h1>
            <p>Signing you in…</p>
          </div>
        )}
      </div>
    </div>
  )
}
