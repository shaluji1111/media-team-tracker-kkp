import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['super_admin']);
    const { user_ids, new_manager_id, new_team_lead_id } = await req.json();
    if (!Array.isArray(user_ids) || user_ids.length === 0) throw new Error('No users selected.');
    const patch = new_team_lead_id ? { team_lead_id: new_team_lead_id, manager_id: null } : { manager_id: new_manager_id, team_lead_id: null };
    const { error } = await supabase.from('users').update(patch).in('id', user_ids);
    if (error) throw error;
    await supabase.from('audit_events').insert({
      actor_id: actor.id,
      action: 'hierarchy_reassigned',
      metadata: { user_ids, new_manager_id, new_team_lead_id },
    });
    return json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

