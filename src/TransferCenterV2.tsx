import { useMemo, useState } from 'react'
import { ArrowRight, CalendarClock, Check, Loader2, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { createAndExecuteMoneyMovement, createTransferSchedule, type MoneyMovementRail } from './moneyMovementService'
import './feature-banking.css'

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) { return <section className="fb-card"><div className="fb-card-head"><div><h2>{title}</h2>{note && <p>{note}</p>}</div></div>{children}</section> }
function Button({ children, primary = false, ...props }: { children: React.ReactNode; primary?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`fb-btn ${primary ? 'primary' : ''}`} {...props}>{children}</button> }

export function TransferCenterV2() {
  const { beneficiaries, account, transactions, refresh } = useCustomerData()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialMode = params.get('mode')
  const [rail, setRail] = useState<MoneyMovementRail>(initialMode === 'wire' ? 'wire' : initialMode === 'zelle' ? 'zelle_like' : initialMode === 'deposit' ? 'deposit' : 'ach')
  const [recipientId, setRecipientId] = useState(params.get('recipientId') || beneficiaries[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [schedule, setSchedule] = useState(false)
  const [review, setReview] = useState(false)
  const [done, setDone] = useState(false)
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const recipient = beneficiaries.find((b: any) => b.id === recipientId)
  const value = Number(amount) || 0
  const fee = rail === 'wire' ? 15 : 0
  const completedBalance = transactions.filter((t: any) => t.status === 'Completed').reduce((sum: number, t: any) => sum + (t.direction === 'DEBIT' ? -Number(t.amount) : Number(t.amount)), 0)
  const available = Number(account?.available_balance ?? completedBalance)
  const canContinue = value > 0 && (rail === 'deposit' || value + fee <= available)

  const submit = async () => {
    if (!canContinue || !account?.id) return
    setBusy(true); setError('')
    try {
      if (schedule) {
        const nextRun = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const id = await createTransferSchedule({ rail, sourceAccountId: account.id, beneficiaryId: rail === 'deposit' ? null : recipientId || null, amount: value, cadence: 'monthly', nextRunAt: nextRun.toISOString(), memo })
        setReference(id)
      } else {
        const result: any = await createAndExecuteMoneyMovement({
          idempotencyKey: `foxsycu-${crypto.randomUUID()}`,
          rail,
          sourceAccountId: account.id,
          beneficiaryId: rail === 'deposit' ? null : recipientId || null,
          amount: value,
          memo,
          metadata: { source: 'transfer_center_v2', recipient_name: recipient?.name || null },
        })
        setReference(result?.reference || result?.posting?.reference || '')
      }
      await refresh(); setReview(false); setDone(true)
    } catch (e: any) { setError(e?.message || 'The money movement could not be completed.') }
    finally { setBusy(false) }
  }

  if (done) return <BankingShell><div className="fb-page"><header className="fb-heading"><span>MOVE MONEY</span><h1>{schedule ? 'Transfer scheduled' : 'Transfer completed'}</h1><p>{schedule ? 'The recurring instruction was saved to the banking service.' : 'The movement was posted through the banking service.'}</p></header><Card title={schedule ? 'Schedule created' : 'Payment posted'}><div className="fb-success"><Check size={22}/><div><b>{schedule ? 'Scheduled successfully' : 'Payment posted'}</b><p>{money(value)}{reference ? ` · ${reference}` : ''}</p></div></div><div className="fb-actions"><Button primary onClick={() => { setDone(false); setAmount(''); setReference('') }}>Make another</Button><Button onClick={() => navigate('/transactions')}>View activity</Button></div></Card></div></BankingShell>

  return <BankingShell><div className="fb-page"><header className="fb-heading"><span>MOVE MONEY</span><h1>Transfer center</h1><p>Transfer, wire, Zelle-style payments, deposits and scheduled movement with review before authorization.</p></header>
    <div className="fb-tabs">{([['ach', 'Transfer'], ['wire', 'Wire'], ['zelle_like', 'Zelle'], ['deposit', 'Deposit']] as const).map(([id, label]) => <button key={id} className={rail === id ? 'active' : ''} onClick={() => { setRail(id); setAmount(''); setSchedule(false) }}>{label}</button>)}</div>
    <div className="fb-grid"><Card title={rail === 'wire' ? 'Domestic wire' : rail === 'zelle_like' ? 'Send money' : rail === 'deposit' ? 'Deposit funds' : 'Transfer money'} note="Review recipient, amount, timing and fees before authorization.">
      {rail !== 'deposit' && <label className="fb-field">Recipient<select value={recipientId} onChange={e => setRecipientId(e.target.value)}>{beneficiaries.map((b: any) => <option key={b.id} value={b.id}>{b.name} · {b.account_masked}</option>)}</select></label>}
      <label className="fb-field">Amount<input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.00"/></label>
      <label className="fb-field">Memo<input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Optional memo"/></label>
      <label className="fb-check"><input type="checkbox" checked={schedule} disabled={rail === 'deposit'} onChange={e => setSchedule(e.target.checked)}/><span><b><CalendarClock size={15}/> Schedule this transfer</b><small>Saved server-side as a recurring instruction.</small></span></label>
      <Button primary disabled={!canContinue || busy} onClick={() => { setError(''); setReview(true) }}>{busy ? <><Loader2 size={15}/> Processing</> : <>Review & authorize <ArrowRight size={15}/></>}</Button>{error && <p className="fb-error">{error}</p>}
    </Card><Card title="Payment summary" note="Before authorization"><div className="fb-detail"><span>From</span><b>Private Checking · ••••4821</b></div>{rail !== 'deposit' && <div className="fb-detail"><span>Recipient</span><b>{recipient?.name || 'Select recipient'}</b></div>}<div className="fb-detail"><span>Amount</span><b>{money(value)}</b></div><div className="fb-detail"><span>Fee</span><b>{money(fee)}</b></div><div className="fb-total"><span>Total</span><strong>{money(rail === 'deposit' ? value : value + fee)}</strong></div></Card></div>
    {review && <div className="fb-modal"><div className="fb-dialog"><button className="fb-x" onClick={() => setReview(false)}><X/></button><span>REVIEW & AUTHORIZE</span><h2>Confirm payment</h2><div className="fb-review"><div><span>Rail</span><b>{rail.toUpperCase()}</b></div><div><span>Amount</span><b>{money(value)}</b></div><div><span>Recipient</span><b>{rail === 'deposit' ? 'Private Checking' : recipient?.name}</b></div><div><span>Fee</span><b>{money(fee)}</b></div></div><Button primary disabled={busy} onClick={submit}>{busy ? <><Loader2 size={15}/> Authorizing</> : <>Authorize <Check size={15}/></>}</Button>{error && <p className="fb-error">{error}</p>}</div></div>}
  </div></BankingShell>
}
