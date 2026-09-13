import { supabase } from './supabaseClient'

export type MoneyMovementRail = 'internal' | 'ach' | 'wire' | 'zelle_like' | 'deposit'

export type MoneyMovementInput = {
  idempotencyKey: string
  rail: MoneyMovementRail
  sourceAccountId?: string | null
  destinationAccountId?: string | null
  beneficiaryId?: string | null
  amount: number
  currency?: string
  memo?: string | null
  scheduledFor?: string | null
  metadata?: Record<string, unknown>
}

export async function createMoneyMovement(input: MoneyMovementInput) {
  const { data, error } = await supabase.rpc('create_money_movement', {
    p_idempotency_key: input.idempotencyKey,
    p_rail: input.rail,
    p_source_account_id: input.sourceAccountId ?? null,
    p_beneficiary_id: input.beneficiaryId ?? null,
    p_amount: input.amount,
    p_currency: input.currency ?? 'USD',
    p_memo: input.memo ?? null,
    p_scheduled_for: input.scheduledFor ?? null,
    p_metadata: input.metadata ?? {},
    p_destination_account_id: input.destinationAccountId ?? null,
  })
  if (error) throw error
  return data as { movement_id: string; reference: string; status: string; fee: number; idempotent: boolean }
}

export async function executeMoneyMovement(movementId: string) {
  const { data, error } = await supabase.rpc('execute_money_movement', { p_movement_id: movementId })
  if (error) throw error
  return data
}

export async function createAndExecuteMoneyMovement(input: MoneyMovementInput) {
  const created = await createMoneyMovement(input)
  if (created.status === 'pending') return created
  return executeMoneyMovement(created.movement_id)
}

export async function createTransferSchedule(input: {
  rail: MoneyMovementRail
  sourceAccountId: string
  destinationAccountId?: string | null
  beneficiaryId?: string | null
  amount: number
  cadence: 'daily' | 'weekly' | 'monthly'
  nextRunAt: string
  endAt?: string | null
  memo?: string | null
  currency?: string
}) {
  const { data, error } = await supabase.rpc('create_transfer_schedule', {
    p_rail: input.rail,
    p_source_account_id: input.sourceAccountId,
    p_beneficiary_id: input.beneficiaryId ?? null,
    p_amount: input.amount,
    p_cadence: input.cadence,
    p_next_run_at: input.nextRunAt,
    p_end_at: input.endAt ?? null,
    p_memo: input.memo ?? null,
    p_currency: input.currency ?? 'USD',
  })
  if (error) throw error
  return data as string
}
