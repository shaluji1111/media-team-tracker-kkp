import { todayInBusinessTz } from '../lib/dates';
import { averageNullable, employeeDailyScore, statusForMinutes } from '../lib/score';
import type {
  AppUser,
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
  {
    id: 'u-admin',
    jsid: 'JS0001',
    auth_email: 'js0001@worktrack.local',
    name: 'Aarav Mehta',
    role: 'super_admin',
    department: 'Operations',
    manager_id: null,
    team_lead_id: null,
    status: 'active',
    created_at: '2026-01-02T09:00:00.000Z',
    first_login_done: true,
  },
  {
    id: 'u-manager',
    jsid: 'JS1001',
    auth_email: 'js1001@worktrack.local',
    name: 'Nisha Rao',
    role: 'manager',
    department: 'Social Media',
    manager_id: null,
    team_lead_id: null,
    status: 'active',
    created_at: '2026-01-05T09:00:00.000Z',
    first_login_done: true,
  },
  {
    id: 'u-tl-1',
    jsid: 'JS2001',
    auth_email: 'js2001@worktrack.local',
    name: 'Kabir Shah',
    role: 'team_lead',
    department: 'Content',
    manager_id: 'u-manager',
    team_lead_id: null,
    status: 'active',
    created_at: '2026-01-07T09:00:00.000Z',
    first_login_done: true,
  },
  {
    id: 'u-tl-2',
    jsid: 'JS2002',
    auth_email: 'js2002@worktrack.local',
    name: 'Maya Iyer',
    role: 'team_lead',
    department: 'Video',
    manager_id: 'u-manager',
    team_lead_id: null,
    status: 'active',
    created_at: '2026-01-08T09:00:00.000Z',
    first_login_done: true,
  },
  {
    id: 'u-emp-1',
    jsid: 'JS3001',
    auth_email: 'js3001@worktrack.local',
    name: 'Rohan Patel',
    role: 'employee',
    department: 'Content',
    manager_id: null,
    team_lead_id: 'u-tl-1',
    status: 'active',
    created_at: '2026-01-10T09:00:00.000Z',
    first_login_done: true,
  },
  {
    id: 'u-emp-2',
    jsid: 'JS3002',
    auth_email: 'js3002@worktrack.local',
    name: 'Sara Khan',
    role: 'employee',
    department: 'Content',
    manager_id: null,
    team_lead_id: 'u-tl-1',
    status: 'active',
    created_at: '2026-01-10T09:00:00.000Z',
    first_login_done: true,
  },
  {
    id: 'u-emp-3',
    jsid: 'JS3003',
    auth_email: 'js3003@worktrack.local',
    name: 'Dev Menon',
    role: 'employee',
    department: 'Video',
    manager_id: null,
    team_lead_id: 'u-tl-2',
    status: 'active',
    created_at: '2026-01-12T09:00:00.000Z',
    first_login_done: true,
  },
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

export const demoApprovedCustomTasks = [
  {
    id: 'custom-1',
    employee_id: 'u-emp-1',
    task_name: 'Influencer shortlist cleanup',
    category: 'Strategy',
    time_minutes: 60,
    approved_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const demoTaskLogs: TaskLog[] = [
  {
    id: 'log-1',
    employee_id: 'u-emp-1',
    task_library_id: 'task-1',
    task_name: 'Instagram carousel design',
    category: 'Graphic Design',
    platform_tag: 'Instagram',
    task_time_snapshot: 90,
    status: 'done',
    notes: 'Campaign carousel for launch post',
    proof_url: null,
    project_tag: 'Launch',
    logged_at: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
    is_custom: false,
  },
  {
    id: 'log-2',
    employee_id: 'u-emp-1',
    task_library_id: 'task-3',
    task_name: 'Caption and hashtag set',
    category: 'Copywriting',
    platform_tag: 'General',
    task_time_snapshot: 45,
    status: 'done',
    notes: null,
    proof_url: null,
    project_tag: 'Launch',
    logged_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    is_custom: false,
  },
  {
    id: 'log-3',
    employee_id: 'u-emp-2',
    task_library_id: 'task-4',
    task_name: 'Weekly content calendar',
    category: 'Strategy',
    platform_tag: 'General',
    task_time_snapshot: 150,
    status: 'in_progress',
    notes: 'Drafting next week plan',
    proof_url: null,
    project_tag: 'Always-on',
    logged_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString(),
    is_custom: false,
  },
  {
    id: 'log-4',
    employee_id: 'u-emp-3',
    task_library_id: 'task-2',
    task_name: 'Short-form video edit',
    category: 'Video Editing',
    platform_tag: 'TikTok',
    task_time_snapshot: 120,
    status: 'pending',
    notes: null,
    proof_url: null,
    project_tag: 'Reels',
    logged_at: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    is_custom: false,
  },
];

export const demoProposals: CustomTaskProposal[] = [
  {
    id: 'proposal-1',
    employee_id: 'u-emp-1',
    employee_name: 'Rohan Patel',
    task_name: 'Influencer response matrix',
    description: 'Create a response matrix for influencer collaboration DMs.',
    category: 'Strategy',
    proposed_time: 75,
    status: 'pending_tl',
    reviewed_by: null,
    review_note: null,
    created_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'proposal-2',
    employee_id: 'u-emp-3',
    employee_name: 'Dev Menon',
    task_name: 'Motion template cleanup',
    description: 'Clean reusable After Effects templates.',
    category: 'Video Editing',
    proposed_time: 120,
    status: 'pending_manager',
    reviewed_by: 'u-tl-2',
    review_note: 'Reviewed by TL',
    created_at: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

export const demoLeaves: LeaveRequest[] = [
  {
    id: 'leave-1',
    employee_id: 'u-emp-2',
    employee_name: 'Sara Khan',
    start_date: today,
    end_date: today,
    leave_type: 'personal',
    reason: 'Family appointment',
    status: 'pending_tl',
    reviewed_by: null,
    override_by: null,
    created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
  },
];

export const demoNotifications: NotificationItem[] = [
  {
    id: 'note-1',
    user_id: 'u-emp-1',
    message: 'Your edit window for Instagram carousel design closes soon.',
    type: 'task_edit_warning',
    is_read: false,
    created_at: new Date(now.getTime() - 20 * 60 * 1000).toISOString(),
  },
  {
    id: 'note-2',
    user_id: 'u-admin',
    message: 'There are pending custom task proposals awaiting review.',
    type: 'proposal',
    is_read: false,
    created_at: new Date(now.getTime() - 50 * 60 * 1000).toISOString(),
  },
];

export const demoAuditEvents: AuditEvent[] = [
  {
    id: 'audit-1',
    actor_id: 'u-admin',
    actor_name: 'Aarav Mehta',
    target_id: 'u-emp-3',
    target_name: 'Dev Menon',
    action: 'user_created',
    metadata: { role: 'employee', team_lead: 'Maya Iyer' },
    created_at: '2026-01-12T09:00:00.000Z',
  },
  {
    id: 'audit-2',
    actor_id: 'u-tl-2',
    actor_name: 'Maya Iyer',
    target_id: 'proposal-2',
    target_name: 'Motion template cleanup',
    action: 'proposal_reviewed',
    metadata: { from: 'pending_tl', to: 'pending_manager' },
    created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export const demoRegistrationRequests: SelfRegistrationRequest[] = [
  {
    id: 'registration-1',
    name: 'Priya Nair',
    department: 'Content',
    requested_role: 'employee',
    status: 'pending_tl',
    created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    decided_by: null,
    decided_at: null,
    note: null,
  },
];

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
  return logs.filter((log) => log.employee_id === employeeId && log.logged_at.slice(0, 10) === today);
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

export function teamMetricsFor(viewer: AppUser, users = demoUsers, logs = demoTaskLogs): TeamMetric[] {
  return getVisibleUsers(viewer, users)
    .filter((user) => user.role !== 'super_admin')
    .filter((user) => (viewer.role === 'employee' ? user.id === viewer.id : user.id !== viewer.id))
    .map((user) => {
      const minutes = user.role === 'employee' ? minutesForEmployee(user.id, logs) : null;
      return {
        user,
        hoursToday: minutes === null ? null : minutes / 60,
        score: scoreForUser(user, users, logs),
        tasksToday: user.role === 'employee' ? logsForUser(user.id, logs).length : 0,
        status: user.role === 'employee' ? statusForMinutes(minutes) : 'no_data',
        childCount: getChildren(user, users).length,
      };
    });
}

export function reportRowsFor(viewer: AppUser, users = demoUsers, logs = demoTaskLogs): ReportRow[] {
  const visibleEmployees = getVisibleUsers(viewer, users).filter((user) => user.role === 'employee');
  return visibleEmployees.map((employee) => {
    const employeeLogs = logsForUser(employee.id, logs);
    const totalMinutes = employeeLogs.reduce((sum, log) => sum + log.task_time_snapshot, 0);
    return {
      employee,
      taskCount: employeeLogs.length,
      totalHours: totalMinutes / 60,
      score: employeeDailyScore(employeeLogs.length ? totalMinutes : null),
      status: statusForMinutes(employeeLogs.length ? totalMinutes : null),
    };
  });
}
