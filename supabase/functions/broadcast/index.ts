import { corsHeaders, json } from '../_shared/cors.ts';
import { requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['super_admin']);
    const { message, target } = await req.json();
    const query = supabase.from('users').select('id').eq('status', 'active');
    const { data: recipients, error } = target === 'all' ? await query : await query.eq('role', target);
    if (error) throw error;
    const rows = (recipients ?? []).map((recipient: { id: string }) => ({
      user_id: recipient.id,
      message,
      type: 'broadcast',
    }));
    if (rows.length) await supabase.from('notifications').insert(rows);
    await supabase.from('audit_events').insert({
      actor_id: actor.id,
      action: 'broadcast_sent',
      metadata: { target, recipient_count: rows.length },
    });
    return json({ recipient_count: rows.length });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

