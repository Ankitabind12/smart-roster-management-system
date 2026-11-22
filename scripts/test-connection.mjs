import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mukbsmqzoizhcfafjszo.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Try a simple query to see if any tables exist
const { data, error } = await supabase.from('profiles').select('*').limit(1);
console.log('profiles query:', error ? `Error: ${error.message} (${error.code})` : `Success: ${JSON.stringify(data)}`);

// Also try to check if we can create tables via SQL
const { data: d2, error: e2 } = await supabase.rpc('version');
console.log('version rpc:', e2 ? `Error: ${e2.message}` : `Success: ${JSON.stringify(d2)}`);

