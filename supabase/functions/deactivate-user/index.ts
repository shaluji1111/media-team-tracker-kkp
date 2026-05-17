import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['super_admin']);
    const { user_id } = await req.json();
    const { data: target, error } = await supabase.from('users').select('*').eq('id', user_id).maybeSingle();
    if (error || !target) throw new Error('User not found.');
    if (target.role === 'team_lead') {
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('team_lead_id', user_id).eq('status', 'active');
      if ((count ?? 0) > 0) throw new Error('Reassign active employees before deactivating this Team Lead.');
    }
    if (target.role === 'manager') {
      const { count } = await supabase.from('users').select('id', { count: 'exact', head: true }).eq('manager_id', user_id).eq('status', 'active');
      if ((count ?? 0) > 0) throw new Error('Reassign active Team Leads before deactivating this Manager.');
    }
    await supabase.from('users').update({ status: 'inactive', deactivated_at: new Date().toISOString() }).eq('id', user_id);
    await supabase.rpc('revoke_user_sessions', { input_user_id: user_id });
    await supabase.from('notifications').insert({ user_id, message: 'Your WorkTrack account was deactivated.', type: 'security' });
    await supabase.from('audit_events').insert({ actor_id: actor.id, target_id: user_id, action: 'user_deactivated' });
    return json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});
