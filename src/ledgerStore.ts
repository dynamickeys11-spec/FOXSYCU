import { useSyncExternalStore } from 'react'
import { customer as seed } from './data/mockData'
import type { Transaction } from './types'

const key='foxsycu.transactions'
let current: Transaction[] = (()=>{try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):seed.transactions}catch{return seed.transactions}})()
const listeners=new Set<()=>void>()
const emit=()=>{localStorage.setItem(key,JSON.stringify(current));listeners.forEach(fn=>fn())}
export function addTransaction(t:Transaction){current=[t,...current];emit()}
export function useBankLedger(){const tx=useSyncExternalStore(fn=>{listeners.add(fn);return()=>listeners.delete(fn)},()=>current,()=>seed.transactions);const posted=tx.filter(t=>t.status==='Completed').reduce((s,t)=>s+t.amount,125000);const pending=tx.filter(t=>t.status==='Pending').reduce((s,t)=>s+Math.abs(t.amount),0);return {tx,posted,pending,add:addTransaction}}
