import fs from 'node:fs'

const path = 'src/App.tsx'
let source = fs.readFileSync(path, 'utf8')
if (source.includes('FOXSYCU_RUNTIME_WIRED')) process.exit(0)

source = source.replace("import { useState } from 'react'", "import { useState } from 'react'")
source = source.replace("import { customer } from './data/mockData'", "import { customer } from './data/mockData'\nimport { refreshCustomerSnapshot, runtimeEngine, useRuntimeRefresh } from './data/runtimeBanking'")

const transfersStart = source.indexOf('function Transfers() {')
const transactionsStart = source.indexOf('function Transactions() {', transfersStart)
if (transfersStart === -1 || transactionsStart === -1) throw new Error('Could not locate Transfers/Transactions components')

const transfers = `function Transfers() {
  const [mode, setMode] = useState<'send' | 'withdraw' | 'deposit' | null>(null)
  const [amount, setAmount] = useState('')
  const [beneficiary, setBeneficiary] = useState('Alex Smith')
  const [memo, setMemo] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const close = () => { setMode(null); setAmount(''); setMemo(''); setError(''); setMessage('') }
  const submit = () => {
    setError(''); setMessage(''); setBusy(true)
    try {
      const value = Number(amount)
      if (mode === 'deposit') throw new Error('Deposits are admin-approved in this simulated environment. Customers cannot self-credit an account.')
      if (mode === 'send') runtimeEngine.send({ amount: value, beneficiary, memo })
      if (mode === 'withdraw') runtimeEngine.withdraw({ amount: value, memo })
      refreshCustomerSnapshot()
      setMessage(mode === 'send' ? 'Transfer completed successfully.' : 'Withdrawal completed successfully.')
      setAmount(''); setMemo('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Transaction could not be completed.') } finally { setBusy(false) }
  }
  return <>
    <PageHead eyebrow="MOVE MONEY" title="Move money" description="Deposit, withdraw, or send simulated USD securely."/>
    <section className="transfer-grid">
      <button className="action-tile" onClick={() => { setMode('deposit'); setError(''); setMessage('') }}><span className="action-icon"><ArrowDownLeft size={17}/></span><span><b>Deposit USD</b><small>Request simulated funds</small></span><ChevronRight size={15}/></button>
      <button className="action-tile" onClick={() => { setMode('withdraw'); setError(''); setMessage('') }}><span className="action-icon"><ArrowUpRight size={17}/></span><span><b>Withdraw USD</b><small>Move funds out of your account</small></span><ChevronRight size={15}/></button>
      <button className="action-tile" onClick={() => { setMode('send'); setError(''); setMessage('') }}><span className="action-icon"><MoveRight size={17}/></span><span><b>Send USD</b><small>Transfer to a beneficiary</small></span><ChevronRight size={15}/></button>
    </section>
    {mode && <Panel title={mode === 'send' ? 'Send USD' : mode === 'withdraw' ? 'Withdraw USD' : 'Deposit USD'} subtitle={mode === 'deposit' ? 'Customer deposits require admin approval.' : 'Review the details before posting this simulated transaction.'}>
      <div className="detail-grid">
        <div><span>Available balance</span><b>{money(customer.availableBalance)}</b></div>
        {mode === 'send' && <label><span>Beneficiary</span><select value={beneficiary} onChange={e => setBeneficiary(e.target.value)}><option>Alex Smith</option><option>Maria Johnson</option><option>Northstar Holdings</option></select></label>}
        {mode !== 'deposit' && <label><span>Amount (USD)</span><input value={amount} onChange={e => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" /></label>}
        {mode !== 'deposit' && <label><span>Memo (optional)</span><input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Payment reference" /></label>}
      </div>
      {error && <p role="alert" className="error-text">{error}</p>}
      {message && <p className="green-text">{message}</p>}
      <div className="head-actions">{mode === 'deposit' ? <button className="primary" onClick={() => setError('Deposit request recorded for admin review. No customer balance was changed.')}>Request admin review</button> : <button className="primary" disabled={busy} onClick={submit}>{busy ? 'Processing…' : 'Confirm transaction'}</button>}<button className="secondary" onClick={close}>Close</button></div>
    </Panel>}
    <Panel title="Recent recipients" subtitle="Beneficiaries you can send to"><div className="recipient-list"><div><span className="recipient-avatar">AS</span><div><b>Alex Smith</b><small>•••• 1920 · USD</small></div><ChevronRight size={15}/></div><div><span className="recipient-avatar">MJ</span><div><b>Maria Johnson</b><small>•••• 4472 · USD</small></div><ChevronRight size={15}/></div><div><span className="recipient-avatar">NH</span><div><b>Northstar Holdings</b><small>•••• 8104 · USD</small></div><ChevronRight size={15}/></div></div></Panel>
  </>
}

`
source = source.slice(0, transfersStart) + transfers + source.slice(transactionsStart)
const shell = source.indexOf('function Shell({ children }')
const shellOpen = shell === -1 ? -1 : source.indexOf('{', shell)
if (shellOpen === -1) throw new Error('Could not locate Shell component')
source = source.slice(0, shellOpen + 1) + '\n  // FOXSYCU_RUNTIME_WIRED\n  useRuntimeRefresh()' + source.slice(shellOpen + 1)
source = source.replace('to="/transfers" className="secondary">View activity', 'to="/transactions" className="secondary">View activity')
source = source.replace('<div className="chart-value">$12,450.00', '<div className="chart-value">{money(customer.availableBalance)}')
fs.writeFileSync(path, source)
