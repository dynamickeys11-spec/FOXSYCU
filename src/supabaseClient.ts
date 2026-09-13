import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xuqjbuivekhbhlgoldfj.supabase.co'
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_aetbjQGy_fi8SCZYxdd20w_iBEr_8Q_'

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    // FOXSYCU is intentionally session-only: closing/reloading the site must require authentication again.
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    experimental: { passkey: true },
  },
})
