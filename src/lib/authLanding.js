// Captured ONCE at module load — BEFORE anything (the Supabase client or React
// Router) can strip tokens from the URL.
//
// Supabase email links (invite / recovery / signup) arrive in one of two shapes:
//   NEW (current default):  ?token_hash=pkce_...&type=invite   → verifyOtp()
//   LEGACY (older links):   #access_token=...&type=invite       → detectSessionInUrl
// Expired/invalid links arrive as ?error=...&error_description=... (or in #).

const rawHash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : ''
const rawSearch = typeof window !== 'undefined' ? window.location.search.replace(/^\?/, '') : ''
const hashParams = new URLSearchParams(rawHash)
const queryParams = new URLSearchParams(rawSearch)
const pick = (name) => queryParams.get(name) || hashParams.get(name)

export const authLinkType = pick('type') // invite | recovery | signup | magiclink | email_change | null
export const tokenHash = pick('token_hash')
// Optional hints carried by a SAFE (tokenless) page link, e.g.
//   {{ .SiteURL }}/set-password?flow=invite&email={{ .Email }}
export const flowHint = pick('flow') // 'invite' | 'recovery' | null
export const prefillEmail = pick('email')
const accessToken = hashParams.get('access_token')
const code = queryParams.get('code')
export const authLinkError = pick('error_description') || pick('error') || null

// Diagnostic snapshot — used to confirm the link format from the browser
// console. Token material (the full URL, hash, and query string) is REDACTED
// because invite/recovery landings carry bearer tokens (access_token,
// refresh_token, token_hash) that must never be written to the console. The
// boolean/strings below still tell us "an invite link landed, type=invite,
// had a token_hash" — useful for triage without exposing the secret.
export const authLandingDebug = {
  href: '(redacted)',
  search: '(redacted)',
  hash: '(redacted)',
  type: authLinkType,
  hasTokenHash: Boolean(tokenHash),
  hasAccessToken: Boolean(accessToken),
  hasCode: Boolean(code),
  error: authLinkError,
}

export const cameFromAuthLink = Boolean(
  tokenHash ||
    accessToken ||
    code ||
    authLinkError ||
    ['invite', 'recovery', 'signup', 'magiclink', 'email_change'].includes(authLinkType)
)

// Log the raw landing params so the link format can be confirmed from the
// browser console (only when something auth-ish is present in the URL).
if (typeof window !== 'undefined' && (rawSearch || rawHash)) {
  console.log('[auth-landing] URL params at load:', authLandingDebug)
}

// One-shot: route the user to /set-password exactly once (never trap them there).
let redirectPending = cameFromAuthLink
export function takeAuthRedirect() {
  if (redirectPending) {
    redirectPending = false
    return true
  }
  return false
}

// One-shot: a token_hash is single-use, so it must be exchanged via verifyOtp
// exactly once (a second attempt — e.g. React StrictMode's double-invoke — fails).
let tokenHashPending = Boolean(tokenHash)
export function takeTokenHashVerification() {
  if (tokenHashPending && tokenHash) {
    tokenHashPending = false
    return { token_hash: tokenHash, type: authLinkType || 'invite' }
  }
  return null
}
