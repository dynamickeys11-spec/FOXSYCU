import { supabase } from './supabaseClient'

export type BankOption={name:string;code:string;active:boolean}
export type VerifiedBankAccount={verified:true;account_number:string;account_name:string;provider:string;bank_code:string}

export async function listNigerianBanks(){
  const {data,error}=await supabase.functions.invoke('verify-bank-account',{body:{action:'banks'}})
  if(error) throw error
  if(data?.error) throw new Error(data.error)
  return (data?.banks||[]) as BankOption[]
}

export async function resolveNigerianBankAccount(accountNumber:string,bankCode:string){
  const clean=accountNumber.replace(/\D/g,'')
  if(clean.length!==10) throw new Error('Enter a valid 10-digit Nigerian bank account number.')
  const {data,error}=await supabase.functions.invoke('verify-bank-account',{body:{action:'resolve',account_number:clean,bank_code:bankCode}})
  if(error) throw error
  if(data?.error) throw new Error(data.error)
  return data as VerifiedBankAccount
}
