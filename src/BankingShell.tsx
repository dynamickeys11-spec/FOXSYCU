import { useMemo, useState } from 'react'
import { Activity, Bell, CreditCard, Home, Menu, MoveRight, PiggyBank, Search, ShieldCheck, Users, Wallet, X, Mail, UserRound } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCustomerData } from './CustomerProvider'
import { FNCUWordmark } from './FNCUBrand'
import './world-v2.css'
import './ux-audit.css'
import './fncu-identity.css'
import './fncu-design-system.css'

const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const nav=[['Home','/',Home],['Accounts','/accounts',Wallet],['Move','/transfers',MoveRight],['Cards','/cards',CreditCard],['Profile','/profile',UserRound]] as const

export function BankingShell({children}:{children:React.ReactNode}){
 const[open,setOpen]=useState(false);const[query,setQuery]=useState('');const{profile,account,transactions}=useCustomerData();const navigate=useNavigate();const location=useLocation()
 const matches=useMemo(()=>transactions.filter((t:any)=>`${t.description??''} ${t.counterparty??''} ${t.reference??''}`.toLowerCase().includes(query.toLowerCase())).slice(0,5),[transactions,query])
 const name=profile?.preferred_name||profile?.full_name||'Customer';const initials=name.split(/\s+/).filter(Boolean).map((p:string)=>p[0]).join('').slice(0,2).toUpperCase()||'CU';const avatarUrl=profile?.avatar_url||''
 const Avatar=()=>avatarUrl?<img className="fncu-avatar-image" src={avatarUrl} alt="" aria-hidden="true"/>:<span>{initials}</span>
 const isActive=(path:string)=>path==='/'?location.pathname==='/':location.pathname.startsWith(path)
 return <div className="app-shell fncu-reference-app">
   <div className="fncu-reference-device">
    <header className="fncu-mobile-header">
      <button className="fncu-header-profile" onClick={()=>navigate('/profile')} aria-label="Open profile"><span className="avatar"><Avatar/></span></button>
      <FNCUWordmark compact/>
      <div className="fncu-header-tools">
        <button className="fncu-header-icon" onClick={()=>setOpen(v=>!v)} aria-label="Search"><Search size={18}/></button>
        <NavLink className="fncu-header-icon" to="/messages" aria-label="Messages"><Bell size={18}/></NavLink>
      </div>
    </header>

    {open&&<div className="fncu-search-panel"><div className="fncu-search-box"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your banking activity"/><button onClick={()=>{setQuery('');setOpen(false)}} aria-label="Close search"><X size={17}/></button></div>{query&&<div className="fncu-search-results">{matches.length?matches.map((t:any)=><button key={t.id} onClick={()=>{setQuery('');setOpen(false);navigate('/transactions')}}><span>{t.description||t.counterparty||'Account activity'}</span><b>{money((t.direction==='debit'?-1:1)*Number(t.amount))}</b><small>{t.date} · {t.reference||''}</small></button>):<p>No matching activity.</p>}</div>}</div>}

    <main className="content fncu-reference-content">{children}</main>

    <nav className="mobile-nav fncu-reference-nav" aria-label="Primary navigation">{nav.map(([label,path,Icon])=><NavLink key={label} to={path} end={path==='/' } className={()=>isActive(path)?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
   </div>

   <aside className={`fncu-reference-drawer ${open?'open':''}`} aria-hidden={!open}>
     <div className="fncu-drawer-head"><FNCUWordmark compact/><button className="fncu-header-icon" onClick={()=>setOpen(false)} aria-label="Close"><X size={18}/></button></div>
     <button className="fncu-drawer-account" onClick={()=>{setOpen(false);navigate('/profile')}}><span className="avatar"><Avatar/></span><span><b>{name}</b><small>{account?.account_type||'Checking'} · {account?.currency||'USD'}</small></span></button>
     <div className="fncu-drawer-links">{([['Overview','/',Home],['Accounts','/accounts',Wallet],['Money movement','/transfers',MoveRight],['Beneficiaries','/beneficiaries',Users],['Transactions','/transactions',Activity],['Messages','/messages',Mail],['Savings','/savings',PiggyBank],['Cards','/cards',CreditCard],['Security','/security',ShieldCheck]] as const).map(([label,path,Icon])=><NavLink key={path} to={path} onClick={()=>setOpen(false)} className={isActive(path)?'active':''}><Icon size={18}/><span>{label}</span></NavLink>)}</div>
     <button className="fncu-drawer-signout" onClick={()=>void import('./supabaseClient').then(({supabase})=>supabase.auth.signOut())}>Sign out</button>
   </aside>
   {open&&<button className="fncu-drawer-backdrop" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
 </div>
}
