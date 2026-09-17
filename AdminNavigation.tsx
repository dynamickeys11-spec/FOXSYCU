import { useState } from 'react'
import { Activity, ArrowDownToLine, ArrowUpRight, Bell, ClipboardList, LockKeyhole, Menu, MessageSquare, Users, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import './admin.css'

export default function AdminNavigation(){
  const navigate=useNavigate(); const location=useLocation(); const [open,setOpen]=useState(false)
  const go=(path:string)=>{setOpen(false);navigate(path)}
  const active=(path:string)=>path==='/admin'?location.pathname==='/admin':location.pathname===path
  return <>
    <button className="admin-menu-button" aria-label="Open admin navigation" aria-expanded={open} onClick={()=>setOpen(true)}><Menu size={20}/></button>
    {open&&<button className="admin-mobile-scrim" aria-label="Close admin navigation" onClick={()=>setOpen(false)}/>} 
    <aside className={`admin-sidebar ${open?'is-open':''}`} aria-label="Admin navigation">
      <div className="admin-brand"><span>A</span><div><strong>ADMIN</strong><small>OPERATIONS</small></div><button className="admin-mobile-close" aria-label="Close admin navigation" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <nav className="admin-nav">
        <div className="nav-label">WORKSPACE</div>
        <button className={active('/admin')?'active':''} onClick={()=>go('/admin')}><Activity size={16}/> Overview</button>
        <button onClick={()=>go('/admin')}><Users size={16}/> Customers</button>
        <button onClick={()=>go('/admin')}><ClipboardList size={16}/> Transactions</button>
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
