import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './auth.css'

export function MFAChallenge({ onVerified }: { onVerified: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [factorId, setFactorId] = useState('')

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) setError(error.message)
      const factor = data?.totp.find(item => item.status === 'verified')
      if (factor) setFactorId(factor.id)
      else setError('No verified authenticator factor is available for this account.')
    })
  }, [])

  const verify = async () => {
    if (!factorId || code.length !== 6) return
    setBusy(true); setError('')
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) { setError(challenge.error.message); setBusy(false); return }
    const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code })
    setBusy(false)
    if (result.error) { setError(result.error.message); return }
    onVerified()
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>F</span><div><b>FOXSYCU</b><small>DIGITAL BANKING SYSTEM</small></div></div><span className="auth-eyebrow">ADDITIONAL AUTHENTICATION</span><h1>Verify your identity</h1><p>Enter the 6-digit code from your authenticator app to continue to banking.</p><label>Authentication code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label><button disabled={busy || code.length !== 6 || !factorId} onClick={() => void verify()}>{busy ? 'Verifying…' : 'Verify and continue'}</button>{error && <div className="auth-message">{error}</div>}</section></main>
}
