import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this script.');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function password() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from({ length: 14 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

const name = process.env.WORKTRACK_SUPER_ADMIN_NAME || 'Super Admin';
const jsid = 'JS0001';
const email = 'js0001@worktrack.local';
const defaultPassword = process.env.WORKTRACK_SUPER_ADMIN_PASSWORD || password();

const { data: existing } = await supabase.from('users').select('id').eq('jsid', jsid).maybeSingle();
if (existing) {
  console.log('Super Admin already exists:', jsid);
  process.exit(0);
}

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password: defaultPassword,
  email_confirm: true,
  app_metadata: { role: 'super_admin', jsid },
});

if (createError) {
  console.error(createError.message);
  process.exit(1);
}

const { error: profileError } = await supabase.from('users').insert({
  id: created.user.id,
  jsid,
  auth_email: email,
  name,
  role: 'super_admin',
  department: 'Operations',
  status: 'active',
  first_login_done: false,
});

if (profileError) {
  console.error(profileError.message);
  process.exit(1);
}

console.log('WorkTrack Super Admin created');
console.log(`JSID: ${jsid}`);
console.log(`Default password: ${defaultPassword}`);
console.log('This password is shown once. The user must change it on first login.');
