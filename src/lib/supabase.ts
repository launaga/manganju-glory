// Browser Supabase client for the admin area.
//
// Uses ONLY client-safe credentials (PUBLIC_ prefix → inlined into the bundle):
// the project URL and the anon/publishable key. The anon key is designed to be
// public; Row Level Security (Phase 3) is what actually protects the data. The
// service-role key is NEVER imported here or anywhere in client code.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.PUBLIC_SUPABASE_URL;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly during dev/build rather than shipping a broken admin.
  throw new Error(
    'Missing PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.'
  );
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true, // keep the session across refresh/navigation
    autoRefreshToken: true, // refresh the JWT before it expires
    detectSessionInUrl: false, // no OAuth/magic-link redirects in this app
  },
});
