import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['team_lead', 'manager', 'super_admin']);
    const { proposal_id, approve, review_note, approved_time } = await req.json();
    const { data: proposal, error } = await supabase.from('custom_task_proposals').select('*').eq('id', proposal_id).maybeSingle();
    if (error || !proposal) throw new Error('Proposal not found.');
    const nextStatus = approve
      ? proposal.status === 'pending_tl' && actor.role === 'team_lead'
        ? 'pending_manager'
        : 'approved'
      : 'rejected';
    await supabase.from('custom_task_proposals').update({
      status: nextStatus,
      reviewed_by: actor.id,
      review_note: review_note ?? null,
      proposed_time: approved_time ?? proposal.proposed_time,
      updated_at: new Date().toISOString(),
    }).eq('id', proposal.id);
    if (nextStatus === 'approved') {
      await supabase.from('approved_custom_tasks').insert({
        employee_id: proposal.employee_id,
        task_name: proposal.task_name,
        category: proposal.category,
        time_minutes: approved_time ?? proposal.proposed_time,
        proposal_id: proposal.id,
      });
    }
    await supabase.from('notifications').insert({
      user_id: proposal.employee_id,
      message: `Custom task ${nextStatus.replace('_', ' ')}`,
      type: 'proposal',
    });
    await supabase.from('audit_events').insert({
      actor_id: actor.id,
      target_id: proposal.id,
      action: 'proposal_reviewed',
      metadata: { approve, next_status: nextStatus, review_note },
    });
    return json({ status: nextStatus });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

