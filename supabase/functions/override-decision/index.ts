import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['super_admin']);
    const { table, id, status, note } = await req.json();
    if (!['custom_task_proposals', 'leave_requests'].includes(table)) throw new Error('Unsupported override target.');
    const patch = table === 'leave_requests'
      ? { status, override_by: actor.id, review_note: note ?? null, updated_at: new Date().toISOString() }
      : { status, reviewed_by: actor.id, review_note: note ?? null, updated_at: new Date().toISOString() };
    const { error } = await supabase.from(table).update(patch).eq('id', id);
    if (error) throw error;
    await supabase.from('audit_events').insert({
      actor_id: actor.id,
      target_id: id,
      action: 'override',
      metadata: { table, status, note },
    });
    return json({ ok: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

