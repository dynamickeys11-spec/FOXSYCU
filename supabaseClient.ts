import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xuqjbuivekhbhlgoldfj.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_aetbjQGy_fi8SCZYxdd20w_iBEr_8Q_'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // Customer sessions must survive deliberate browser/app refreshes. Supabase stores
    // and refreshes the session locally; explicit sign-out still clears it.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: { passkey: true },
  },
})
