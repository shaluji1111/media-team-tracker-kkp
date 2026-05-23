import { businessDateFor, todayInBusinessTz } from '../lib/dates';
import { averageNullable, employeeDailyScore, statusForMinutes } from '../lib/score';
import type {
  AppUser,
  ApprovedCustomTask,
  AuditEvent,
  CustomTaskProposal,
  LeaveRequest,
  NotificationItem,
  PasswordResetRequest,
  ReportRow,
  SelfRegistrationRequest,
  TaskLibraryItem,
  TaskLog,
  TeamMetric,
} from '../types';

const now = new Date();
const today = todayInBusinessTz(now);

export const demoUsers: AppUser[] = [
  { id: 'u-admin', jsid: 'JS0001', auth_email: 'js0001@worktrack.local', name: 'Super Admin', role: 'super_admin', department: 'Operations', manager_id: null, team_lead_id: null, status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-sahil', jsid: 'JS20741', auth_email: 'js20741@worktrack.local', name: 'sahil kumar', role: 'manager', department: 'Management', manager_id: null, team_lead_id: null, status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-abhishek', jsid: 'JS21587', auth_email: 'js21587@worktrack.local', name: 'abhishek', role: 'team_lead', department: 'Management', manager_id: 'u-sahil', team_lead_id: null, status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-kalpana', jsid: 'JS21264', auth_email: 'js21264@worktrack.local', name: 'Kalpana thakur', role: 'employee', department: 'Social Media', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-sakshi', jsid: 'JS21312', auth_email: 'js21312@worktrack.local', name: 'Sakshi', role: 'employee', department: 'Design', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-sourav', jsid: 'JS21406', auth_email: 'js21406@worktrack.local', name: 'Sourav', role: 'employee', department: 'Content', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-aryan', jsid: 'JS20469', auth_email: 'js20469@worktrack.local', name: 'Aryan', role: 'employee', department: 'Content', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-rajat', jsid: 'JS19176', auth_email: 'js19176@worktrack.local', name: 'rajat', role: 'employee', department: 'Video', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true },
  { id: 'u-abhiraj', jsid: 'JS21384', auth_email: 'js21384@worktrack.local', name: 'Abhiraj', role: 'employee', department: 'Video', manager_id: null, team_lead_id: 'u-abhishek', status: 'active', created_at: new Date().toISOString(), first_login_done: true }
];

export const demoTaskLibrary: TaskLibraryItem[] = [
  {
    id: 'task-1',
    name: 'Instagram carousel design',
    category: 'Graphic Design',
    platform_tag: 'Instagram',
    time_minutes: 90,
    effective_from_date: today,
    is_deleted: false,
    updated_at: now.toISOString(),
  },
  {
    id: 'task-2',
    name: 'Short-form video edit',
    category: 'Video Editing',
    platform_tag: 'TikTok',
    time_minutes: 120,
    effective_from_date: today,
    is_deleted: false,
    updated_at: now.toISOString(),
  },
  {
    id: 'task-3',
    name: 'Caption and hashtag set',
    category: 'Copywriting',
    platform_tag: 'General',
    time_minutes: 45,
    effective_from_date: today,
    is_deleted: false,
    updated_at: now.toISOString(),
  },
  {
    id: 'task-4',
    name: 'Weekly content calendar',
    category: 'Strategy',
    platform_tag: 'General',
    time_minutes: 150,
    effective_from_date: today,
    is_deleted: false,
    updated_at: now.toISOString(),
  },
];

export const demoApprovedCustomTasks: ApprovedCustomTask[] = [];

export const demoTaskLogs: TaskLog[] = [];

export const demoProposals: CustomTaskProposal[] = [];

export const demoLeaves: LeaveRequest[] = [];

export const demoNotifications: NotificationItem[] = [];

export const demoAuditEvents: AuditEvent[] = [];

export const demoRegistrationRequests: SelfRegistrationRequest[] = [];

export const demoPasswordResetRequests: PasswordResetRequest[] = [];

export function getChildren(user: AppUser, users = demoUsers): AppUser[] {
  if (user.role === 'manager') {
    return users.filter((candidate) => candidate.manager_id === user.id);
  }
  if (user.role === 'team_lead') {
    return users.filter((candidate) => candidate.team_lead_id === user.id);
  }
  return [];
}

export function getVisibleUsers(user: AppUser, users = demoUsers): AppUser[] {
  if (user.role === 'super_admin') {
    return users;
  }
  if (user.role === 'manager') {
    const leads = users.filter((candidate) => candidate.manager_id === user.id);
    const employees = users.filter((candidate) => leads.some((lead) => lead.id === candidate.team_lead_id));
    return [user, ...leads, ...employees];
  }
  if (user.role === 'team_lead') {
    return [user, ...users.filter((candidate) => candidate.team_lead_id === user.id)];
  }
  return [user];
}

export function logsForUser(employeeId: string, logs = demoTaskLogs): TaskLog[] {
  const currentBusinessDate = todayInBusinessTz();
  return logs.filter((log) => log.employee_id === employeeId && businessDateFor(log.logged_at) === currentBusinessDate);
}

export function minutesForEmployee(employeeId: string, logs = demoTaskLogs): number | null {
  const logsToday = logsForUser(employeeId, logs);
  if (logsToday.length === 0) {
    return null;
  }
  return logsToday.reduce((sum, log) => sum + log.task_time_snapshot, 0);
}

export function scoreForUser(user: AppUser, users = demoUsers, logs = demoTaskLogs): number | null {
  if (user.role === 'super_admin') {
    return null;
  }
  if (user.role === 'employee') {
    return employeeDailyScore(minutesForEmployee(user.id, logs));
  }
  if (user.role === 'team_lead') {
    return averageNullable(
      users
        .filter((candidate) => candidate.team_lead_id === user.id)
        .map((employee) => scoreForUser(employee, users, logs)),
    );
  }
  const leads = users.filter((candidate) => candidate.manager_id === user.id);
  return averageNullable(leads.map((lead) => scoreForUser(lead, users, logs)));
}

function hasApprovedLeaveToday(user: AppUser, leaves = demoLeaves): boolean {
  const currentBusinessDate = todayInBusinessTz();
  return leaves.some(
    (leave) =>
      leave.employee_id === user.id &&
      leave.status === 'approved' &&
      leave.start_date <= currentBusinessDate &&
      leave.end_date >= currentBusinessDate,
  );
}

export function teamMetricsFor(viewer: AppUser, users = demoUsers, logs = demoTaskLogs, leaves = demoLeaves): TeamMetric[] {
  return getVisibleUsers(viewer, users)
    .filter((user) => user.role !== 'super_admin')
    .filter((user) => (viewer.role === 'employee' ? user.id === viewer.id : user.id !== viewer.id))
    .map((user) => {
      const minutes = user.role === 'employee' ? minutesForEmployee(user.id, logs) : null;
      const approvedLeaveToday = user.role === 'employee' && hasApprovedLeaveToday(user, leaves);
      return {
        user,
        hoursToday: minutes === null ? null : minutes / 60,
        score: approvedLeaveToday ? null : scoreForUser(user, users, logs),
        tasksToday: user.role === 'employee' ? logsForUser(user.id, logs).length : 0,
        status: user.role === 'employee' ? statusForMinutes(minutes, approvedLeaveToday) : 'no_data',
        childCount: getChildren(user, users).length,
      };
    });
}

export function reportRowsFor(viewer: AppUser, users = demoUsers, logs = demoTaskLogs, leaves = demoLeaves): ReportRow[] {
  const visibleEmployees = getVisibleUsers(viewer, users).filter((user) => user.role === 'employee');
  return visibleEmployees.map((employee) => {
    const employeeLogs = logsForUser(employee.id, logs);
    const totalMinutes = employeeLogs.reduce((sum, log) => sum + log.task_time_snapshot, 0);
    const approvedLeaveToday = hasApprovedLeaveToday(employee, leaves);
    return {
      employee,
      taskCount: employeeLogs.length,
      totalHours: totalMinutes / 60,
      score: employeeDailyScore(employeeLogs.length ? totalMinutes : null, approvedLeaveToday),
      status: statusForMinutes(employeeLogs.length ? totalMinutes : null, approvedLeaveToday),
    };
  });
}
