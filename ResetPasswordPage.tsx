import { FormEvent, useState } from 'react'
import { Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { FNCUWordmark } from './FNCUBrand'
import './auth.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setMessage('')
    if (password.length < 10) return setMessage('Use a password with at least 10 characters.')
    if (password !== confirmation) return setMessage('The passwords do not match.')
    setBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      setMessage('Your password has been changed. You can now sign in with your new password.')
      await supabase.auth.signOut()
    } catch (error) {
      const raw = error instanceof Error ? error.message : String(error || '')
      setMessage(raw.toLowerCase().includes('expired') || raw.toLowerCase().includes('invalid')
        ? 'This password recovery link is no longer valid. Request a new recovery email and try again.'
        : 'We could not change your password. Request a new recovery email and try again.')
    } finally {
      setBusy(false)
    }
  }

  return <main className="welcome">
    <div className="welcome-brand"><FNCUWordmark compact /></div>
    <div className="auth-modal" style={{ position: 'static', opacity: 1 }}><section className="auth-card-wide">
      <span className="auth-eyebrow">FNCU CUSTOMER ACCESS</span>
      <h2>{success ? 'Password changed' : 'Change your password'}</h2>
      {!success ? <form onSubmit={submit}>
        <label>New password<div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required minLength={10} autoComplete="new-password" placeholder="At least 10 characters" /><button type="button" className="password-toggle" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        <label>Confirm new password<div className="password-field"><input type={showConfirmation ? 'text' : 'password'} value={confirmation} onChange={e => setConfirmation(e.target.value)} required minLength={10} autoComplete="new-password" /><button type="button" className="password-toggle" onClick={() => setShowConfirmation(v => !v)} aria-label={showConfirmation ? 'Hide password' : 'Show password'}>{showConfirmation ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
        <button className="auth-submit" disabled={busy}>{busy ? 'Changing password…' : 'Change password'}</button>
      </form> : <button className="auth-submit" onClick={() => navigate('/login', { replace: true })}>Return to sign in</button>}
      {message && <div className="auth-message">{message}</div>}
      {!success && <div className="welcome-secure" style={{ marginTop: 18 }}><ShieldCheck size={15} /> Secure password recovery</div>}
    </section></div>
  </main>
}
