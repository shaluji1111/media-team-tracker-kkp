const fs = require('fs');
const path = require('path');

const mockDataPath = path.join(__dirname, '../src/data/mockData.ts');
let content = fs.readFileSync(mockDataPath, 'utf8');

// Replace demoUsers
const newDemoUsers = `export const demoUsers: AppUser[] = [
  { id: 'u-admin', jsid: 'JS0001', auth_email: 'js0001@worktrack.local', name: 'Super Admin', role: 'super_admin', department: 'Operations', manager_id: null, team_lead_id: null, status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-sahil', jsid: 'JS20741', auth_email: 'js20741@worktrack.local', name: 'sahil kumar', role: 'manager', department: 'Management', manager_id: null, team_lead_id: null, status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-abhishek', jsid: 'JS21587', auth_email: 'js21587@worktrack.local', name: 'abhishek', role: 'team_lead', department: 'Management', manager_id: 'u-sahil', team_lead_id: null, status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-kalpana', jsid: 'JS21264', auth_email: 'js21264@worktrack.local', name: 'Kalpana thakur', role: 'employee', department: 'Social Media', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-sakshi', jsid: 'JS21312', auth_email: 'js21312@worktrack.local', name: 'Sakshi', role: 'employee', department: 'Design', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-sourav', jsid: 'JS21406', auth_email: 'js21406@worktrack.local', name: 'Sourav', role: 'employee', department: 'Content', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-aryan', jsid: 'JS20469', auth_email: 'js20469@worktrack.local', name: 'Aryan', role: 'employee', department: 'Content', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-rajat', jsid: 'JS19176', auth_email: 'js19176@worktrack.local', name: 'rajat', role: 'employee', department: 'Video', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true }
];`;

content = content.replace(/export const demoUsers: AppUser\[\] = \[[\s\S]*?\];/m, newDemoUsers);

// Empty out other arrays
content = content.replace(/export const demoApprovedCustomTasks = \[[\s\S]*?\];/m, 'export const demoApprovedCustomTasks: ApprovedCustomTask[] = [];');
content = content.replace(/export const demoTaskLogs: TaskLog\[\] = \[[\s\S]*?\];/m, 'export const demoTaskLogs: TaskLog[] = [];');
content = content.replace(/export const demoProposals: CustomTaskProposal\[\] = \[[\s\S]*?\];/m, 'export const demoProposals: CustomTaskProposal[] = [];');
content = content.replace(/export const demoLeaves: LeaveRequest\[\] = \[[\s\S]*?\];/m, 'export const demoLeaves: LeaveRequest[] = [];');
content = content.replace(/export const demoNotifications: NotificationItem\[\] = \[[\s\S]*?\];/m, 'export const demoNotifications: NotificationItem[] = [];');
content = content.replace(/export const demoAuditEvents: AuditEvent\[\] = \[[\s\S]*?\];/m, 'export const demoAuditEvents: AuditEvent[] = [];');
content = content.replace(/export const demoRegistrationRequests: SelfRegistrationRequest\[\] = \[[\s\S]*?\];/m, 'export const demoRegistrationRequests: SelfRegistrationRequest[] = [];');
content = content.replace(/export const demoPasswordResetRequests: PasswordResetRequest\[\] = \[\];/m, 'export const demoPasswordResetRequests: PasswordResetRequest[] = [];');

// Add ApprovedCustomTask import if missing
if (!content.includes('ApprovedCustomTask')) {
    content = content.replace(/AppUser,/, 'AppUser,\n  ApprovedCustomTask,');
}

fs.writeFileSync(mockDataPath, content, 'utf8');
console.log('mockData.ts updated');
