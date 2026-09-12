import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './auth.css'

export function MFAChallenge({ onVerified }: { onVerified: () => void }) {
  const [mode, setMode] = useState<'authenticator' | 'recovery'>('authenticator')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [factorId, setFactorId] = useState('')

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) setError(error.message)
      const factor = data?.totp.find(item => item.status === 'verified')
      if (factor) setFactorId(factor.id)
    })
  }, [])

  const verifyAuthenticator = async () => {
    if (!factorId || code.length !== 6) return
    setBusy(true); setError('')
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) { setError(challenge.error.message); setBusy(false); return }
    const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code })
    setBusy(false)
    if (result.error) { setError(result.error.message); return }
    onVerified()
  }

  const verifyRecovery = async () => {
    if (code.trim().length < 8) return
    setBusy(true); setError('')
    const recoveryApi = (supabase.auth.mfa as any).recoveryCodes
    if (!recoveryApi) { setError('Recovery codes are not available in this authentication client.'); setBusy(false); return }
    const { error } = await recoveryApi.verify({ code: code.trim() })
    setBusy(false)
    if (error) { setError(error.message); return }
    onVerified()
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>F</span><div><b>FOXSYCU</b><small>DIGITAL BANKING SYSTEM</small></div></div><span className="auth-eyebrow">ADDITIONAL AUTHENTICATION</span><h1>{mode === 'authenticator' ? 'Verify your identity' : 'Use a recovery code'}</h1><p>{mode === 'authenticator' ? 'Enter the 6-digit code from your authenticator app to continue to banking.' : 'Enter one of your one-time recovery codes. Supabase will upgrade this session to the required security level.'}</p>{mode === 'authenticator' ? <label>Authentication code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /></label> : <label>Recovery code<input autoCapitalize="characters" autoComplete="off" value={code} onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20))} /></label>}<button disabled={busy || (mode === 'authenticator' ? code.length !== 6 || !factorId : code.length < 8)} onClick={() => void (mode === 'authenticator' ? verifyAuthenticator() : verifyRecovery())}>{busy ? 'Verifying…' : 'Verify and continue'}</button>{error && <div className="auth-message">{error}</div>}<button className="auth-switch" onClick={() => { setMode(mode === 'authenticator' ? 'recovery' : 'authenticator'); setCode(''); setError('') }}>{mode === 'authenticator' ? 'Lost access to your authenticator? Use a recovery code' : 'Use authenticator instead'}</button></section></main>
}
