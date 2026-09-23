import { useEffect, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowUpRight, Bell, ClipboardList, Clock3, LockKeyhole, Menu, MessageSquare, Users, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './admin.css'

export default function AdminNavigation(){
  const navigate=useNavigate(); const location=useLocation(); const [open,setOpen]=useState(false); const [pendingCount,setPendingCount]=useState(0)
  const loadPending=async()=>{const r=await supabase.rpc('admin_get_pending_application_count');if(!r.error)setPendingCount(Number(r.data||0))}
  useEffect(()=>{void loadPending();const timer=setInterval(()=>void loadPending(),15000);return()=>clearInterval(timer)},[])
  useEffect(()=>{setOpen(false)},[location.pathname,location.search])
  useEffect(()=>{
    if(!open)return
    const onKey=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)}
    const onResize=()=>{if(window.innerWidth>820)setOpen(false)}
    document.addEventListener('keydown',onKey)
    window.addEventListener('resize',onResize)
    document.body.style.overflow='hidden'
    return()=>{document.removeEventListener('keydown',onKey);window.removeEventListener('resize',onResize);document.body.style.overflow=''}
  },[open])
  const go=(path:string)=>{setOpen(false);navigate(path)}
  const active=(path:string)=>path==='/admin'?location.pathname==='/admin':location.pathname===path
  return <>
    <button className="admin-menu-button" aria-label={open?'Close admin navigation':'Open admin navigation'} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><Menu size={20}/></button>
    {open&&<button className="admin-mobile-scrim" aria-label="Close admin navigation" onClick={()=>setOpen(false)}/>}
    <aside className={`admin-sidebar ${open?'is-open':''}`} aria-label="Admin navigation" aria-hidden={!open&&typeof window!=='undefined'&&window.innerWidth<=820}>
      <div className="admin-brand"><span>A</span><div><strong>ADMIN</strong><small>OPERATIONS</small></div><button className="admin-mobile-close" aria-label="Close admin navigation" onClick={()=>setOpen(false)}><X size={18}/></button></div>

      <button className={`admin-create-customer ${active('/admin/customers/new')?'active':''}`} onClick={()=>go('/admin/customers/new')}>
        <Users size={17}/>
        <span><strong>Create customer</strong><small>Open a new USD customer account</small></span>
      </button>

      <nav className="admin-nav">
        <div className="nav-label">WORKSPACE</div>
        <button className={active('/admin')?'active':''} onClick={()=>go('/admin')}><Activity size={16}/> Overview</button>
        <button onClick={()=>go('/admin')}><Users size={16}/> Customers</button>
        <button onClick={()=>go('/admin')}><ClipboardList size={16}/> Transactions</button>
        <div className="nav-label nav-label-spaced">CUSTOMER ONBOARDING</div>
        <button className={active('/admin/applications')?'active':''} onClick={()=>go('/admin/applications')}><Clock3 size={16}/> Applications {pendingCount>0&&<span className="admin-nav-badge" aria-label={`${pendingCount} pending applications`}>{pendingCount>99?'99+':pendingCount}</span>}</button>
        <div className="nav-label nav-label-spaced">MONEY OPERATIONS</div>
        <button className={active('/admin/credits')?'active':''} onClick={()=>go('/admin/credits')}><ArrowUpRight size={16}/> Credit account</button>
        <button className={active('/admin/deposits')?'active':''} onClick={()=>go('/admin/deposits')}><ArrowDownToLine size={16}/> Check deposits</button>
        <button className={active('/admin/transfer-notifications')?'active':''} onClick={()=>go('/admin/transfer-notifications')}><Bell size={16}/> Transfer review</button>
        <div className="nav-label nav-label-spaced">CUSTOMER SERVICE</div>
        <button className={active('/admin/recovery')?'active':''} onClick={()=>go('/admin/recovery')}><LockKeyhole size={16}/> Account recovery</button>
        <button onClick={()=>go('/admin?view=support-chat')}><MessageSquare size={16}/> Service chat</button>
      </nav>
      <button className="back-bank" onClick={()=>go('/')}>← Banking interface</button>
    </aside>
  </>
}
