import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.VITE_TURSO_DATABASE_URL || !process.env.VITE_TURSO_AUTH_TOKEN) {
  throw new Error('Set VITE_TURSO_DATABASE_URL and VITE_TURSO_AUTH_TOKEN before running this script.');
}

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
});

const managerJsid = 'JS20741';
const teamLeadJsid = 'JS21587';
const employeeJsids = ['JS21264', 'JS21312', 'JS21406', 'JS20469', 'JS19176', 'JS21384'];

async function main() {
  const manager = await client.execute({ sql: 'SELECT id, name FROM users WHERE jsid = ?', args: [managerJsid] });
  const teamLead = await client.execute({ sql: 'SELECT id, name FROM users WHERE jsid = ?', args: [teamLeadJsid] });

  if (manager.rows.length === 0) {
    throw new Error(`Manager ${managerJsid} not found.`);
  }
  if (teamLead.rows.length === 0) {
    throw new Error(`Team Lead ${teamLeadJsid} not found.`);
  }

  const managerId = String(manager.rows[0].id);
  const teamLeadId = String(teamLead.rows[0].id);
  const placeholders = employeeJsids.map(() => '?').join(', ');

  await client.execute({
    sql: 'UPDATE users SET manager_id = NULL, team_lead_id = NULL WHERE jsid = ?',
    args: [managerJsid],
  });
  await client.execute({
    sql: 'UPDATE users SET manager_id = ?, team_lead_id = NULL WHERE jsid = ?',
    args: [managerId, teamLeadJsid],
  });
  const employeeUpdate = await client.execute({
    sql: `UPDATE users SET manager_id = NULL, team_lead_id = ? WHERE jsid IN (${placeholders})`,
    args: [teamLeadId, ...employeeJsids],
  });

  console.log('Hierarchy repaired.');
  console.table([
    { jsid: managerJsid, role: 'manager', manager_id: null, team_lead_id: null },
    { jsid: teamLeadJsid, role: 'team_lead', manager_id: managerId, team_lead_id: null },
    { jsid: employeeJsids.join(', '), role: 'employee', manager_id: null, team_lead_id: teamLeadId },
  ]);
  console.log(`Employees updated: ${employeeUpdate.rowsAffected ?? 'unknown'}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
