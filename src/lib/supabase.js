import { createClient } from '@supabase/supabase-js';

const { VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY } = import.meta.env;

export const hasSupabaseConfig = Boolean(VITE_SUPABASE_URL && VITE_SUPABASE_ANON_KEY);
export const supabase = hasSupabaseConfig
  ? createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  : null;