import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, Shield, AlertCircle, Check, CheckCircle } from 'lucide-react'
import Logo from '../components/Logo'
import { supabase } from '../lib/supabaseClient'
import { authLinkError, cameFromAuthLink, takeTokenHashVerification, authLandingDebug } from '../lib/authLanding'

export default function SetPasswordView() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState('checking') // checking | ready | invalid | success
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')
  const pwRef = useRef(null)

  // Establish the invite / recovery session from the link, then show the form.
  useEffect(() => {
    let mounted = true
    let settled = false
    console.log('[set-password] landing detected:', authLandingDebug)

    const ready = () => {
      if (mounted && !settled) {
        settled = true
        setPhase('ready')
      }
    }
    const invalid = (message) => {
      if (mounted && !settled) {
        settled = true
        if (message) setErr(message)
        setPhase('invalid')
      }
    }

    // Listener catches the session for the legacy #access_token flow (parsed
    // asynchronously by detectSessionInUrl) and the PASSWORD_RECOVERY event.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) ready()
    })

    async function init() {
      // NEW flow: exchange the single-use token_hash for a session via verifyOtp.
      // Do this first so an invite/recovery link always wins over any stale session.
      const otp = takeTokenHashVerification()
      if (otp) {
        console.log('[set-password] verifyOtp ->', otp)
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: otp.token_hash,
          type: otp.type,
        })
        if (!mounted) return
        if (error || !data?.session) {
          console.error('[set-password] verifyOtp failed:', error)
          invalid(error?.message || 'This link is invalid or has expired.')
        } else {
          console.log('[set-password] verifyOtp success — session established')
          ready()
        }
        return
      }

      // No token_hash. Either we already have a session (legacy hash parsed, or a
      // logged-in user), or we wait for the listener / decide it's invalid.
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      if (data.session) ready()
      else if (authLinkError || !cameFromAuthLink) invalid(authLinkError || undefined)
      // else: legacy token present, session still resolving — wait for the listener.
    }

    init()

    // Safety net: if nothing ever establishes a session, show the invalid state.
    const timer = setTimeout(() => invalid(authLinkError || undefined), 8000)

    return () => {
      mounted = false
      settled = true
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (phase === 'ready') {
      const id = setTimeout(() => pwRef.current?.focus(), 60)
      return () => clearTimeout(id)
    }
  }, [phase])

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
      setErr(error.message || 'Could not set password — try opening the link again.')
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
            <h1>Verifying your link…</h1>
            <p style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span className="spinner" /> One moment
            </p>
          </div>
        )}

        {phase === 'invalid' && (
          <>
            <div className="login__heading">
              <h1>Link invalid or expired</h1>
              <p>
                {authLinkError ||
                  'This invite or reset link is no longer valid. Ask for a new invite, or sign in if you already have a password.'}
              </p>
            </div>
            <button className="btn btn--primary login__btn" onClick={() => navigate('/login', { replace: true })}>
              Go to sign in
            </button>
          </>
        )}

        {phase === 'success' && (
          <div className="login__heading">
            <h1 style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={20} style={{ color: 'var(--success)' }} /> Password set
            </h1>
            <p>Signing you in…</p>
          </div>
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
                  ref={pwRef}
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
      </div>
    </div>
  )
}
