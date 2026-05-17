import { createClient } from '@libsql/client';

export const config = {
  runtime: 'edge', // use edge for lower latency with turso
};

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL || '',
  authToken: process.env.VITE_TURSO_AUTH_TOKEN || '',
});

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('OK', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' } });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { action, payload } = await req.json();

    switch (action) {
      case 'sync': {
        // Fetch all data
        const [
          users, tasks, customTasks, logs, proposals, leaves, 
          dailyTemplates, dailyCompletions, taskAssignments, audit
        ] = await Promise.all([
          client.execute("SELECT * FROM users"),
          client.execute("SELECT * FROM task_library"),
          client.execute("SELECT * FROM approved_custom_tasks"),
          client.execute("SELECT * FROM task_logs"),
          client.execute("SELECT * FROM custom_task_proposals"),
          client.execute("SELECT * FROM leave_requests"),
          client.execute("SELECT * FROM daily_templates"),
          client.execute("SELECT * FROM daily_completions"),
          client.execute("SELECT * FROM task_assignments"),
          client.execute("SELECT * FROM audit_events")
        ]);

        return new Response(JSON.stringify({
          users: users.rows,
          taskLibrary: tasks.rows,
          approvedCustomTasks: customTasks.rows,
          taskLogs: logs.rows,
          proposals: proposals.rows,
          leaves: leaves.rows,
          dailyTemplates: dailyTemplates.rows,
          dailyCompletions: dailyCompletions.rows,
          taskAssignments: taskAssignments.rows,
          auditEvents: audit.rows.map(r => ({ ...r, metadata: JSON.parse(r.metadata as string) }))
        }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      case 'execute': {
        // Generic execute for single queries (for simplicity in this prototype)
        // Production apps should NOT let client send raw SQL. We are using this strictly for the prototype transition.
        const { sql, args } = payload;
        const result = await client.execute({ sql, args: args || [] });
        return new Response(JSON.stringify({ success: true, result }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      default:
        return new Response('Unknown action', { status: 400 });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: String(error) }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
