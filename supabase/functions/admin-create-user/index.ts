import { corsHeaders, json } from '../_shared/cors.ts';
import { generatedPassword, jsidEmail, requireActor } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { supabase, actor } = await requireActor(req, ['super_admin']);
    const body = await req.json();
    if (body.role === 'employee' && !body.team_lead_id) throw new Error('Employees require a Team Lead.');
    if (body.role === 'team_lead' && !body.manager_id) throw new Error('Team Leads require a Manager.');

    const { data: jsidData, error: jsidError } = await supabase.rpc('generate_jsid');
    if (jsidError) throw jsidError;
    const jsid = jsidData as string;
    const password = generatedPassword();
    const email = jsidEmail(jsid);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      app_metadata: { role: body.role, jsid },
    });
    if (createError) throw createError;
    const { error: profileError } = await supabase.from('users').insert({
      id: created.user.id,
      jsid,
      auth_email: email,
      name: body.name,
      role: body.role,
      department: body.department,
      manager_id: body.role === 'team_lead' ? body.manager_id : null,
      team_lead_id: body.role === 'employee' ? body.team_lead_id : null,
      first_login_done: false,
      status: 'active',
    });
    if (profileError) throw profileError;
    await supabase.from('audit_events').insert({
      actor_id: actor.id,
      target_id: created.user.id,
      action: 'user_created',
      metadata: { jsid, role: body.role },
    });
    return json({ jsid, password });
  } catch (error) {
    if (error instanceof Response) return error;
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 400);
  }
});

