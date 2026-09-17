import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, X, ExternalLink, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

type Row={id:string;user_id:string;movement_id:string;token_value:string;status:string;expires_at:string;created_at:string;customer_name:string;reference:string;rail:string;amount:number;currency:string;destination:string|null}
const money=(n:number,c='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency:c,maximumFractionDigits:2}).format(Number(n||0))
const remaining=(iso:string)=>Math.max(0,Math.floor((new Date(iso).getTime()-Date.now())/1000))
const clock=(s:number)=>`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

export default function AdminTransferNotificationOverlay(){
 const navigate=useNavigate()
 const [rows,setRows]=useState<Row[]>([])
 const [open,setOpen]=useState(false)
 const [now,setNow]=useState(Date.now())
 const [loading,setLoading]=useState(false)
 const [error,setError]=useState('')
 const [toast,setToast]=useState(false)
 const known=useRef<Set<string>>(new Set())
 const initialized=useRef(false)
 const load=useCallback(async()=>{
  setLoading(true)
  const {data,error:e}=await supabase.functions.invoke('transfer-security',{body:{action:'admin_list'}})
  if(e){setError(e.message||'Unable to load transfer authorization messages.');setLoading(false);return}
  const next=(data?.rows||[]) as Row[]
  const active=next.filter(r=>r.status==='pending'&&new Date(r.expires_at).getTime()>Date.now())
  if(initialized.current&&active.some(r=>!known.current.has(r.id)))setToast(true)
  known.current=new Set(active.map(r=>r.id))
  initialized.current=true
  setRows(next)
  setLoading(false)
 },[])
 useEffect(()=>{void load();const poll=setInterval(()=>void load(),5000);const tick=setInterval(()=>setNow(Date.now()),1000);return()=>{clearInterval(poll);clearInterval(tick)}},[load])
 useEffect(()=>{if(!toast)return;const t=setTimeout(()=>setToast(false),7000);return()=>clearTimeout(t)},[toast])
 const active=useMemo(()=>rows.filter(r=>r.status==='pending'&&new Date(r.expires_at).getTime()>now),[rows,now])
 const newest=active[0]
 return <>
  <div style={{position:'fixed',right:20,top:18,zIndex:1200}}>
   <button onClick={()=>{setOpen(v=>!v);setToast(false)}} aria-label={`Transfer authorization notifications${active.length?` (${active.length})`:''}`} style={{position:'relative',width:46,height:46,borderRadius:12,border:'1px solid #d0d5dd',background:'#fff',display:'grid',placeItems:'center',boxShadow:'0 6px 20px rgba(16,24,40,.12)',cursor:'pointer'}}>
    <Bell size={20}/>{active.length>0&&<span style={{position:'absolute',right:-4,top:-4,minWidth:20,height:20,padding:'0 5px',borderRadius:999,background:'#b42318',color:'#fff',fontSize:11,fontWeight:800,display:'grid',placeItems:'center'}}>{active.length>99?'99+':active.length}</span>}
   </button>
  </div>
  {toast&&newest&&<button onClick={()=>{setOpen(true);setToast(false)}} style={{position:'fixed',right:20,top:76,zIndex:1199,width:330,textAlign:'left',padding:'14px 16px',borderRadius:12,border:'1px solid #b7c9e2',background:'#fff',boxShadow:'0 12px 30px rgba(16,24,40,.18)',cursor:'pointer'}}><strong style={{display:'block',marginBottom:4}}>New transfer authorization</strong><span style={{fontSize:13,color:'#475467'}}>{newest.customer_name} · {newest.reference} · {money(newest.amount,newest.currency)}</span><small style={{display:'block',marginTop:6,color:'#175cd3'}}>Open notification inbox</small></button>}
  {open&&<div style={{position:'fixed',right:20,top:74,zIndex:1198,width:'min(440px,calc(100vw - 40px))',maxHeight:'calc(100vh - 100px)',overflow:'auto',background:'#fff',border:'1px solid #d0d5dd',borderRadius:16,boxShadow:'0 18px 50px rgba(16,24,40,.2)'}}>
   <div style={{padding:'16px 18px',borderBottom:'1px solid #eaecf0',display:'flex',justifyContent:'space-between',alignItems:'center'}}><div><strong style={{fontSize:15}}>Admin message notifications</strong><div style={{fontSize:12,color:'#667085',marginTop:3}}>{active.length} active authorization{active.length===1?'':'s'} · updates every 5 seconds</div></div><button onClick={()=>setOpen(false)} aria-label="Close notifications" style={{border:0,background:'transparent',cursor:'pointer'}}><X size={18}/></button></div>
   {error&&<div style={{padding:12,color:'#b42318',fontSize:12}}>{error}</div>}
   {active.length===0&&!loading?<div style={{padding:28,textAlign:'center',color:'#667085'}}><Bell size={22}/><p style={{margin:'8px 0 0'}}>No active transfer authorization requests.</p></div>:active.map(r=>{const secs=remaining(r.expires_at);return <div key={r.id} style={{padding:16,borderBottom:'1px solid #f2f4f7'}}><div style={{display:'flex',justifyContent:'space-between',gap:12}}><div><strong>{r.customer_name}</strong><div style={{fontSize:12,color:'#667085',marginTop:3}}>{r.reference} · {r.rail.toUpperCase()}</div></div><strong style={{fontSize:14}}>{money(r.amount,r.currency)}</strong></div><div style={{marginTop:12,padding:12,borderRadius:10,background:'#f8fafc',border:'1px solid #eaecf0'}}><div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.08em',color:'#667085'}}>Authorization token</div><code style={{display:'block',marginTop:5,fontSize:21,fontWeight:800,letterSpacing:5}}>{r.token_value}</code><div style={{display:'flex',justifyContent:'space-between',marginTop:7,fontSize:12}}><span>Expires in <strong>{clock(secs)}</strong></span><span>{r.destination||'Transfer'}</span></div></div></div>})}
   <div style={{padding:12,borderTop:'1px solid #eaecf0',display:'flex',gap:8}}><button onClick={()=>void load()} disabled={loading} style={{flex:1,padding:'9px 12px',border:'1px solid #d0d5dd',borderRadius:9,background:'#fff',cursor:'pointer'}}>{loading?'Refreshing…':'Refresh'}</button><button onClick={()=>navigate('/admin/transfer-notifications')} style={{flex:1,padding:'9px 12px',border:0,borderRadius:9,background:'#101828',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>Full inbox <ExternalLink size={14}/></button></div>
  </div>}
  {active.length>0&&<div style={{position:'fixed',left:20,bottom:20,zIndex:1100,display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:999,background:'#fff',border:'1px solid #d0d5dd',boxShadow:'0 5px 18px rgba(16,24,40,.12)',fontSize:12}}><ShieldCheck size={15}/><span><strong>{active.length}</strong> transfer authorization{active.length===1?'':'s'} awaiting admin action</span></div>}
 </>
}
