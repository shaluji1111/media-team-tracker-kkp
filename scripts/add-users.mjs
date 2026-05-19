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

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const users = [
  { name: 'sahil kumar', jsid: 'JS20741', role: 'manager', department: 'Management' },
  { name: 'abhishek', jsid: 'JS21587', role: 'team_lead', department: 'Management' },
  { name: 'Kalpana thakur', jsid: 'JS21264', role: 'employee', department: 'Social Media' },
  { name: 'Sakshi', jsid: 'JS21312', role: 'employee', department: 'Design' },
  { name: 'Sourav', jsid: 'JS21406', role: 'employee', department: 'Content' },
  { name: 'Aryan', jsid: 'JS20469', role: 'employee', department: 'Content' },
  { name: 'rajat', jsid: 'JS19176', role: 'employee', department: 'Video' },
  { name: 'Abhiraj', jsid: 'JS21384', role: 'employee', department: 'Video' },
];

const managerJsid = 'JS20741';
const teamLeadJsid = 'JS21587';
const employeeJsids = users.filter((user) => user.role === 'employee').map((user) => user.jsid);

async function applyHierarchy() {
  const manager = await client.execute({ sql: 'SELECT id FROM users WHERE jsid = ?', args: [managerJsid] });
  const teamLead = await client.execute({ sql: 'SELECT id FROM users WHERE jsid = ?', args: [teamLeadJsid] });

  if (manager.rows.length === 0 || teamLead.rows.length === 0) {
    throw new Error('Cannot apply hierarchy until manager and team lead users exist.');
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
  await client.execute({
    sql: `UPDATE users SET manager_id = NULL, team_lead_id = ? WHERE jsid IN (${placeholders})`,
    args: [teamLeadId, ...employeeJsids],
  });
}

async function main() {
  console.log('Generating passwords and inserting users into Turso...');

  const results = [];

  // Superuser JS0001
  const suPassword = generatePassword();
  const suRes = await client.execute("SELECT * FROM users WHERE jsid = 'JS0001'");
  if (suRes.rows.length > 0) {
    await client.execute({
      sql: "UPDATE users SET password_hash = ?, first_login_done = ? WHERE jsid = 'JS0001'",
      args: [suPassword, 0],
    });
  } else {
    const id = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO users (id, jsid, auth_email, name, role, department, status, created_at, first_login_done, password_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, 'JS0001', 'js0001@worktrack.local', 'Aarav Mehta', 'super_admin', 'Operations', 'active', new Date().toISOString(), 0, suPassword]
    });
  }

  results.push({ name: 'Super Admin', jsid: 'JS0001', password: suPassword });

  // Insert other users
  for (const u of users) {
    const password = generatePassword();
    const id = crypto.randomUUID();
    const email = `${u.jsid.toLowerCase()}@worktrack.local`;
    
    // Check if user exists
    const existing = await client.execute({ sql: "SELECT id FROM users WHERE jsid = ?", args: [u.jsid.toUpperCase()] });
    
    if (existing.rows.length > 0) {
      await client.execute({
        sql: "UPDATE users SET password_hash = ?, name = ?, role = ?, department = ?, status = ?, first_login_done = ? WHERE jsid = ?",
        args: [password, u.name, u.role, u.department, 'active', 0, u.jsid.toUpperCase()]
      });
    } else {
      await client.execute({
        sql: `INSERT INTO users (id, jsid, auth_email, name, role, department, status, created_at, first_login_done, password_hash)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, u.jsid.toUpperCase(), email, u.name, u.role, u.department, 'active', new Date().toISOString(), 0, password]
      });
    }
    
    results.push({ name: u.name, jsid: u.jsid.toUpperCase(), password });
  }

  await applyHierarchy();

  console.log('--------------------------------------------------');
  console.log('USER CREDENTIALS (PLEASE SHARE WITH USER):');
  console.table(results);
  console.log('--------------------------------------------------');
}

main().catch(console.error);
