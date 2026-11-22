/**
 * RosterFlow â€” Demo User Creation Script
 * Run once after migrations are applied:
 *   node scripts/create-demo-users.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mukbsmqzoizhcfafjszo.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const users = [
  { email: 'admin@rosterflow.demo',    password: 'demo123456', role: 'admin',              name: 'Admin User'      },
  { email: 'manager@rosterflow.demo',  password: 'demo123456', role: 'operations_manager', name: 'Sarah Chen'      },
  { email: 'podlead@rosterflow.demo',  password: 'demo123456', role: 'pod_lead',           name: 'Marcus Johnson'  },
  { email: 'employee@rosterflow.demo', password: 'demo123456', role: 'employee',           name: 'Priya Sharma'    },
];

console.log('ðŸš€ Creating demo users for RosterFlow...\n');

for (const u of users) {
  // Create auth user
  const { data, error } = await supabase.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.name },
  });

  if (error) {
    if (error.message.includes('already been registered') || error.message.includes('already exists')) {
      console.log(`âš ï¸  ${u.email} â€” already exists, skipping.`);
      continue;
    }
    console.error(`âŒ ${u.email} â€” ${error.message}`);
    continue;
  }

  const userId = data.user.id;
  console.log(`âœ… Created auth user: ${u.email} (${userId})`);

  // Insert into profiles table
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    email: u.email,
    full_name: u.name,
    role: u.role,
  });

  if (profileError) {
    console.error(`   âš ï¸  Profile insert failed: ${profileError.message}`);
  } else {
    console.log(`   âœ… Profile created: ${u.name} (${u.role})`);
  }
}

console.log('\nðŸŽ‰ Done! You can now log in with:');
console.log('   admin@rosterflow.demo / demo123456');
console.log('   manager@rosterflow.demo / demo123456');
console.log('   podlead@rosterflow.demo / demo123456');
console.log('   employee@rosterflow.demo / demo123456');

