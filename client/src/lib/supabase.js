import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Single source of truth for the edge function base URL — derived from the
// same env var as the Supabase client, so dev/staging/prod each resolve
// correctly instead of a project ref being hardcoded per call site.
export function edgeFunctionUrl(name) {
  return `${supabaseUrl}/functions/v1/${name}`;
}

export default supabase;
