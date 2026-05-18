/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

import {
  demoAuditEvents,
  demoApprovedCustomTasks,
  demoLeaves,
  demoNotifications,
  demoPasswordResetRequests,
  demoProposals,
  demoRegistrationRequests,
  demoTaskLibrary,
  demoTaskLogs,
  demoUsers,
  getVisibleUsers,
  reportRowsFor,
  teamMetricsFor,
} from '../data/mockData';
import { CATEGORIES } from '../lib/constants';
import { todayInBusinessTz } from '../lib/dates';
import { isValidJsid, makeDefaultPassword, normalizeJsid } from '../lib/jsid';
import type {
  AppUser,
  ApprovedCustomTask,
  AuditAction,
  AuditEvent,
  CustomTaskProposal,
  DailyCompletion,
  DailyTaskTemplate,
  LeaveRequest,
  NotificationItem,
  PasswordResetRequest,
  ReportRow,
  SelfRegistrationRequest,
  TaskAssignment,
  TaskLibraryItem,
  TaskLog,
  TaskStatus,
  TeamMetric,
} from '../types';

interface LogTaskPayload {
  employeeId: string;
  taskId: string;
  status: TaskStatus;
  notes?: string;
  proofUrl?: string;
  projectTag?: string;
}

interface WorkTrackDataValue {
  users: AppUser[];
  taskLibrary: TaskLibraryItem[];
  approvedCustomTasks: ApprovedCustomTask[];
  taskLogs: TaskLog[];
  proposals: CustomTaskProposal[];
  leaves: LeaveRequest[];
  registrationRequests: SelfRegistrationRequest[];
  passwordResetRequests: PasswordResetRequest[];
  notifications: NotificationItem[];
  auditEvents: AuditEvent[];
  visibleUsersFor: (viewer: AppUser) => AppUser[];
  teamMetricsForUser: (viewer: AppUser) => TeamMetric[];
  reportRowsForUser: (viewer: AppUser) => ReportRow[];
  logTask: (payload: LogTaskPayload) => void;
  proposeTask: (employee: AppUser, payload: { taskName: string; description: string; category: string; proposedTime: number }) => void;
  applyLeave: (employee: AppUser, payload: { startDate: string; endDate: string; leaveType: LeaveRequest['leave_type']; reason: string }) => void;
  reviewProposal: (actor: AppUser, proposalId: string, approve: boolean, note?: string) => void;
  reviewLeave: (actor: AppUser, leaveId: string, approve: boolean, note?: string) => void;
  markNotificationRead: (id: string) => void;
  sendBroadcast: (actor: AppUser, message: string, target: 'all' | 'employee' | 'team_lead' | 'manager' | 'super_admin') => number;
  addLibraryTask: (actor: AppUser, payload: { name: string; category: string; platformTag: string; timeMinutes: number }) => void;
  updateLibraryTask: (actor: AppUser, taskId: string, timeMinutes: number) => void;
  softDeleteTask: (actor: AppUser, taskId: string) => void;
  createUser: (actor: AppUser, payload: { name: string; role: AppUser['role']; department: string; managerId?: string; teamLeadId?: string }) => { jsid: string; password: string };
  submitRegistrationRequest: (payload: { name: string; department: string; requestedRole?: AppUser['role'] }) => void;
  approveRegistration: (actor: AppUser, requestId: string, payload: { role: AppUser['role']; department: string; managerId?: string; teamLeadId?: string }) => { jsid: string; password: string };
  rejectRegistration: (actor: AppUser, requestId: string, note?: string) => void;
  submitPasswordResetRequest: (jsid: string) => void;
  deactivateUser: (actor: AppUser, targetId: string) => { blocked: boolean; reason?: string };
  reactivateUser: (actor: AppUser, targetId: string) => { blocked: boolean; reason?: string };
  resetPassword: (actor: AppUser, targetId: string) => string;
  dailyTemplates: DailyTaskTemplate[];
  dailyCompletions: DailyCompletion[];
  taskAssignments: TaskAssignment[];
  addDailyTemplate: (actor: AppUser, payload: { taskLibraryId: string; taskName: string; category: string; platformTag: string | null; timeMinutes: number; assignedTo: string; assignedName: string }) => void;
  removeDailyTemplate: (actor: AppUser, templateId: string) => void;
  markDailyCompletion: (employee: AppUser, templateId: string, date: string, isDone: boolean) => void;
  assignTask: (actor: AppUser, payload: { taskLibraryId: string; taskName: string; employeeId: string; employeeName: string; dueDate: string; notes: string }) => void;
}

const WorkTrackDataContext = createContext<WorkTrackDataValue | null>(null);

function id(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function nextJsid(users: AppUser[]): string {
  const max = users.reduce((highest, user) => {
    const number = Number(user.jsid.replace('JS', ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `JS${String(max + 1).padStart(4, '0')}`;
}

export function WorkTrackDataProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(demoUsers);
  const [taskLibrary, setTaskLibrary] = useState<TaskLibraryItem[]>(demoTaskLibrary);
  const [approvedCustomTasks, setApprovedCustomTasks] = useState<ApprovedCustomTask[]>(demoApprovedCustomTasks);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>(demoTaskLogs);
  const [proposals, setProposals] = useState<CustomTaskProposal[]>(demoProposals);
  const [leaves, setLeaves] = useState<LeaveRequest[]>(demoLeaves);
  const [registrationRequests, setRegistrationRequests] = useState<SelfRegistrationRequest[]>(demoRegistrationRequests);
  const [passwordResetRequests, setPasswordResetRequests] = useState<PasswordResetRequest[]>(demoPasswordResetRequests);
  const [notifications, setNotifications] = useState<NotificationItem[]>(demoNotifications);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(demoAuditEvents);
  const [dailyTemplates, setDailyTemplates] = useState<DailyTaskTemplate[]>([]);
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletion[]>([]);
  const [taskAssignments, setTaskAssignments] = useState<TaskAssignment[]>([]);

  const addAudit = (actor: AppUser, action: AuditAction, targetName: string, metadata: Record<string, unknown> = {}) => {
    setAuditEvents((current) => [
      {
        id: id('audit'),
        actor_id: actor.id,
        actor_name: actor.name,
        target_id: null,
        target_name: targetName,
        action,
        metadata,
        created_at: new Date().toISOString(),
      },
      ...current,
    ]);
  };

  const notifySuperAdmins = useCallback((message: string, type: NotificationItem['type'] = 'security') => {
    const superAdmins = users.filter((candidate) => candidate.role === 'super_admin' && candidate.status === 'active');
    if (!superAdmins.length) {
      return;
    }
    setNotifications((current) => [
      ...superAdmins.map<NotificationItem>((admin) => ({
        id: id('note'),
        user_id: admin.id,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
      })),
      ...current,
    ]);
  }, [users]);

  const value = useMemo<WorkTrackDataValue>(
    () => ({
      users,
      taskLibrary,
      approvedCustomTasks,
      taskLogs,
      proposals,
      leaves,
      registrationRequests,
      passwordResetRequests,
      notifications,
      auditEvents,
      visibleUsersFor: (viewer) => getVisibleUsers(viewer, users),
      teamMetricsForUser: (viewer) => teamMetricsFor(viewer, users, taskLogs),
      reportRowsForUser: (viewer) => reportRowsFor(viewer, users, taskLogs),
      logTask: (payload) => {
        const [source, sourceId] = payload.taskId.includes(':') ? payload.taskId.split(':') : ['library', payload.taskId];
        const selected = source === 'custom'
          ? approvedCustomTasks.find((task) => task.id === sourceId && task.employee_id === payload.employeeId)
          : taskLibrary.find((task) => task.id === sourceId);
        if (!selected) {
          throw new Error('Select a valid task.');
        }
        const log: TaskLog = {
          id: id('log'),
          employee_id: payload.employeeId,
          task_library_id: source === 'custom' ? null : selected.id,
          approved_custom_task_id: source === 'custom' ? selected.id : null,
          task_name: 'name' in selected ? selected.name : selected.task_name,
          category: selected.category,
          platform_tag: 'platform_tag' in selected ? selected.platform_tag : 'Custom',
          task_time_snapshot: selected.time_minutes,
          status: payload.status,
          notes: payload.notes ?? null,
          proof_url: payload.proofUrl ?? null,
          project_tag: payload.projectTag ?? null,
          logged_at: new Date().toISOString(),
          is_custom: source === 'custom',
        };
        setTaskLogs((current) => [log, ...current]);
      },
      proposeTask: (employee, payload) => {
        const proposal: CustomTaskProposal = {
          id: id('proposal'),
          employee_id: employee.id,
          employee_name: employee.name,
          task_name: payload.taskName,
          description: payload.description,
          category: payload.category || CATEGORIES[0],
          proposed_time: payload.proposedTime,
          status: 'pending_tl',
          reviewed_by: null,
          review_note: null,
          created_at: new Date().toISOString(),
        };
        setProposals((current) => [proposal, ...current]);
      },
      applyLeave: (employee, payload) => {
        const leave: LeaveRequest = {
          id: id('leave'),
          employee_id: employee.id,
          employee_name: employee.name,
          start_date: payload.startDate,
          end_date: payload.endDate,
          leave_type: payload.leaveType,
          reason: payload.reason,
          status: 'pending_tl',
          reviewed_by: null,
          override_by: null,
          created_at: new Date().toISOString(),
        };
        setLeaves((current) => [leave, ...current]);
      },
      reviewProposal: (actor, proposalId, approve, note) => {
        setProposals((current) =>
          current.map((proposal) => {
            if (proposal.id !== proposalId) {
              return proposal;
            }
            const status = approve
              ? proposal.status === 'pending_tl' && actor.role === 'team_lead'
                ? 'pending_manager'
                : 'approved'
              : 'rejected';
            if (status === 'approved') {
              setApprovedCustomTasks((customTasks) => [
                {
                  id: id('custom'),
                  employee_id: proposal.employee_id,
                  task_name: proposal.task_name,
                  category: proposal.category,
                  time_minutes: proposal.proposed_time,
                  approved_at: new Date().toISOString(),
                },
                ...customTasks,
              ]);
            }
            return { ...proposal, status, reviewed_by: actor.id, review_note: note ?? null };
          }),
        );
        addAudit(actor, 'proposal_reviewed', proposalId, { approve, note });
      },
      reviewLeave: (actor, leaveId, approve, note) => {
        setLeaves((current) =>
          current.map((leave) => {
            if (leave.id !== leaveId) {
              return leave;
            }
            const status = approve
              ? leave.status === 'pending_tl' && actor.role === 'team_lead'
                ? 'pending_manager'
                : 'approved'
              : 'rejected';
            return { ...leave, status, reviewed_by: actor.id, review_note: note ?? null };
          }),
        );
        addAudit(actor, 'leave_reviewed', leaveId, { approve, note });
      },
      markNotificationRead: (notificationId) => {
        setNotifications((current) => current.map((note) => (note.id === notificationId ? { ...note, is_read: true } : note)));
      },
      sendBroadcast: (actor, message, target) => {
        const recipients = users.filter((candidate) => candidate.status === 'active' && (target === 'all' || candidate.role === target));
        setNotifications((current) => [
          ...recipients.map<NotificationItem>((recipient) => ({
            id: id('note'),
            user_id: recipient.id,
            message,
            type: 'broadcast',
            is_read: false,
            created_at: new Date().toISOString(),
          })),
          ...current,
        ]);
        addAudit(actor, 'broadcast_sent', 'Broadcast', { target, recipient_count: recipients.length });
        return recipients.length;
      },
      addLibraryTask: (actor, payload) => {
        setTaskLibrary((current) => [
          {
            id: id('task'),
            name: payload.name,
            category: payload.category,
            platform_tag: payload.platformTag || null,
            time_minutes: payload.timeMinutes,
            effective_from_date: todayInBusinessTz(),
            is_deleted: false,
            updated_at: new Date().toISOString(),
          },
          ...current,
        ]);
        addAudit(actor, 'task_library_changed', payload.name, { type: 'created' });
      },
      updateLibraryTask: (actor, taskId, timeMinutes) => {
        setTaskLibrary((current) =>
          current.map((task) =>
            task.id === taskId
              ? { ...task, time_minutes: timeMinutes, effective_from_date: todayInBusinessTz(), updated_at: new Date().toISOString() }
              : task,
          ),
        );
        addAudit(actor, 'task_library_changed', taskId, { type: 'time_updated', timeMinutes });
      },
      softDeleteTask: (actor, taskId) => {
        setTaskLibrary((current) => current.map((task) => (task.id === taskId ? { ...task, is_deleted: true } : task)));
        addAudit(actor, 'task_library_changed', taskId, { type: 'soft_deleted' });
      },
      createUser: (actor, payload) => {
        if (payload.role === 'employee' && !payload.teamLeadId) {
          throw new Error('Employees must be assigned to a Team Lead.');
        }
        if (payload.role === 'team_lead' && !payload.managerId) {
          throw new Error('Team Leads must be assigned to a Manager.');
        }
        const jsid = nextJsid(users);
        const password = makeDefaultPassword();
        const newUser: AppUser = {
          id: id('user'),
          jsid,
          auth_email: `${jsid.toLowerCase()}@worktrack.local`,
          name: payload.name,
          role: payload.role,
          department: payload.department,
          manager_id: payload.role === 'team_lead' ? payload.managerId ?? null : null,
          team_lead_id: payload.role === 'employee' ? payload.teamLeadId ?? null : null,
          status: 'active',
          created_at: new Date().toISOString(),
          first_login_done: false,
        };
        setUsers((current) => [...current, newUser]);
        addAudit(actor, 'user_created', newUser.name, { role: newUser.role, jsid });
        return { jsid, password };
      },
      submitRegistrationRequest: (payload) => {
        const name = payload.name.trim();
        const department = payload.department.trim();
        if (!name) {
          throw new Error('Enter a full name.');
        }
        if (!department) {
          throw new Error('Enter a department.');
        }
        const request: SelfRegistrationRequest = {
          id: id('registration'),
          name,
          department,
          requested_role: payload.requestedRole ?? 'employee',
          status: 'pending_tl',
          created_at: new Date().toISOString(),
          decided_by: null,
          decided_at: null,
          note: null,
        };
        setRegistrationRequests((current) => [request, ...current]);
        notifySuperAdmins('New self-registration pending approval');
      },
      approveRegistration: (actor, requestId, payload) => {
        const request = registrationRequests.find((candidate) => candidate.id === requestId);
        if (!request) {
          throw new Error('Registration request not found.');
        }
        if (payload.role === 'employee' && !payload.teamLeadId) {
          throw new Error('Employees must be assigned to a Team Lead.');
        }
        if (payload.role === 'team_lead' && !payload.managerId) {
          throw new Error('Team Leads must be assigned to a Manager.');
        }
        const jsid = nextJsid(users);
        const password = makeDefaultPassword();
        const newUser: AppUser = {
          id: id('user'),
          jsid,
          auth_email: `${jsid.toLowerCase()}@worktrack.local`,
          name: request.name,
          role: payload.role,
          department: payload.department,
          manager_id: payload.role === 'team_lead' ? payload.managerId ?? null : null,
          team_lead_id: payload.role === 'employee' ? payload.teamLeadId ?? null : null,
          status: 'active',
          created_at: new Date().toISOString(),
          first_login_done: false,
        };
        setUsers((current) => [...current, newUser]);
        setRegistrationRequests((current) =>
          current.map((candidate) =>
            candidate.id === requestId
              ? { ...candidate, status: 'approved', decided_by: actor.id, decided_at: new Date().toISOString() }
              : candidate,
          ),
        );
        addAudit(actor, 'user_created', newUser.name, { source: 'self_registration', role: newUser.role, jsid });
        return { jsid, password };
      },
      rejectRegistration: (actor, requestId, note) => {
        const request = registrationRequests.find((candidate) => candidate.id === requestId);
        setRegistrationRequests((current) =>
          current.map((candidate) =>
            candidate.id === requestId
              ? { ...candidate, status: 'rejected', decided_by: actor.id, decided_at: new Date().toISOString(), note: note ?? null }
              : candidate,
          ),
        );
        if (request) {
          addAudit(actor, 'override', request.name, { type: 'registration_rejected', note });
        }
      },
      submitPasswordResetRequest: (jsidInput) => {
        const jsid = normalizeJsid(jsidInput);
        if (!isValidJsid(jsid)) {
          throw new Error('Enter a valid JSID (e.g., JS0001 or JS21587).');
        }
        const target = users.find((candidate) => candidate.jsid === jsid && candidate.status === 'active');
        if (!target) {
          return;
        }
        const existing = passwordResetRequests.find(
          (request) => request.user_id === target.id && request.resolved_at === null,
        );
        if (existing) {
          return;
        }
        const request: PasswordResetRequest = {
          id: id('reset'),
          jsid: target.jsid,
          user_id: target.id,
          status: 'pending_tl',
          created_at: new Date().toISOString(),
          resolved_at: null,
          resolved_by: null,
        };
        setPasswordResetRequests((current) => [request, ...current]);
        notifySuperAdmins(`Password reset requested for ${target.jsid}`);
      },
      deactivateUser: (actor, targetId) => {
        const target = users.find((candidate) => candidate.id === targetId);
        if (!target) {
          return { blocked: true, reason: 'User not found.' };
        }
        if (target.role === 'team_lead' && users.some((candidate) => candidate.status === 'active' && candidate.team_lead_id === targetId)) {
          return { blocked: true, reason: 'Reassign active employees before deactivating this Team Lead.' };
        }
        if (target.role === 'manager' && users.some((candidate) => candidate.status === 'active' && candidate.manager_id === targetId)) {
          return { blocked: true, reason: 'Reassign active Team Leads before deactivating this Manager.' };
        }
        setUsers((current) => current.map((candidate) => (candidate.id === targetId ? { ...candidate, status: 'inactive' } : candidate)));
        addAudit(actor, 'user_deactivated', target.name, {});
        return { blocked: false };
      },
      reactivateUser: (actor, targetId) => {
        const target = users.find((candidate) => candidate.id === targetId);
        if (!target) {
          return { blocked: true, reason: 'User not found.' };
        }
        if (target.role === 'employee' && !target.team_lead_id) {
          return { blocked: true, reason: 'Assign a Team Lead before reactivating this employee.' };
        }
        if (target.role === 'team_lead' && !target.manager_id) {
          return { blocked: true, reason: 'Assign a Manager before reactivating this Team Lead.' };
        }
        setUsers((current) => current.map((candidate) => (candidate.id === targetId ? { ...candidate, status: 'active' } : candidate)));
        addAudit(actor, 'user_reactivated', target.name, {});
        return { blocked: false };
      },
      resetPassword: (actor, targetId) => {
        const target = users.find((candidate) => candidate.id === targetId);
        if (!target) {
          throw new Error('User not found.');
        }
        const password = makeDefaultPassword();
        setUsers((current) => current.map((candidate) => (candidate.id === targetId ? { ...candidate, first_login_done: false } : candidate)));
        setPasswordResetRequests((current) =>
          current.map((request) =>
            request.user_id === targetId && request.resolved_at === null
              ? {
                  ...request,
                  status: 'approved',
                  resolved_at: new Date().toISOString(),
                  resolved_by: actor.id,
                }
              : request,
          ),
        );
        addAudit(actor, 'password_reset', target.name, {});
        return password;
      },
      dailyTemplates,
      dailyCompletions,
      taskAssignments,
      addDailyTemplate: (actor, payload) => {
        const template: DailyTaskTemplate = {
          id: id('daily-tmpl'),
          task_library_id: payload.taskLibraryId,
          task_name: payload.taskName,
          category: payload.category,
          platform_tag: payload.platformTag,
          time_minutes: payload.timeMinutes,
          assigned_to: payload.assignedTo,
          assigned_name: payload.assignedName,
          created_at: new Date().toISOString(),
          is_active: true,
        };
        setDailyTemplates((current) => [template, ...current]);
        addAudit(actor, 'task_library_changed', payload.taskName, { type: 'daily_template_created', assigned_to: payload.assignedTo });
      },
      removeDailyTemplate: (actor, templateId) => {
        setDailyTemplates((current) => current.map((t) => t.id === templateId ? { ...t, is_active: false } : t));
        addAudit(actor, 'task_library_changed', templateId, { type: 'daily_template_removed' });
      },
      markDailyCompletion: (employee, templateId, date, isDone) => {
        const template = dailyTemplates.find((t) => t.id === templateId);
        if (!template) return;
        const existing = dailyCompletions.find(
          (c) => c.template_id === templateId && c.employee_id === employee.id && c.date === date,
        );
        if (existing) {
          setDailyCompletions((current) =>
            current.map((c) =>
              c.id === existing.id
                ? { ...c, is_done: isDone, completed_at: isDone ? new Date().toISOString() : null }
                : c,
            ),
          );
        } else {
          setDailyCompletions((current) => [
            { id: id('daily-done'), template_id: templateId, employee_id: employee.id, date, is_done: isDone, completed_at: isDone ? new Date().toISOString() : null },
            ...current,
          ]);
        }
        if (isDone) {
          const alreadyLogged = taskLogs.some(
            (log) => log.employee_id === employee.id && log.task_library_id === template.task_library_id && log.logged_at.startsWith(date),
          );
          if (!alreadyLogged) {
            setTaskLogs((current) => [
              {
                id: id('log'),
                employee_id: employee.id,
                task_library_id: template.task_library_id,
                approved_custom_task_id: null,
                task_name: template.task_name,
                category: template.category,
                platform_tag: template.platform_tag,
                task_time_snapshot: template.time_minutes,
                status: 'done' as const,
                notes: 'Daily task',
                proof_url: null,
                project_tag: null,
                logged_at: new Date().toISOString(),
                is_custom: false,
              },
              ...current,
            ]);
          }
        }
      },
      assignTask: (actor, payload) => {
        setTaskAssignments((current) => [
          {
            id: id('assign'),
            task_library_id: payload.taskLibraryId,
            task_name: payload.taskName,
            employee_id: payload.employeeId,
            employee_name: payload.employeeName,
            due_date: payload.dueDate,
            notes: payload.notes,
            assigned_at: new Date().toISOString(),
          },
          ...current,
        ]);
        addAudit(actor, 'task_library_changed', payload.taskName, { type: 'task_assigned', assigned_to: payload.employeeId });
      },
    }),
    [
      approvedCustomTasks,
      auditEvents,
      dailyCompletions,
      dailyTemplates,
      leaves,
      notifications,
      passwordResetRequests,
      proposals,
      registrationRequests,
      taskAssignments,
      taskLibrary,
      taskLogs,
      notifySuperAdmins,
      users,
    ],
  );

  return <WorkTrackDataContext.Provider value={value}>{children}</WorkTrackDataContext.Provider>;
}

export function useWorkTrackData() {
  const context = useContext(WorkTrackDataContext);
  if (!context) {
    throw new Error('useWorkTrackData must be used within WorkTrackDataProvider');
  }
  return context;
}
