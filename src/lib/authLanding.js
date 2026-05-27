// Captured ONCE at module load — before the Supabase client parses and clears
// the URL. Supabase invite / password-recovery links arrive with their tokens
// in the URL (implicit flow puts them in the hash, e.g.
// #access_token=...&type=invite|recovery; PKCE uses ?code=...). Expired links
// arrive as #error=...&error_description=...
const url = typeof window !== 'undefined' ? `${window.location.hash}|${window.location.search}` : ''

export const authLinkType = (url.match(/type=(recovery|invite|signup|magiclink|email_change)/) || [])[1] || null

const errMatch = url.match(/error_description=([^&]+)/)
export const authLinkError = errMatch ? decodeURIComponent(errMatch[1].replace(/\+/g, ' ')) : null

// Did the user arrive here from a Supabase auth email link (invite / recovery /
// expired)? Used by SetPasswordView to decide between "waiting" and "invalid".
export const cameFromAuthLink =
  authLinkType === 'recovery' ||
  authLinkType === 'invite' ||
  /[#&?](access_token|code)=/.test(url) ||
  Boolean(authLinkError)

// One-shot: returns true only the first time, so we route the user to
// /set-password exactly once and never trap them there afterwards.
let redirectPending = cameFromAuthLink
export function takeAuthRedirect() {
  if (redirectPending) {
    redirectPending = false
    return true
  }
  return false
}
