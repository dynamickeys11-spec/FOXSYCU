import { useMemo, useState } from 'react'
import { Activity, Bell, CreditCard, Home, Menu, MoveRight, PiggyBank, Search, Settings, ShieldCheck, Users, Wallet, X, Mail, UserRound } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useCustomerData } from './CustomerProvider'
import './world-v2.css'
import './ux-audit.css'

const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const nav=[['Overview','/',Home],['Accounts','/accounts',Wallet],['Money movement','/transfers',MoveRight],['Beneficiaries','/beneficiaries',Users],['Transactions','/transactions',Activity],['Messages','/messages',Mail],['Savings','/savings',PiggyBank],['Cards','/cards',CreditCard],['Security Center','/security',ShieldCheck],['Settings','/settings',Settings],['Profile','/profile',UserRound]] as const

export function BankingShell({children}:{children:React.ReactNode}){
  const[open,setOpen]=useState(false);const[query,setQuery]=useState('');const{profile,account,transactions}=useCustomerData();const navigate=useNavigate()
  const matches=useMemo(()=>transactions.filter((t:any)=>`${t.description??''} ${t.counterparty??''} ${t.reference??''}`.toLowerCase().includes(query.toLowerCase())).slice(0,5),[transactions,query])
  const name=profile?.preferred_name||profile?.full_name||'Customer';const initials=name.split(/\s+/).filter(Boolean).map((p:string)=>p[0]).join('').slice(0,2).toUpperCase()||'CU';const avatarUrl=profile?.avatar_url||''
  const Avatar=({kind}:{kind:'customer'|'header'})=>avatarUrl?<img className={kind==='customer'?'customer-avatar-image':'header-avatar-image'} src={avatarUrl} alt="" aria-hidden="true"/>:<span>{initials}</span>
  return <div className="app-shell">
    <aside className={open?'sidebar open':'sidebar'}>
      <div className="sidebar-head"><div className="brand"><div className="brand-mark">F</div><div><b>FNCU</b><small>FIRST NATIONAL CREDIT UNION</small></div></div><button className="icon-button mobile-only" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <button className="account-switch" onClick={()=>{setOpen(false);navigate('/profile')}}><span className="avatar"><Avatar kind="customer"/></span><span className="account-switch-copy"><b>{name}</b><small>{account?.account_type||'checking'} · {account?.currency||'USD'}</small></span></button>
      <nav>{nav.map(([label,path,Icon])=><NavLink key={path} to={path} end={path==='/' } onClick={()=>setOpen(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={17}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><NavLink to="/security" onClick={()=>setOpen(false)} className="security-mini"><ShieldCheck size={16}/><span><b>Security center</b><small>Account protection</small></span></NavLink><button className="signout" onClick={()=>void import('./supabaseClient').then(({supabase})=>supabase.auth.signOut())}>Sign out</button></div>
    </aside>
    <div className="main-area"><header className="topbar"><div className="topbar-title"><button className="icon-button mobile-only" onClick={()=>setOpen(true)}><Menu size={20}/></button><div><small>FNCU / CUSTOMER</small><b>Personal banking</b></div></div><div className="topbar-actions"><div className="global-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search transactions, accounts..."/>{query&&<button onClick={()=>setQuery('')}><X size={14}/></button>}{query&&<div className="search-results">{matches.length?matches.map((t:any)=><button key={t.id} onClick={()=>{setQuery('');navigate('/transactions')}}><span>{t.description}</span><b>{money((t.direction==='debit'?-1:1)*Number(t.amount))}</b><small>{t.date} · {t.time||''} · {t.reference}</small></button>):<p>No matching banking activity.</p>}</div>}</div><NavLink to="/messages" className="icon-button" aria-label="Notifications"><Bell size={18}/></NavLink><NavLink to="/profile" className="profile-link"><span className="avatar"><Avatar kind="header"/></span><span><b>{name}</b><small>{profile?.tier||'Customer'}</small></span></NavLink></div></header><main className="content">{children}</main></div>
    <nav className="mobile-nav">{([['Home','/',Home],['Savings','/savings',PiggyBank],['Activity','/transactions',Activity],['Move','/transfers',MoveRight],['Profile','/profile',UserRound]] as const).map(([label,path,Icon])=><NavLink key={label} to={path} end={path==='/' }><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
  </div>
}
