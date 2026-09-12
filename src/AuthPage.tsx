import { FormEvent, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import './auth.css'

export function AuthPage() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setMessage('You are already signed in to FOXSYCU.')
    })
  }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    const result = mode === 'sign-in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (result.error) {
      setMessage(result.error.message)
      return
    }
    setMessage(mode === 'sign-in' ? 'Signed in successfully. Return to the banking dashboard.' : 'Account created. Check your email if confirmation is enabled, then sign in.')
  }

  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span>F</span><div><b>FOXSYCU</b><small>DIGITAL BANKING SYSTEM</small></div></div><span className="auth-eyebrow">CUSTOMER ACCESS</span><h1>{mode === 'sign-in' ? 'Sign in to your account' : 'Create your customer account'}</h1><p>Secure customer authentication is handled by Supabase Auth.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label><label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} /></label><button disabled={busy}>{busy ? 'Working…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}</button></form>{message && <div className="auth-message">{message}</div>}<button className="auth-switch" onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setMessage('') }}>{mode === 'sign-in' ? 'Need an account? Create one' : 'Already have an account? Sign in'}</button></section></main>
}
