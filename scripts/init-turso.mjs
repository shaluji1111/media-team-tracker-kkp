import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.VITE_TURSO_DATABASE_URL,
  authToken: process.env.VITE_TURSO_AUTH_TOKEN,
});

const schema = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  jsid TEXT UNIQUE NOT NULL,
  auth_email TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  manager_id TEXT,
  team_lead_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  first_login_done INTEGER DEFAULT 0,
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS task_library (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  platform_tag TEXT,
  time_minutes INTEGER NOT NULL,
  effective_from_date TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS approved_custom_tasks (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,
  time_minutes INTEGER NOT NULL,
  approved_at TEXT NOT NULL,
  is_deleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS task_logs (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  task_library_id TEXT,
  approved_custom_task_id TEXT,
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,
  platform_tag TEXT,
  task_time_snapshot INTEGER NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  proof_url TEXT,
  project_tag TEXT,
  logged_at TEXT NOT NULL,
  is_custom INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS custom_task_proposals (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  task_name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  proposed_time INTEGER NOT NULL,
  status TEXT NOT NULL,
  reviewed_by TEXT,
  review_note TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  leave_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL,
  reviewed_by TEXT,
  override_by TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_templates (
  id TEXT PRIMARY KEY,
  task_library_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  category TEXT NOT NULL,
  platform_tag TEXT,
  time_minutes INTEGER NOT NULL,
  assigned_to TEXT NOT NULL,
  assigned_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS daily_completions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  date TEXT NOT NULL,
  is_done INTEGER DEFAULT 0,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id TEXT PRIMARY KEY,
  task_library_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  employee_name TEXT NOT NULL,
  due_date TEXT,
  notes TEXT,
  assigned_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  actor_name TEXT NOT NULL,
  target_id TEXT,
  target_name TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;

async function main() {
  console.log('Connecting to Turso...');
  const statements = schema.split(';').filter(stmt => stmt.trim() !== '');
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  console.log('Schema created successfully!');
  
  // Create Super Admin if not exists
  const res = await client.execute("SELECT * FROM users WHERE jsid = 'JS0001'");
  if (res.rows.length === 0) {
    const id = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO users (id, jsid, name, role, department, status, created_at, first_login_done, password_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, 'JS0001', 'Aarav Mehta', 'super_admin', 'Operations', 'active', new Date().toISOString(), 0, 'password']
    });
    console.log('Super Admin (JS0001) seeded with password: password');
  } else {
    console.log('Super Admin already exists.');
  }
}

main().catch(console.error);
