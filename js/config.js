// ProteinPrice — Supabase client config
// Anon key is safe for frontend use (Row Level Security enforced)
// Service role key: use in server-side/edge functions only — never expose in client JS

export const SUPABASE_URL = 'https://fhxxxsbtfcseiqssmysz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoeHh4c2J0ZmNzZWlxc3NteXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0ODEzNDUsImV4cCI6MjA5NTA1NzM0NX0.9F83aTsfpvF-jU5aIh8LtzZcKP6ywjyV2v72gSL1xL8';

// Supabase JS v2 client — loaded from CDN in HTML
// import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
