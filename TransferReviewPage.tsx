import { useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { createMoneyMovement } from './moneyMovementServiceV2'
import TransferAuthorizationPanel from './TransferAuthorizationPanel'
import './feature-banking.css'

type Draft = {
  rail: any
  sourceAccountId: string
  amount: number
  memo: string
  fee: number
  destinationNumber: string
  selectedDestination: any
  country: 'US' | 'GB'
  internationalDestination: any
  recipientName: string
  externalAccount: string
  externalRouting: string
  externalAccountType: string
  p2pEmail: string
}

const KEY = 'fncu:transfer-review-draft'

const money = (n: number) =>
  `${n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const railLabel = (rail: string) => (rail === 'zelle_like' ? 'P2P' : rail.toUpperCase())

export default function TransferReviewPage() {
  const { account, refresh } = useCustomerData()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [movement, setMovement] = useState<any>(null)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY)
      if (raw) setDraft(JSON.parse(raw))
    } catch {
      setDraft(null)
    }
  }, [])

  const create = async () => {
    if (!draft || !account?.id) return

    setBusy(true)
    setError('')

    try {
      if (draft.sourceAccountId !== account.id) {
        throw new Error('This transfer draft belongs to a different account.')
      }

      if (
        draft.rail !== 'deposit' &&
        draft.amount + draft.fee > Number(account.available_balance || 0)
      ) {
        throw new Error('The transfer amount is no longer available from this account.')
      }

      let metadata: Record<string, unknown>

      if (draft.rail === 'international') {
        metadata = {
          counterparty: draft.internationalDestination?.recipient_name || null,
          directory_destination_id: draft.internationalDestination?.id || null,
          destination_country: draft.internationalDestination?.country_code || null,
          destination_currency: draft.internationalDestination?.destination_currency || null,
          destination_account_identifier:
            draft.internationalDestination?.account_number ||
            draft.internationalDestination?.iban ||
            null,
          destination_routing_or_sort:
            draft.internationalDestination?.routing_number ||
            draft.internationalDestination?.sort_code ||
            null,
          destination_swift_bic: draft.internationalDestination?.swift_bic || null,
          destination_institution: draft.internationalDestination?.institution_name || null,
          synthetic_demo: true,
        }
      } else if (draft.rail === 'internal') {
        metadata = {
          counterparty: draft.selectedDestination?.account_name || null,
          destination_account_number: draft.selectedDestination?.account_number || null,
          destination_account_type: draft.selectedDestination?.account_type || null,
          directory_destination_id: draft.selectedDestination?.directory_destination_id || null,
          synthetic_demo: Boolean(draft.selectedDestination?.synthetic_demo),
        }
      } else if (draft.rail === 'zelle_like') {
        metadata = {
          counterparty: draft.recipientName.trim(),
          recipient_name: draft.recipientName.trim(),
          email: draft.p2pEmail.trim().toLowerCase(),
          synthetic_demo: true,
        }
      } else {
        metadata = {
          counterparty: draft.recipientName.trim(),
          recipient_name: draft.recipientName.trim(),
          account_number: draft.externalAccount,
          routing_number: draft.externalRouting,
          account_type: draft.externalAccountType,
          synthetic_demo: true,
        }
      }

      const created = await createMoneyMovement({
        idempotencyKey: `fncu-transfer-${crypto.randomUUID()}`,
        rail: draft.rail,
        sourceAccountId: draft.rail === 'deposit' ? null : account.id,
        destinationAccountId:
          draft.rail === 'internal' && !draft.selectedDestination?.directory_destination_id
            ? draft.selectedDestination?.id
            : null,
        beneficiaryId: null,
        amount: draft.amount,
        currency: 'USD',
        memo: draft.memo,
        metadata,
      })

      setMovement(created)
      setError('')
    } catch (e: any) {
      setError(e?.message || 'Unable to prepare this transfer.')
    } finally {
      setBusy(false)
    }
  }

  if (!draft) {
    return (
      <BankingShell>
        <div className="fb-page">
          <header className="fb-heading">
            <span>MOVE MONEY · REVIEW</span>
            <h1>Review unavailable</h1>
            <p>The transfer draft is missing or has expired.</p>
          </header>
          <section className="fb-card">
            <button className="fb-btn primary" onClick={() => navigate('/transfers')}>
              Return to transfer center
            </button>
          </section>
        </div>
      </BankingShell>
    )
  }

  if (result) {
    return (
      <BankingShell>
        <div className="fb-page">
          <header className="fb-heading">
            <span>MOVE MONEY</span>
            <h1>Payment completed</h1>
            <p>
              The transfer was authorized and recorded by the FNCU money-movement service.
            </p>
          </header>
          <section className="fb-card">
            <div className="fb-success">
              <Check size={22} />
              <div>
                <b>Movement posted successfully</b>
                <p>
                  {money(Number(result.amount || draft.amount))} ·{' '}
                  {result.reference || 'Reference pending'}
                </p>
              </div>
            </div>
            <div className="fb-actions">
              <button
                className="fb-btn primary"
                onClick={() =>
                  navigate(`/transfers?mode=${params.get('rail') || draft.rail}`)
                }
              >
                Make another
              </button>
              <button className="fb-btn" onClick={() => navigate('/transactions')}>
                View activity
              </button>
            </div>
          </section>
        </div>
      </BankingShell>
    )
  }

  if (movement) {
    return (
      <BankingShell>
        <div className="fb-page">
          <header className="fb-heading">
            <span>MOVE MONEY · SECURITY</span>
            <h1>Authorize your payment</h1>
            <p>
              Your payment has been prepared but no funds move until the PIN and one-time
              authorization token are verified.
            </p>
          </header>
          <TransferAuthorizationPanel
            movementId={movement.movement_id || movement.id}
            amount={draft.amount}
            reference={movement.reference || 'Transfer authorization'}
            onComplete={async (r) => {
              setResult(r)
              sessionStorage.removeItem(KEY)
              await refresh()
            }}
            onBack={() => setMovement(null)}
          />
        </div>
      </BankingShell>
    )
  }

  const destinationName =
    draft.internationalDestination?.recipient_name ||
    draft.selectedDestination?.account_name ||
    draft.recipientName ||
    'Deposit'

  const destinationIdentifier =
    draft.internationalDestination?.account_number ||
    draft.internationalDestination?.iban ||
    draft.selectedDestination?.account_number ||
    draft.externalAccount ||
    draft.p2pEmail ||
    '—'

  return (
    <BankingShell>
      <div className="fb-page">
        <header className="fb-heading">
          <span>MOVE MONEY · STEP 2 OF 2</span>
          <h1>Payment summary</h1>
          <p>Review the complete transfer before authorization. No funds have moved yet.</p>
        </header>
        <section className="fb-card">
          <div className="fb-detail">
            <span>Rail</span>
            <b>{railLabel(draft.rail)}</b>
          </div>
          <div className="fb-detail">
            <span>From</span>
            <b>
              {account?.account_name || 'Checking'}
              <small>
                {account?.account_number || `•••• ${account?.account_number_last4 || '----'}`}
              </small>
            </b>
          </div>
          <div className="fb-detail">
            <span>To</span>
            <b>
              {destinationName}
              <small>{destinationIdentifier}</small>
            </b>
          </div>
          <div className="fb-detail">
            <span>Amount</span>
            <b>{money(draft.amount)}</b>
          </div>
          <div className="fb-detail">
            <span>Fee</span>
            <b>{money(draft.fee)}</b>
          </div>
          <div className="fb-total">
            <span>Total</span>
            <strong>{money(draft.amount + draft.fee)}</strong>
          </div>
          <div className="fb-detail">
            <span>Available after</span>
            <b>
              {money(
                Math.max(
                  0,
                  Number(account?.available_balance || 0) - draft.amount - draft.fee,
                ),
              )}
            </b>
          </div>
          {draft.memo && (
            <div className="fb-detail">
              <span>Memo</span>
              <b>{draft.memo}</b>
            </div>
          )}
          <div className="fb-actions">
            <button
              className="fb-btn"
              disabled={busy}
              onClick={() =>
                navigate(`/transfers?mode=${params.get('rail') || draft.rail}`)
              }
            >
              <ArrowLeft size={14} /> Edit transfer
            </button>
            <button className="fb-btn primary" disabled={busy} onClick={() => void create()}>
              {busy ? 'Preparing…' : 'Continue to authorization'} <Check size={15} />
            </button>
          </div>
          {error && <p className="fb-error">{error}</p>}
        </section>
      </div>
    </BankingShell>
  )
}
