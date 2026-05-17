import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.4';

export function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('Supabase service credentials are not configured.');
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function requireActor(req: Request, allowedRoles: string[]) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  const supabase = adminClient();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const { data: actor, error: actorError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .eq('status', 'active')
    .maybeSingle();
  if (actorError || !actor || !allowedRoles.includes(actor.role)) {
    throw new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }
  return { supabase, actor };
}

export function generatedPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function jsidEmail(jsid: string) {
  return `${jsid.toLowerCase().replace('-', '')}@worktrack.local`;
}

