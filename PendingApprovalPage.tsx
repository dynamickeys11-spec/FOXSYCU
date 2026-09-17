import { Clock3, LogOut, ShieldCheck } from 'lucide-react'
import { supabase } from './supabaseClient'
import { FNCUWordmark } from './FNCUBrand'
import './pending-approval.css'

export default function PendingApprovalPage({ status = 'pending' }: { status?: 'pending' | 'rejected' }) {
  const rejected = status === 'rejected'
  const signOut = async () => { await supabase.auth.signOut() }
  return <main className="pending-approval-page"><section className="pending-approval-card"><div className="pending-approval-brand"><FNCUWordmark compact /></div><div className="pending-approval-icon" aria-hidden="true">{rejected ? <ShieldCheck size={28}/> : <Clock3 size={28}/>}</div><div className="pending-approval-kicker">CUSTOMER ACCESS REVIEW</div><h1>{rejected ? 'Your application is not approved' : 'Your application is waiting for approval'}</h1><p>{rejected ? 'Your account application has not been approved for customer access. Please contact customer support if you believe this decision needs to be reviewed.' : 'Your application has been received and is currently being reviewed. Customer access is not available until an authorized FNCU administrator approves your application.'}</p><div className="pending-approval-status"><span className={rejected ? 'status-dot rejected' : 'status-dot'}></span><strong>{rejected ? 'Application not approved' : 'Waiting for administrator authorization'}</strong><small>{rejected ? 'Access remains unavailable.' : 'You do not need to submit another application.'}</small></div><div className="pending-approval-security"><ShieldCheck size={16}/><span>Secure access remains restricted until the review is completed.</span></div><button className="pending-approval-signout" onClick={()=>void signOut()}><LogOut size={16}/> Sign out</button></section></main>
}
