import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, Shield, AlertCircle, LogIn } from 'lucide-react'
import Logo from '../components/Logo'
import { supabase } from '../lib/supabaseClient'

export default function LoginView() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const emailRef = useRef(null)

  useEffect(() => {
    emailRef.current && emailRef.current.focus()
  }, [])

  // Already signed in? Skip straight to admin.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/admin', { replace: true })
    })
  }, [navigate])

  async function submit(e) {
    e && e.preventDefault()
    setErr('')
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErr('Enter a valid email address')
      return
    }
    if (!password) {
      setErr('Password is required')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setErr(error.message || "Email or password didn't match. Try again.")
      return
    }
    navigate('/admin', { replace: true })
  }

  return (
    <div className="login">
      <div className="screen-bg" />
      <form className="login__card" onSubmit={submit}>
        <div className="login__bolt" aria-hidden="true" />
        <div className="login__brand">
          <Logo withText={false} size="xl" />
          <span className="login__tag">ORGANIZER ACCESS</span>
        </div>
        <div className="login__heading">
          <h1>ARENA ELEAGUE</h1>
          <p>Sign in to manage your tournaments.</p>
        </div>

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
              ref={emailRef}
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
          <label className="field__label">Password</label>
          <div style={{ position: 'relative' }}>
            <Lock
              size={14}
              style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-mute)' }}
            />
            <input
              className="field__input"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
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

        <button type="submit" className="btn btn--primary login__btn" disabled={loading} style={{ marginTop: 6 }}>
          {loading ? (
            <>
              <span className="spinner" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn size={14} />
              Sign in
            </>
          )}
        </button>

        <div className="login__divider" />
        <div className="login__footnote" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}>
          <Shield size={11} />
          Protected by Supabase Auth
        </div>
      </form>
    </div>
  )
}
