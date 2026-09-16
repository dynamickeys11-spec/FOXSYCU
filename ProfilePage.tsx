import { ChangeEvent, FormEvent, useEffect, useState } from 'react'
import { Camera, CheckCircle2, Edit3, KeyRound, Mail, MapPin, Phone, Save, ShieldCheck, UserRound, X } from 'lucide-react'
import { BankingShell } from './BankingShell'
import { useCustomerData } from './CustomerProvider'
import { supabase } from './supabaseClient'
import './profile.css'

const fields = ['full_name','preferred_name','phone','date_of_birth','address_line1','city','state_region','postal_code','country','occupation','employment_status','timezone'] as const
const MAX_AVATAR_SIZE = 5 * 1024 * 1024
const AVATAR_TYPES = ['image/jpeg','image/png','image/webp']

const maskEmail = (email?: string | null) => {
  if (!email) return 'Not available'
  const [local, domain] = email.split('@')
  if (!local || !domain) return '••••••••'
  const visible = local.length === 1 ? local : local.slice(0, 2)
  const hiddenCount = Math.max(3, local.length - visible.length)
  return `${visible}${'•'.repeat(hiddenCount)}@${domain}`
}

const profileToForm = (profile: any | null): Record<string,string> => {
  const next: Record<string,string> = {}
  fields.forEach(k => { next[k] = String(profile?.[k] ?? '') })
  return next
}

export default function ProfilePage(){
  const { profile, account, security, session, refresh } = useCustomerData()
  const [editing,setEditing]=useState(false)
  const [photoMenu,setPhotoMenu]=useState(false)
  const [busy,setBusy]=useState(false)
  const [avatarBusy,setAvatarBusy]=useState(false)
  const [passkeyBusy,setPasskeyBusy]=useState(false)
  const [passkeyCount,setPasskeyCount]=useState(0)
  const [message,setMessage]=useState('')
  const [avatarError,setAvatarError]=useState('')
  const [form,setForm]=useState<Record<string,string>>(()=>profileToForm(profile))
  const [avatarUrl,setAvatarUrl]=useState('')

  useEffect(()=>{
    if(editing) return
    setForm(profileToForm(profile))
    setAvatarUrl(String(profile?.avatar_url??''))
  },[profile,editing])
  useEffect(()=>{let active=true;const load=async()=>{if(!session?.user)return;const api=(supabase.auth as any).passkey;if(!api?.list)return;const{data,error}=await api.list();if(active&&!error)setPasskeyCount(Array.isArray(data)?data.length:0)};void load();return()=>{active=false}},[session?.user?.id])
  const update=(key:string,value:string)=>setForm(v=>({...v,[key]:value}))
  const startEditing=()=>{
    setForm(profileToForm(profile))
    setMessage('')
    setEditing(true)
  }
  const cancelEditing=()=>{
    setForm(profileToForm(profile))
    setMessage('')
    setEditing(false)
  }
  const save=async(e:FormEvent)=>{e.preventDefault();if(!session?.user)return;setBusy(true);setMessage('');try{
    const fullName=form.full_name?.trim();
    if(!fullName) throw new Error('Legal full name is required.');
    const payload={full_name:fullName, preferred_name:form.preferred_name?.trim()||null, phone:form.phone?.trim()||null, date_of_birth:form.date_of_birth?.trim()||null, address_line1:form.address_line1?.trim()||null, city:form.city?.trim()||null, state_region:form.state_region?.trim()||null, postal_code:form.postal_code?.trim()||null, country:form.country?.trim()||null, occupation:form.occupation?.trim()||null, employment_status:form.employment_status?.trim()||null, timezone:form.timezone?.trim()||null, profile_completed:Boolean(fullName&&form.address_line1?.trim()&&form.city?.trim())}
    const {data,error}=await supabase.from('profiles').update(payload).eq('id',session.user.id).select('*').single();
    if(error)throw new Error(`Unable to save your profile: ${error.message}`);
    if(!data)throw new Error('No customer profile was saved.');
    setForm(profileToForm(data));
    setEditing(false);
    await refresh();
    setMessage('Your customer profile has been saved.')
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save your profile.')}finally{setBusy(false)}}

  const registerPasskey=async()=>{if(!session?.user)return;setPasskeyBusy(true);setMessage('');try{const api=(supabase.auth as any).registerPasskey;if(typeof api!=='function')throw new Error('Passkey registration is not available in this browser.');const{data,error}=await api();if(error)throw error;setPasskeyCount(v=>v+1);await supabase.from('security_preferences').update({passkey:true}).eq('user_id',session.user.id);await refresh();setMessage(data?.friendly_name?`Passkey registered: ${data.friendly_name}.`:'Passkey registered successfully.')}catch(e){setMessage(e instanceof Error?e.message:'Unable to register a passkey.')}finally{setPasskeyBusy(false)}}

  const uploadAvatar=async(event:ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';if(!file||!session?.user)return;setPhotoMenu(false);setAvatarError('');setMessage('');if(!AVATAR_TYPES.includes(file.type)){setAvatarError('Please choose a JPG, PNG, or WebP image.');return}if(file.size>MAX_AVATAR_SIZE){setAvatarError('Profile pictures must be 5 MB or smaller.');return}setAvatarBusy(true);try{const ext=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp';const path=`${session.user.id}/profile-${crypto.randomUUID()}.${ext}`;const storage=supabase.storage.from('avatars');const{error:uploadError}=await storage.upload(path,file,{upsert:false,contentType:file.type,cacheControl:'3600'});if(uploadError)throw uploadError;const{data}=storage.getPublicUrl(path);const publicUrl=`${data.publicUrl}?v=${Date.now()}`;const{error:updateError}=await supabase.rpc('set_own_avatar_url',{p_avatar_url:publicUrl});if(updateError)throw updateError;setAvatarUrl(publicUrl);await refresh();setMessage('Profile picture updated.')}catch(e){setAvatarError(e instanceof Error?e.message:'Unable to upload your profile picture.')}finally{setAvatarBusy(false)}}
  const removeAvatar=async()=>{if(!session?.user||!avatarUrl)return;setPhotoMenu(false);setAvatarBusy(true);setAvatarError('');setMessage('');try{const{error:updateError}=await supabase.rpc('set_own_avatar_url',{p_avatar_url:''});if(updateError)throw updateError;setAvatarUrl('');await refresh();setMessage('Profile picture removed.')}catch(e){setAvatarError(e instanceof Error?e.message:'Unable to remove your profile picture.')}finally{setAvatarBusy(false)}}

  const name=profile?.preferred_name||profile?.full_name||'Customer'
  const initials=name.split(/\s+/).filter(Boolean).map((p:string)=>p[0]).join('').slice(0,2).toUpperCase()||'CU'
  const accountName=account?.account_name||'Account'
  return <BankingShell><div className="profile-page"><header className="profile-hero"><div className="profile-avatar-wrap"><button type="button" className="profile-avatar profile-avatar-trigger" onClick={()=>setPhotoMenu(v=>!v)} aria-label="Profile picture options">{avatarUrl?<img src={avatarUrl} alt="Profile"/>:initials}</button>{photoMenu&&<div className="profile-photo-menu" role="menu"><label className="profile-photo-menu-item" htmlFor="profile-photo-input"><Camera size={15}/>{avatarUrl?'Change picture':'Add profile picture'}</label>{avatarUrl&&<button type="button" className="profile-photo-menu-item danger" onClick={()=>void removeAvatar()} disabled={avatarBusy}><X size={15}/>Remove picture</button>}<input id="profile-photo-input" className="profile-hidden-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadAvatar} disabled={avatarBusy}/></div>}</div><div><span className="profile-eyebrow">CUSTOMER PROFILE</span><h1>{name}</h1><p>{profile?.tier||'Customer'} · Customer since {profile?.customer_since||'—'}</p></div></header>
    {message&&<div className="profile-message"><CheckCircle2 size={16}/>{message}</div>}{avatarError&&<div className="profile-message profile-error">{avatarError}</div>}
    <div className="profile-grid">
      <section className="profile-card profile-wide"><div className="profile-card-head"><div><h2>Personal information</h2><p>Details associated with your customer relationship.</p></div><UserRound size={18}/></div>{editing?<form onSubmit={save} className="profile-form"><div className="profile-two"><label>Legal full name<input value={form.full_name||''} onChange={e=>update('full_name',e.target.value)} required/></label><label>Preferred name<input value={form.preferred_name||''} onChange={e=>update('preferred_name',e.target.value)}/></label></div><label>Mobile phone<input value={form.phone||''} onChange={e=>update('phone',e.target.value)}/></label><label>Residential address<input value={form.address_line1||''} onChange={e=>update('address_line1',e.target.value)}/></label><div className="profile-three"><label>City<input value={form.city||''} onChange={e=>update('city',e.target.value)}/></label><label>State / region<input value={form.state_region||''} onChange={e=>update('state_region',e.target.value)}/></label><label>Postal code<input value={form.postal_code||''} onChange={e=>update('postal_code',e.target.value)}/></label></div><div className="profile-two"><label>Country<input value={form.country||''} onChange={e=>update('country',e.target.value)}/></label><label>Time zone<input value={form.timezone||''} onChange={e=>update('timezone',e.target.value)}/></label></div><button className="profile-save" disabled={busy}><Save size={15}/>{busy?'Saving…':'Save changes'}</button></form>:<div className="profile-details"><div><span>Legal name</span><b>{profile?.full_name||'Not provided'}</b></div><div><span>Preferred name</span><b>{profile?.preferred_name||'Not set'}</b></div><div><span>Mobile phone</span><b>{profile?.phone||'Not provided'}</b></div><div className="profile-detail-wide"><span>Residential address</span><b>{[profile?.address_line1,profile?.city,profile?.state_region,profile?.postal_code,profile?.country].filter(Boolean).join(', ')||'Not provided'}</b></div></div>}</section>
      <section className="profile-card"><div className="profile-card-head"><div><h2>Contact channels</h2><p>How the bank can reach you.</p></div><Mail size={18}/></div><div className="profile-contact"><div><Mail size={16}/><span><small>Email address</small><b>{maskEmail(session?.user?.email)}</b></span></div><div><Phone size={16}/><span><small>Mobile</small><b>{profile?.phone||'Not provided'}</b></span></div><div><MapPin size={16}/><span><small>Location</small><b>{profile?.city||'Not provided'}{profile?.country?`, ${profile.country}`:''}</b></span></div></div></section>
      <section className="profile-card"><div className="profile-card-head"><div><h2>Account relationship</h2><p>Primary account details.</p></div></div><div className="profile-details"><div><span>Account</span><b>{accountName}</b></div><div><span>Account type</span><b>{account?.account_type||'Not provided'}</b></div><div><span>Currency</span><b>{account?.currency||'USD'}</b></div><div><span>Status</span><b className="profile-green">{account?.status||'Not available'}</b></div><div><span>Account number</span><b>{account?.account_number_last4?`•••• ${account.account_number_last4}`:'Not available'}</b></div><div><span>Customer tier</span><b>{profile?.tier||'Customer'}</b></div></div></section>
      <section className="profile-card"><div className="profile-card-head"><div><h2>Security & preferences</h2><p>Protection settings connected to your account.</p></div><ShieldCheck size={18}/></div><div className="profile-security"><div><span>Two-factor authentication</span><b className={security?.two_fa?'profile-green':''}>{security?.two_fa?'Enabled':'Not enabled'}</b></div><div className="profile-passkey-row"><span>Passkey</span><span className="profile-passkey-status"><b className={passkeyCount>0?'profile-green':''}>{passkeyCount>0?'Active':'Not registered'}</b><button type="button" onClick={()=>void registerPasskey()} disabled={passkeyBusy}><KeyRound size={14}/>{passkeyBusy?'Waiting…':passkeyCount>0?'Register another':'Set up passkey'}</button></span></div><div><span>Security alerts</span><b className={security?.alerts?'profile-green':''}>{security?.alerts?'Enabled':'Not enabled'}</b></div><div><span>Profile completion</span><b className={profile?.profile_completed?'profile-green':''}>{profile?.profile_completed?'Complete':'Needs attention'}</b></div></div></section>
    </div>
    <div className="profile-footer-actions"><button className="profile-edit profile-edit-bottom" onClick={editing?cancelEditing:startEditing}><Edit3 size={14}/>{editing?'Cancel editing':'Edit profile'}</button></div>
  </div></BankingShell>
}