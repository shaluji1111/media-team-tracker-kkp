import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['team_lead', 'manager', 'super_admin']);
    const { leave_id, approve, review_note } = await req.json();
    const { data: leave, error } = await supabase.from('leave_requests').select('*').eq('id', leave_id).maybeSingle();
    if (error || !leave) throw new Error('Leave request not found.');
    const nextStatus = approve
      ? leave.status === 'pending_tl' && actor.role === 'team_lead'
        ? 'pending_manager'
        : 'approved'
      : 'rejected';
    await supabase.from('leave_requests').update({
      status: nextStatus,
      reviewed_by: actor.id,
      review_note: review_note ?? null,
      updated_at: new Date().toISOString(),
    }).eq('id', leave.id);
    await supabase.from('notifications').insert({
      user_id: leave.employee_id,
      message: `Leave request ${nextStatus.replace('_', ' ')}`,
      type: 'leave',
    });
    await supabase.from('audit_events').insert({
      actor_id: actor.id,
      target_id: leave.id,
      action: 'leave_reviewed',
      metadata: { approve, next_status: nextStatus, review_note },
    });
    return json({ status: nextStatus });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

