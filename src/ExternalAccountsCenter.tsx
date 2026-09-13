import { useState } from 'react'
import { CheckCircle2, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { useCustomerData } from './CustomerProvider'
import { isValidUSRoutingNumber, saveVerifiedExternalAccount } from './accountVerificationService'
import './financial-center.css'

const mask = (value: string) => `••••${value.slice(-4)}`

export default function ExternalAccountsCenter() {
  const { externalAccounts, refresh } = useCustomerData()
  const [open, setOpen] = useState(false)
  const [routingNumber, setRoutingNumber] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [accountType, setAccountType] = useState<'checking' | 'savings'>('checking')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setRoutingNumber(''); setAccountNumber(''); setAccountName(''); setAccountType('checking'); setError(''); setNotice(''); setOpen(false)
  }

  const submit = async () => {
    setError(''); setNotice('')
    if (!isValidUSRoutingNumber(routingNumber)) return setError('Enter a valid 9-digit U.S. ABA routing number.')
    if (!/^\d{4,17}$/.test(accountNumber.replace(/\D/g, ''))) return setError('Enter a valid U.S. account number (4–17 digits).')
    if (!accountName.trim()) return setError('Enter the account holder name.')
    setSaving(true)
    try {
      await saveVerifiedExternalAccount({ routingNumber, accountNumber, accountHolderName: accountName, accountType })
      await refresh()
      setNotice('External account added. This is synthetic format validation; no live ownership check was performed.')
      setRoutingNumber(''); setAccountNumber(''); setAccountName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to add external account.')
    } finally { setSaving(false) }
  }

  return <main className="financial-center">
    <header className="financial-hero">
      <div><span className="eyebrow">MONEY MOVEMENT · U.S. ACCOUNTS</span><h1>External accounts</h1><p>Manage U.S. bank accounts used for transfers and funding.</p></div>
      <button className="button primary" onClick={() => { setNotice(''); setError(''); setOpen(true) }}><Plus size={15}/>Add account</button>
    </header>

    <section className="financial-grid">
      <article className="financial-card wide">
        <div className="financial-card-head"><div><h2>Linked U.S. accounts</h2><p>{externalAccounts.length} account{externalAccounts.length === 1 ? '' : 's'} connected</p></div><ShieldCheck size={20}/></div>
        {externalAccounts.length ? <div className="financial-list">{externalAccounts.map(account => <div className="financial-list-row" key={account.id}>
          <span className="financial-icon"><ShieldCheck size={16}/></span><div><b>{account.institution_name}</b><small>{account.account_type} · {mask(String(account.account_number_last4 || ''))}</small></div><span className="status-pill"><CheckCircle2 size={13}/> {account.verification_status}</span><button className="icon-button" title="Remove account" disabled><Trash2 size={15}/></button>
        </div>)}</div> : <div className="empty-state"><ShieldCheck size={24}/><b>No external accounts yet</b><p>Add a U.S. routing number, account number and account-holder name to create a synthetic linked account.</p></div>}
      </article>
    </section>

    {open && <div className="drawer-backdrop" onClick={reset}><aside className="drawer" onClick={e => e.stopPropagation()}>
      <div className="drawer-head"><div><small>U.S. EXTERNAL ACCOUNT</small><h2>Add account</h2></div><button className="icon-button" onClick={reset}>×</button></div>
      <div className="form-grid">
        <label>Routing number<input inputMode="numeric" maxLength={9} value={routingNumber} onChange={e => setRoutingNumber(e.target.value.replace(/\D/g, ''))} placeholder="9 digits"/></label>
        <label>Account number<input inputMode="numeric" maxLength={17} value={accountNumber} onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))} placeholder="4–17 digits"/></label>
        <label>Account holder name<input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Name on account"/></label>
        <label>Account type<select value={accountType} onChange={e => setAccountType(e.target.value as 'checking' | 'savings')}><option value="checking">Checking</option><option value="savings">Savings</option></select></label>
        {error && <div className="form-error">{error}</div>}
        {notice && <div className="available-note"><CheckCircle2 size={15}/><span>{notice}</span></div>}
        <div className="review-actions"><button className="button secondary" onClick={reset}>Cancel</button><button className="button primary" disabled={saving} onClick={submit}>{saving ? 'Verifying…' : 'Verify & add'}</button></div>
      </div>
    </aside></div>}
  </main>
}
