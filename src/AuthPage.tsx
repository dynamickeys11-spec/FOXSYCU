import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './auth.css'

export function AuthPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const passkeyApi = (supabase.auth as any).signInWithPasskey

  useEffect(() => { void supabase.auth.getSession().then(({ data }) => { if (data.session) navigate('/', { replace: true }) }) }, [navigate])

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setMessage('')
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) { setMessage(result.error.message); return }
    if (result.data.session) { navigate('/', { replace: true }); return }
    setMessage('Account created. Check your email if confirmation is enabled, then sign in.')
  }

  const signInWithPasskey = async () => {
    setBusy(true); setMessage('')
    try {
      const result = await (supabase.auth as any).signInWithPasskey()
      if (result.error) { setMessage(result.error.message); return }
      navigate('/', { replace: true })
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Passkey sign-in could not be completed.') }
    finally { setBusy(false) }
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>F</span><div><b>FOXSYCU</b><small>DIGITAL BANKING SYSTEM</small></div></div><span className="auth-eyebrow">CUSTOMER ACCESS</span><h1>{mode === 'sign-in' ? 'Sign in to your account' : 'Create your customer account'}</h1><p>Secure customer authentication is handled by Supabase Auth.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label><button disabled={busy}>{busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button></form>{mode === 'sign-in' && <><div className="auth-divider"><span>OR</span></div><button type="button" className="auth-secondary" disabled={busy || !passkeyApi} onClick={() => void signInWithPasskey()}>{busy ? 'Waiting for passkey…' : 'Sign in with passkey'}</button></>}{message && <div className="auth-message">{message}</div>}<button className="auth-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }}>{mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button></section></main>
}
