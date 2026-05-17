import { corsHeaders, json } from '../_shared/cors.ts';
import { generatedPassword, requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['super_admin']);
    const { user_id } = await req.json();
    const password = generatedPassword();
    const { error } = await supabase.auth.admin.updateUserById(user_id, { password });
    if (error) throw error;
    await supabase.from('users').update({ first_login_done: false }).eq('id', user_id);
    await supabase.from('password_reset_requests').update({
      status: 'approved',
      resolved_at: new Date().toISOString(),
      resolved_by: actor.id,
    }).eq('user_id', user_id).is('resolved_at', null);
    await supabase.from('audit_events').insert({ actor_id: actor.id, target_id: user_id, action: 'password_reset' });
    return json({ password });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

