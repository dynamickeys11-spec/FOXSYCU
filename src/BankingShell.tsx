import { useMemo, useState } from 'react'
import { Activity, Bell, BookOpen, BriefcaseBusiness, Building2, ChevronDown, CreditCard, FileText, Home, Landmark, LogOut, MapPin, Menu, MessageSquare, MoveRight, Receipt, Search, Settings, ShieldCheck, UserRound, Users, X } from 'lucide-react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useCustomerData } from './CustomerProvider'
import { FNCUWordmark } from './FNCUBrand'
import './world-v2.css'
import './ux-audit.css'
import './fncu-identity.css'
import './fncu-design-system.css'

const money=(n:number)=>`${n<0?'-':''}$${Math.abs(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const nav=[['Home','/',Home],['Activity','/transactions',Activity],['Move','/transfers',MoveRight],['Services','/services',BriefcaseBusiness],['Profile','/profile',UserRound]] as const

type DrawerItem={label:string;path:string;icon:any;external?:boolean}
type DrawerSection={label:string;items:DrawerItem[]}

export function BankingShell({children,showHeader=true}:{children:React.ReactNode;showHeader?:boolean}){
 const[open,setOpen]=useState(false);const[searchOpen,setSearchOpen]=useState(false);const[query,setQuery]=useState('');const{profile,account,transactions}=useCustomerData();const navigate=useNavigate();const location=useLocation()
 const matches=useMemo(()=>transactions.filter((t:any)=>`${t.description??''} ${t.counterparty??''} ${t.reference??''}`.toLowerCase().includes(query.toLowerCase())).slice(0,5),[transactions,query])
 const name=profile?.preferred_name||profile?.full_name||'Customer';const initials=name.split(/\s+/).filter(Boolean).map((p:string)=>p[0]).join('').slice(0,2).toUpperCase()||'CU';const avatarUrl=profile?.avatar_url||''
 const Avatar=()=>avatarUrl?<img className="fncu-avatar-image" src={avatarUrl} alt="" aria-hidden="true"/>:<span>{initials}</span>
 const isActive=(path:string)=>path==='/'?location.pathname==='/':location.pathname.startsWith(path)
 const service=(key:string)=>`/services?service=${key}`
 const sections:DrawerSection[]=[
  {label:'Accounts',items:[{label:'All Accounts',path:'/',icon:Landmark},{label:'Checking',path:'/',icon:Building2},{label:'Savings',path:'/services?service=statements',icon:BookOpen}]},
  {label:'Transfers',items:[{label:'Transfer Now',path:'/transfers',icon:MoveRight},{label:'Scheduled Transfers',path:'/transfers?view=scheduled',icon:Receipt},{label:'Transfer History',path:'/transactions?filter=transfers',icon:Activity}]},
  {label:'Deposit',items:[{label:'Remote Check Deposit',path:service('deposit'),icon:Receipt}]},
  {label:'Bill Pay',items:[{label:'Pay a Bill',path:service('billpay'),icon:FileText},{label:'Pay a Person',path:service('p2p'),icon:Users},{label:'Account-to-Account',path:service('a2a'),icon:Landmark},{label:'Send ACH',path:service('ach'),icon:MoveRight},{label:'Picture Pay',path:service('billpay'),icon:FileText}]},
  {label:'Account & Support',items:[{label:'Statements',path:service('statements'),icon:FileText},{label:'Messages',path:'/messages',icon:MessageSquare},{label:'Credit Card',path:'/cards',icon:CreditCard},{label:'Alerts',path:service('alerts'),icon:Bell},{label:'Profile & Settings',path:'/profile',icon:Settings},{label:'Loans',path:service('loans'),icon:BriefcaseBusiness},{label:'Check Ordering',path:service('checks'),icon:BookOpen},{label:'Request Mailed Check',path:service('mailed-check'),icon:Receipt},{label:'eNotices',path:service('notices'),icon:FileText}]},
  {label:'Access',items:[{label:'Locations & ATMs',path:service('locations'),icon:MapPin},{label:'Contact Us',path:service('messages'),icon:MessageSquare}]},
 ]
 return <div className="app-shell fncu-reference-app">
   <div className="fncu-reference-device">
    {showHeader&&<header className="fncu-mobile-header">
      <button className="fncu-header-icon fncu-menu-button" onClick={()=>setOpen(v=>!v)} aria-label="Open navigation"><Menu size={19}/></button>
      <FNCUWordmark compact/>
      <div className="fncu-header-tools">
        <button className="fncu-header-icon" onClick={()=>setSearchOpen(v=>!v)} aria-label="Search"><Search size={18}/></button>
        <NavLink className="fncu-header-icon" to="/messages" aria-label="Messages"><Bell size={18}/></NavLink>
        <button className="fncu-header-profile" onClick={()=>navigate('/profile')} aria-label="Open profile"><span className="avatar"><Avatar/></span></button>
      </div>
    </header>}
    {showHeader&&searchOpen&&<div className="fncu-search-panel"><div className="fncu-search-box"><Search size={17}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search your banking activity"/><button onClick={()=>{setQuery('');setSearchOpen(false)}} aria-label="Close search"><X size={17}/></button></div>{query&&<div className="fncu-search-results">{matches.length?matches.map((t:any)=><button key={t.id} onClick={()=>{setQuery('');setSearchOpen(false);navigate('/transactions')}}><span>{t.description||t.counterparty||'Account activity'}</span><b>{money((t.direction==='debit'?-1:1)*Number(t.amount))}</b><small>{t.date} · {t.reference||''}</small></button>):<p>No matching activity.</p>}</div>}</div>}
    <main className="content fncu-reference-content">{children}</main>
    <nav className="mobile-nav fncu-reference-nav" aria-label="Primary navigation">{nav.map(([label,path,Icon])=><NavLink key={label} to={path} end={path==='/' } className={()=>isActive(path)?'active':''}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
   </div>
   <aside className={`fncu-reference-drawer ${open?'open':''}`} aria-hidden={!open}>
     <div className="fncu-drawer-head"><FNCUWordmark compact/><button className="fncu-header-icon" onClick={()=>setOpen(false)} aria-label="Close"><X size={18}/></button></div>
     <button className="fncu-drawer-account" onClick={()=>{setOpen(false);navigate('/profile')}}><span className="avatar"><Avatar/></span><span><b>{name}</b><small>{account?.account_type||'Checking'} · {account?.currency||'USD'}</small></span><ChevronDown size={16}/></button>
     <div className="fncu-drawer-links">
       <NavLink to="/" onClick={()=>setOpen(false)} className={isActive('/')?'active':''}><Home size={18}/><span>Home</span></NavLink>
       {sections.map(section=><div className="fncu-drawer-section" key={section.label}><div className="fncu-drawer-section-label">{section.label}</div>{section.items.map(item=><NavLink key={`${section.label}-${item.label}`} to={item.path} onClick={()=>setOpen(false)} className={isActive(item.path.split('?')[0])?'active':''}><item.icon size={17}/><span>{item.label}</span></NavLink>)}</div>)}
     </div>
     <div className="fncu-drawer-footer"><div className="fncu-drawer-security"><ShieldCheck size={15}/><span>Secure customer access</span></div><small>FOXSYCU DIGITAL BANKING · USD</small><button className="fncu-drawer-signout" onClick={()=>void import('./supabaseClient').then(({supabase})=>supabase.auth.signOut())}><LogOut size={16}/>Sign out</button></div>
   </aside>
   {open&&<button className="fncu-drawer-backdrop" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
 </div>
}
