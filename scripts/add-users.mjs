import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

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
];

async function main() {
  console.log('Generating passwords and inserting users into Turso...');

  const results = [];

  // Superuser JS0001
  const suPassword = generatePassword();
  await client.execute({
    sql: "UPDATE users SET password_hash = ? WHERE jsid = 'JS0001'",
    args: [suPassword]
  });
  
  // If Super Admin doesn't exist, we insert:
  const suRes = await client.execute("SELECT * FROM users WHERE jsid = 'JS0001'");
  if (suRes.rows.length === 0) {
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
        sql: "UPDATE users SET password_hash = ? WHERE jsid = ?",
        args: [password, u.jsid.toUpperCase()]
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

  console.log('--------------------------------------------------');
  console.log('USER CREDENTIALS (PLEASE SHARE WITH USER):');
  console.table(results);
  console.log('--------------------------------------------------');
}

main().catch(console.error);
