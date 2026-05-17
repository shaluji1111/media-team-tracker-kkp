import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['super_admin']);
    const { user_id } = await req.json();
    const { data: target, error } = await supabase.from('users').select('*').eq('id', user_id).maybeSingle();
    if (error || !target) throw new Error('User not found.');
    if (target.role === 'employee' && !target.team_lead_id) throw new Error('Assign a Team Lead before reactivating this employee.');
    if (target.role === 'team_lead' && !target.manager_id) throw new Error('Assign a Manager before reactivating this Team Lead.');
    await supabase.from('users').update({ status: 'active', deactivated_at: null }).eq('id', user_id);
    await supabase.from('audit_events').insert({ actor_id: actor.id, target_id: user_id, action: 'user_reactivated' });
    return json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});
