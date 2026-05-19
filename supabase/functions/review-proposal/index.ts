import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['team_lead', 'manager', 'super_admin']);
    const { proposal_id, approve, review_note, approved_time } = await req.json();
    const { data: proposal, error } = await supabase.from('custom_task_proposals').select('*').eq('id', proposal_id).maybeSingle();
    if (error || !proposal) throw new Error('Proposal not found.');
    const approvedTime = approved_time ?? proposal.proposed_time;
    const nextStatus = approve ? 'approved' : 'rejected';
    await supabase.from('custom_task_proposals').update({
      status: nextStatus,
      reviewed_by: actor.id,
      review_note: review_note ?? null,
      proposed_time: approvedTime,
      updated_at: new Date().toISOString(),
    }).eq('id', proposal.id);
    if (nextStatus === 'approved') {
      const { data: existingTask, error: existingTaskError } = await supabase
        .from('approved_custom_tasks')
        .select('*')
        .eq('proposal_id', proposal.id)
        .eq('is_deleted', false)
        .maybeSingle();
      if (existingTaskError) throw existingTaskError;

      const approvedTask = existingTask ?? {
        employee_id: proposal.employee_id,
        task_name: proposal.task_name,
        category: proposal.category,
        time_minutes: approvedTime,
        proposal_id: proposal.id,
      };

      let approvedTaskId = existingTask?.id;
      if (!approvedTaskId) {
        const { data: insertedTask, error: insertTaskError } = await supabase
          .from('approved_custom_tasks')
          .insert(approvedTask)
          .select('id')
          .single();
        if (insertTaskError) throw insertTaskError;
        approvedTaskId = insertedTask.id;
      }

      const { data: existingLog, error: existingLogError } = await supabase
        .from('task_logs')
        .select('id')
        .eq('approved_custom_task_id', approvedTaskId)
        .limit(1)
        .maybeSingle();
      if (existingLogError) throw existingLogError;

      if (!existingLog) {
        const { error: insertLogError } = await supabase.from('task_logs').insert({
          employee_id: proposal.employee_id,
          approved_custom_task_id: approvedTaskId,
          status: 'done',
          notes: `Auto-logged on approval by ${actor.name}`,
          is_custom: true,
        });
        if (insertLogError) throw insertLogError;
      }
    } else {
      const { data: approvedTasksByProposal, error: approvedTasksByProposalError } = await supabase
        .from('approved_custom_tasks')
        .select('id')
        .eq('proposal_id', proposal.id);
      if (approvedTasksByProposalError) throw approvedTasksByProposalError;

      const { data: approvedTasksByDetails, error: approvedTasksByDetailsError } = await supabase
        .from('approved_custom_tasks')
        .select('id')
        .eq('employee_id', proposal.employee_id)
        .eq('task_name', proposal.task_name)
        .eq('category', proposal.category);
      if (approvedTasksByDetailsError) throw approvedTasksByDetailsError;

      const approvedTaskIds = Array.from(
        new Set([
          ...(approvedTasksByProposal ?? []).map((task) => task.id),
          ...(approvedTasksByDetails ?? []).map((task) => task.id),
        ]),
      );
      if (approvedTaskIds.length) {
        const { error: deleteLogsError } = await supabase
          .from('task_logs')
          .delete()
          .in('approved_custom_task_id', approvedTaskIds);
        if (deleteLogsError) throw deleteLogsError;

        const { error: deleteTasksError } = await supabase
          .from('approved_custom_tasks')
          .update({ is_deleted: true })
          .in('id', approvedTaskIds);
        if (deleteTasksError) throw deleteTasksError;
      }
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
