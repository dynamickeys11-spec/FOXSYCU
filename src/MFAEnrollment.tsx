import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function MFAEnrollment({ onDone }: { onDone: () => void }) {
  const [factorId, setFactorId] = useState('')
  const [qr, setQr] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'FOXSYCU Authenticator' }).then(({ data, error }) => {
      if (error) { setError(error.message); return }
      setFactorId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret)
    })
  }, [])

  const enable = async () => {
    if (!factorId || code.length !== 6) return
    setBusy(true); setError('')
    const challenge = await supabase.auth.mfa.challenge({ factorId })
    if (challenge.error) { setError(challenge.error.message); setBusy(false); return }
    const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code })
    setBusy(false)
    if (result.error) { setError(result.error.message); return }
    onDone()
  }

  return <div className="sp-mfa-enroll"><div className="sp-mfa-qr">{qr ? <img src={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`} alt="Authenticator QR code" /> : 'Preparing secure enrollment…'}</div><p>Scan this QR code with an authenticator app, then enter the current 6-digit code.</p>{secret && <code>{secret}</code>}<input inputMode="numeric" maxLength={6} placeholder="000000" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}/><button className="sp-primary" disabled={busy || code.length !== 6} onClick={() => void enable()}>{busy ? 'Enabling…' : 'Enable authenticator'}</button>{error && <small className="sp-error">{error}</small>}</div>
}
