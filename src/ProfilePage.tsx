import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Camera, CheckCircle2, Edit3, Mail, MapPin, Phone, Save, ShieldCheck, UserRound, X } from 'lucide-react'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import './profile.css'

const fields = ['full_name','preferred_name','phone','date_of_birth','address_line1','city','state_region','postal_code','country','occupation','employment_status','timezone'] as const
const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg','image/png','image/webp']

export default function ProfilePage(){
  const { profile, account, security, session, refresh } = useCustomerData()
  const [editing,setEditing]=useState(false)
  const [busy,setBusy]=useState(false)
  const [avatarBusy,setAvatarBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [avatarError,setAvatarError]=useState('')
  const [form,setForm]=useState<Record<string,string>>({})
  const [avatarUrl,setAvatarUrl]=useState('')

  useEffect(()=>{const next:Record<string,string>={};fields.forEach(k=>next[k]=String(profile?.[k]??''));setForm(next);setAvatarUrl(String(profile?.avatar_url??''))},[profile])
  const update=(key:string,value:string)=>setForm(v=>({...v,[key]:value}))
  const save=async(e:FormEvent)=>{e.preventDefault();if(!session?.user)return;setBusy(true);setMessage('');try{const payload={...form,profile_completed:Boolean(form.full_name&&form.address_line1&&form.city)};const {error}=await supabase.from('profiles').update(payload).eq('id',session.user.id);if(error)throw error;await refresh();setEditing(false);setMessage('Your customer profile has been updated.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to save your profile.')}finally{setBusy(false)}}

  const uploadAvatar=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];event.target.value=''
    if(!file||!session?.user)return
    setAvatarError('');setMessage('')
    if(!AVATAR_TYPES.includes(file.type)){setAvatarError('Please choose a JPG, PNG, or WebP image.');return}
    if(file.size>MAX_AVATAR_SIZE){setAvatarError('Profile pictures must be 5 MB or smaller.');return}
    setAvatarBusy(true)
    try{
      const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'
      const path=`${session.user.id}/profile.${ext}`
      const {error:uploadError}=await supabase.storage.from('avatars').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'})
      if(uploadError)throw uploadError
      const {data}=supabase.storage.from('avatars').getPublicUrl(path)
      const {error:updateError}=await supabase.from('profiles').update({avatar_url:data.publicUrl}).eq('id',session.user.id)
      if(updateError)throw updateError
      setAvatarUrl(`${data.publicUrl}?v=${Date.now()}`);await refresh();setMessage('Profile picture updated.')
    }catch(e){setAvatarError(e instanceof Error?e.message:'Unable to upload your profile picture.')}finally{setAvatarBusy(false)}
  }

  const removeAvatar=async()=>{
    if(!session?.user||!avatarUrl)return
    setAvatarBusy(true);setAvatarError('');setMessage('')
    try{
      const paths=['jpg','png','webp'].map(ext=>`${session.user.id}/profile.${ext}`)
      const {error:removeError}=await supabase.storage.from('avatars').remove(paths)
      if(removeError)throw removeError
      const {error:updateError}=await supabase.from('profiles').update({avatar_url:null}).eq('id',session.user.id)
      if(updateError)throw updateError
      setAvatarUrl('');await refresh();setMessage('Profile picture removed.')
    }catch(e){setAvatarError(e instanceof Error?e.message:'Unable to remove your profile picture.')}finally{setAvatarBusy(false)}
  }

  const name=profile?.preferred_name||profile?.full_name||'FOXSYCU Customer'
  const initials=name.split(/\s+/).filter(Boolean).map((p:string)=>p[0]).join('').slice(0,2).toUpperCase()
  return <BankingShell><div className="profile-page"><header className="profile-hero"><div className="profile-avatar-wrap"><div className="profile-avatar">{avatarUrl?<img src={avatarUrl} alt="Profile"/>:initials}</div><label className="profile-avatar-action" title="Upload profile picture"><Camera size={14}/><input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={avatarBusy}/></label></div><div><span className="profile-eyebrow">CUSTOMER PROFILE</span><h1>{name}</h1><p>{profile?.tier||'Premium User'} · Customer since {profile?.customer_since||'—'}</p></div><button className="profile-edit" onClick={()=>{setEditing(v=>!v);setMessage('')}}><Edit3 size={15}/>{editing?'Cancel':'Edit profile'}</button></header>
    <div className="profile-photo-controls"><label className="profile-photo-button"><Camera size={15}/>{avatarBusy?'Uploading…':avatarUrl?'Change picture':'Add profile picture'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={avatarBusy}/></label>{avatarUrl&&<button className="profile-photo-remove" onClick={removeAvatar} disabled={avatarBusy}><X size={14}/>Remove</button>}<small>JPG, PNG or WebP · maximum 5 MB</small></div>
    {message&&<div className="profile-message"><CheckCircle2 size={16}/>{message}</div>}{avatarError&&<div className="profile-message profile-error">{avatarError}</div>}
    <div className="profile-grid">
      <section className="profile-card profile-wide"><div className="profile-card-head"><div><h2>Personal information</h2><p>Details associated with your FOXSYCU customer relationship.</p></div><UserRound size={18}/></div>{editing?<form onSubmit={save} className="profile-form"><div className="profile-two"><label>Legal full name<input value={form.full_name||''} onChange={e=>update('full_name',e.target.value)} required/></label><label>Preferred name<input value={form.preferred_name||''} onChange={e=>update('preferred_name',e.target.value)}/></label></div><div className="profile-two"><label>Mobile phone<input value={form.phone||''} onChange={e=>update('phone',e.target.value)}/></label><label>Date of birth<input type="date" value={form.date_of_birth||''} onChange={e=>update('date_of_birth',e.target.value)}/></label></div><div className="profile-two"><label>Occupation<input value={form.occupation||''} onChange={e=>update('occupation',e.target.value)}/></label><label>Employment status<select value={form.employment_status||''} onChange={e=>update('employment_status',e.target.value)}><option value="">Select</option><option>Employed</option><option>Self-employed</option><option>Business owner</option><option>Student</option><option>Retired</option><option>Other</option></select></label></div><label>Residential address<input value={form.address_line1||''} onChange={e=>update('address_line1',e.target.value)}/></label><div className="profile-three"><label>City<input value={form.city||''} onChange={e=>update('city',e.target.value)}/></label><label>State / region<input value={form.state_region||''} onChange={e=>update('state_region',e.target.value)}/></label><label>Postal code<input value={form.postal_code||''} onChange={e=>update('postal_code',e.target.value)}/></label></div><div className="profile-two"><label>Country<input value={form.country||''} onChange={e=>update('country',e.target.value)}/></label><label>Time zone<input value={form.timezone||''} onChange={e=>update('timezone',e.target.value)}/></label></div><button className="profile-save" disabled={busy}><Save size={15}/>{busy?'Saving…':'Save changes'}</button></form>:<div className="profile-details"><div><span>Legal name</span><b>{profile?.full_name||'Not provided'}</b></div><div><span>Preferred name</span><b>{profile?.preferred_name||'Not set'}</b></div><div><span>Mobile phone</span><b>{profile?.phone||'Not provided'}</b></div><div><span>Date of birth</span><b>{profile?.date_of_birth||'Not provided'}</b></div><div><span>Occupation</span><b>{profile?.occupation||'Not provided'}</b></div><div><span>Employment status</span><b>{profile?.employment_status||'Not provided'}</b></div><div className="profile-detail-wide"><span>Residential address</span><b>{[profile?.address_line1,profile?.city,profile?.state_region,profile?.postal_code,profile?.country].filter(Boolean).join(', ')||'Not provided'}</b></div></div>}</section>
      <section className="profile-card"><div className="profile-card-head"><div><h2>Contact channels</h2><p>How FOXSYCU can reach you.</p></div><Mail size={18}/></div><div className="profile-contact"><div><Mail size={16}/><span><small>Email address</small><b>{session?.user?.email||'Not available'}</b></span></div><div><Phone size={16}/><span><small>Mobile</small><b>{profile?.phone||'Not provided'}</b></span></div><div><MapPin size={16}/><span><small>Location</small><b>{profile?.city||'Not provided'}{profile?.country?`, ${profile.country}`:''}</b></span></div></div></section>
      <section className="profile-card"><div className="profile-card-head"><div><h2>Account relationship</h2><p>Primary account details.</p></div></div><div className="profile-details"><div><span>Account</span><b>{account?.account_name||'Private Checking'}</b></div><div><span>Account type</span><b>{account?.account_type||'Checking'}</b></div><div><span>Currency</span><b>{account?.currency||'USD'}</b></div><div><span>Status</span><b className="profile-green">{account?.status||'Active'}</b></div><div><span>Account number</span><b>•••• {account?.account_number_last4||'4821'}</b></div><div><span>Customer tier</span><b>{profile?.tier||'Premium User'}</b></div></div></section>
      <section className="profile-card"><div className="profile-card-head"><div><h2>Security & preferences</h2><p>Current protection settings.</p></div><ShieldCheck size={18}/></div><div className="profile-security"><div><span>Two-factor authentication</span><b className="profile-green">{security?.two_fa?'Enabled':'Review'}</b></div><div><span>Passkey</span><b className="profile-green">{security?.passkey?'Available':'Review'}</b></div><div><span>Security alerts</span><b className="profile-green">{security?.alerts?'Enabled':'Review'}</b></div><div><span>Profile completion</span><b className="profile-green">{profile?.profile_completed?'Complete':'Needs attention'}</b></div></div></section>
    </div><p className="profile-note">FOXSYCU is a simulated banking environment. Profile and account activity shown here are synthetic demo data and do not represent a real financial institution or real funds.</p>
  </div></BankingShell>
}
