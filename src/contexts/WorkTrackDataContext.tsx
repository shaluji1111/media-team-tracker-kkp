/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState, useEffect } from 'react';

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
import { isTursoConfigured, turso } from '../lib/turso';
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
  ProposalStatus,
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
  logTask: (payload: LogTaskPayload) => Promise<void>;
  proposeTask: (employee: AppUser, payload: { taskName: string; description: string; category: string; proposedTime: number }) => Promise<void>;
  applyLeave: (employee: AppUser, payload: { startDate: string; endDate: string; leaveType: LeaveRequest['leave_type']; reason: string }) => Promise<void>;
  reviewProposal: (actor: AppUser, proposalId: string, approve: boolean, note?: string) => Promise<void>;
  reviewLeave: (actor: AppUser, leaveId: string, approve: boolean, note?: string) => Promise<void>;
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
  markDailyCompletion: (employee: AppUser, templateId: string, date: string, isDone: boolean) => Promise<void>;
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

type DbRow = Record<string, unknown>;

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function dbBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === '1' || value === 'true';
}

function mapUser(row: DbRow): AppUser {
  return {
    id: String(row.id),
    jsid: String(row.jsid),
    auth_email: nullableString(row.auth_email) ?? undefined,
    name: String(row.name),
    role: String(row.role) as AppUser['role'],
    department: String(row.department),
    manager_id: nullableString(row.manager_id),
    team_lead_id: nullableString(row.team_lead_id),
    status: String(row.status) as AppUser['status'],
    created_at: String(row.created_at),
    first_login_done: dbBoolean(row.first_login_done),
  };
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

  useEffect(() => {
    async function loadFromTurso() {
      if (!isTursoConfigured || !turso) {
        return;
      }
      try {
        const [
          usersRes,
          taskLibraryRes,
          taskLogsRes,
          proposalsRes,
          approvedRes,
          leavesRes,
          dailyTemplatesRes,
          dailyCompletionsRes,
          taskAssignmentsRes,
          auditEventsRes,
        ] = await Promise.all([
          turso.execute('SELECT * FROM users ORDER BY created_at ASC'),
          turso.execute('SELECT * FROM task_library ORDER BY updated_at DESC'),
          turso.execute('SELECT * FROM task_logs ORDER BY logged_at DESC'),
          turso.execute('SELECT * FROM custom_task_proposals ORDER BY created_at DESC'),
          turso.execute('SELECT * FROM approved_custom_tasks ORDER BY approved_at DESC'),
          turso.execute('SELECT * FROM leave_requests ORDER BY created_at DESC'),
          turso.execute('SELECT * FROM daily_templates ORDER BY created_at DESC'),
          turso.execute('SELECT * FROM daily_completions ORDER BY completed_at DESC'),
          turso.execute('SELECT * FROM task_assignments ORDER BY assigned_at DESC'),
          turso.execute('SELECT * FROM audit_events ORDER BY created_at DESC'),
        ]);

        const usersRows = usersRes.rows.map((row) => mapUser(row as DbRow));
        if (usersRows.length > 0) {
          setUsers(usersRows);
        }

        const taskLibraryRows = taskLibraryRes.rows.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          category: String(row.category),
          platform_tag: nullableString(row.platform_tag),
          time_minutes: Number(row.time_minutes),
          effective_from_date: String(row.effective_from_date),
          is_deleted: dbBoolean(row.is_deleted),
          updated_at: String(row.updated_at),
        }));
        if (taskLibraryRows.length > 0) {
          setTaskLibrary(taskLibraryRows);
        }

        const taskLogRows = taskLogsRes.rows.map((row) => ({
          id: String(row.id),
          employee_id: String(row.employee_id),
          task_library_id: nullableString(row.task_library_id),
          approved_custom_task_id: nullableString(row.approved_custom_task_id),
          task_name: String(row.task_name),
          category: String(row.category),
          platform_tag: nullableString(row.platform_tag),
          task_time_snapshot: Number(row.task_time_snapshot),
          status: String(row.status) as TaskStatus,
          notes: nullableString(row.notes),
          proof_url: nullableString(row.proof_url),
          project_tag: nullableString(row.project_tag),
          logged_at: String(row.logged_at),
          is_custom: dbBoolean(row.is_custom),
        }));
        setTaskLogs(taskLogRows);

        const proposalsRows = proposalsRes.rows.map(row => ({
          id: String(row.id),
          employee_id: String(row.employee_id),
          employee_name: String(row.employee_name),
          task_name: String(row.task_name),
          description: String(row.description),
          category: String(row.category),
          proposed_time: Number(row.proposed_time),
          status: String(row.status) as ProposalStatus,
          reviewed_by: row.reviewed_by ? String(row.reviewed_by) : null,
          review_note: row.review_note ? String(row.review_note) : null,
          created_at: String(row.created_at)
        }));
        setProposals(proposalsRows);

        const approvedRows = approvedRes.rows.map(row => ({
          id: String(row.id),
          employee_id: String(row.employee_id),
          task_name: String(row.task_name),
          category: String(row.category),
          time_minutes: Number(row.time_minutes),
          approved_at: String(row.approved_at),
          is_deleted: dbBoolean(row.is_deleted),
        }));
        setApprovedCustomTasks(approvedRows);

        setLeaves(leavesRes.rows.map((row) => ({
          id: String(row.id),
          employee_id: String(row.employee_id),
          employee_name: String(row.employee_name),
          start_date: String(row.start_date),
          end_date: String(row.end_date),
          leave_type: String(row.leave_type) as LeaveRequest['leave_type'],
          reason: String(row.reason),
          status: String(row.status) as LeaveRequest['status'],
          reviewed_by: nullableString(row.reviewed_by),
          override_by: nullableString(row.override_by),
          created_at: String(row.created_at),
        })));

        setDailyTemplates(dailyTemplatesRes.rows.map((row) => ({
          id: String(row.id),
          task_library_id: String(row.task_library_id),
          task_name: String(row.task_name),
          category: String(row.category),
          platform_tag: nullableString(row.platform_tag),
          time_minutes: Number(row.time_minutes),
          assigned_to: String(row.assigned_to),
          assigned_name: String(row.assigned_name),
          created_at: String(row.created_at),
          is_active: dbBoolean(row.is_active),
        })));

        setDailyCompletions(dailyCompletionsRes.rows.map((row) => ({
          id: String(row.id),
          template_id: String(row.template_id),
          employee_id: String(row.employee_id),
          date: String(row.date),
          is_done: dbBoolean(row.is_done),
          completed_at: nullableString(row.completed_at),
        })));

        setTaskAssignments(taskAssignmentsRes.rows.map((row) => ({
          id: String(row.id),
          task_library_id: String(row.task_library_id),
          task_name: String(row.task_name),
          employee_id: String(row.employee_id),
          employee_name: String(row.employee_name),
          due_date: nullableString(row.due_date) ?? '',
          notes: nullableString(row.notes) ?? '',
          assigned_at: String(row.assigned_at),
        })));

        setAuditEvents(auditEventsRes.rows.map((row) => ({
          id: String(row.id),
          actor_id: nullableString(row.actor_id),
          actor_name: String(row.actor_name),
          target_id: nullableString(row.target_id),
          target_name: String(row.target_name),
          action: String(row.action) as AuditAction,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) as Record<string, unknown> : {},
          created_at: String(row.created_at),
        })));
      } catch (err) {
        console.error('Failed to load WorkTrack data from Turso:', err);
      }
    }
    loadFromTurso();
    const interval = setInterval(loadFromTurso, 10000);
    return () => clearInterval(interval);
  }, []);

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
      logTask: async (payload) => {
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
        if (isTursoConfigured && turso) {
          await turso.execute({
            sql: `INSERT INTO task_logs (
              id, employee_id, task_library_id, approved_custom_task_id, task_name, category, platform_tag,
              task_time_snapshot, status, notes, proof_url, project_tag, logged_at, is_custom
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              log.id,
              log.employee_id,
              log.task_library_id ?? null,
              log.approved_custom_task_id ?? null,
              log.task_name,
              log.category,
              log.platform_tag ?? null,
              log.task_time_snapshot,
              log.status,
              log.notes,
              log.proof_url,
              log.project_tag,
              log.logged_at,
              log.is_custom ? 1 : 0,
            ],
          });
        }
      },
      proposeTask: async (employee, payload) => {
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
        
        // Optimistically update UI
        setProposals((current) => [proposal, ...current]);

        if (isTursoConfigured && turso) {
          try {
            await turso.execute({
            sql: `INSERT INTO custom_task_proposals (id, employee_id, employee_name, task_name, description, category, proposed_time, status, created_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
              proposal.id,
              proposal.employee_id,
              proposal.employee_name,
              proposal.task_name,
              proposal.description,
              proposal.category,
              proposal.proposed_time,
              proposal.status,
              proposal.created_at
            ]
            });
          } catch (err) {
            setProposals((current) => current.filter((item) => item.id !== proposal.id));
            console.error('Failed to save custom task proposal to Turso:', err);
            throw err;
          }
        }
      },
      applyLeave: async (employee, payload) => {
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
        if (isTursoConfigured && turso) {
          try {
            await turso.execute({
              sql: `INSERT INTO leave_requests (
                id, employee_id, employee_name, start_date, end_date, leave_type, reason, status,
                reviewed_by, override_by, created_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              args: [
                leave.id,
                leave.employee_id,
                leave.employee_name,
                leave.start_date,
                leave.end_date,
                leave.leave_type,
                leave.reason,
                leave.status,
                leave.reviewed_by,
                leave.override_by,
                leave.created_at,
              ],
            });
          } catch (err) {
            setLeaves((current) => current.filter((item) => item.id !== leave.id));
            console.error('Failed to save leave request to Turso:', err);
            throw err;
          }
        }
      },
      reviewProposal: async (actor, proposalId, approve, note) => {
        const proposal = proposals.find(p => p.id === proposalId);
        if (!proposal) return;

        const finalStatus: CustomTaskProposal['status'] = approve
          ? proposal.status === 'pending_tl' && actor.role === 'team_lead'
            ? 'pending_manager'
            : 'approved'
          : 'rejected';
          
        const existingApprovedTask = approvedCustomTasks.find(
          (task) =>
            task.employee_id === proposal.employee_id &&
            task.task_name === proposal.task_name &&
            task.category === proposal.category &&
            !task.is_deleted,
        );
        let customTaskDetails: ApprovedCustomTask | null = null;
        if (finalStatus === 'approved' && !existingApprovedTask) {
          customTaskDetails = {
            id: id('custom'),
            employee_id: proposal.employee_id,
            task_name: proposal.task_name,
            category: proposal.category,
            time_minutes: proposal.proposed_time,
            approved_at: new Date().toISOString(),
            is_deleted: false,
          };
          setApprovedCustomTasks((customTasks) => [customTaskDetails as ApprovedCustomTask, ...customTasks]);
        }

        const reviewNote = note ?? null;
        
        setProposals((current) =>
          current.map((p) => {
            if (p.id !== proposalId) return p;
            return { ...p, status: finalStatus, reviewed_by: actor.id, review_note: reviewNote };
          })
        );
        addAudit(actor, 'proposal_reviewed', proposalId, { approve, note });

        if (isTursoConfigured && turso) {
          try {
            await turso.execute({
            sql: 'UPDATE custom_task_proposals SET status = ?, reviewed_by = ?, review_note = ? WHERE id = ?',
            args: [finalStatus, actor.id, reviewNote, proposalId]
            });

            if (finalStatus === 'approved' && customTaskDetails) {
              const task = customTaskDetails as ApprovedCustomTask;
              await turso.execute({
                sql: 'INSERT INTO approved_custom_tasks (id, employee_id, task_name, category, time_minutes, approved_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [
                  task.id,
                  task.employee_id,
                  task.task_name,
                  task.category,
                  task.time_minutes,
                  task.approved_at,
                  0,
                ],
              });
            }
          } catch (err) {
            console.error('Failed to update review status in Turso:', err);
            throw err;
          }
        }
      },
      reviewLeave: async (actor, leaveId, approve, note) => {
        const leave = leaves.find((candidate) => candidate.id === leaveId);
        if (!leave) return;
        const status = approve
          ? leave.status === 'pending_tl' && actor.role === 'team_lead'
            ? 'pending_manager'
            : 'approved'
          : 'rejected';
        setLeaves((current) =>
          current.map((leave) => {
            if (leave.id !== leaveId) {
              return leave;
            }
            return { ...leave, status, reviewed_by: actor.id };
          }),
        );
        addAudit(actor, 'leave_reviewed', leaveId, { approve, note });
        if (isTursoConfigured && turso) {
          try {
            await turso.execute({
              sql: 'UPDATE leave_requests SET status = ?, reviewed_by = ? WHERE id = ?',
              args: [status, actor.id, leaveId],
            });
          } catch (err) {
            console.error('Failed to update leave request in Turso:', err);
            throw err;
          }
        }
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
        const task: TaskLibraryItem = {
          id: id('task'),
          name: payload.name,
          category: payload.category,
          platform_tag: payload.platformTag || null,
          time_minutes: payload.timeMinutes,
          effective_from_date: todayInBusinessTz(),
          is_deleted: false,
          updated_at: new Date().toISOString(),
        };
        setTaskLibrary((current) => [
          task,
          ...current,
        ]);
        if (isTursoConfigured && turso) {
          void turso.execute({
            sql: 'INSERT INTO task_library (id, name, category, platform_tag, time_minutes, effective_from_date, is_deleted, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [task.id, task.name, task.category, task.platform_tag, task.time_minutes, task.effective_from_date, 0, task.updated_at],
          }).catch((err) => console.error('Failed to save task library item to Turso:', err));
        }
        addAudit(actor, 'task_library_changed', payload.name, { type: 'created' });
      },
      updateLibraryTask: (actor, taskId, timeMinutes) => {
        const updatedAt = new Date().toISOString();
        const effectiveFromDate = todayInBusinessTz();
        setTaskLibrary((current) =>
          current.map((task) =>
            task.id === taskId
              ? { ...task, time_minutes: timeMinutes, effective_from_date: effectiveFromDate, updated_at: updatedAt }
              : task,
          ),
        );
        if (isTursoConfigured && turso) {
          void turso.execute({
            sql: 'UPDATE task_library SET time_minutes = ?, effective_from_date = ?, updated_at = ? WHERE id = ?',
            args: [timeMinutes, effectiveFromDate, updatedAt, taskId],
          }).catch((err) => console.error('Failed to update task library item in Turso:', err));
        }
        addAudit(actor, 'task_library_changed', taskId, { type: 'time_updated', timeMinutes });
      },
      softDeleteTask: (actor, taskId) => {
        setTaskLibrary((current) => current.map((task) => (task.id === taskId ? { ...task, is_deleted: true } : task)));
        if (isTursoConfigured && turso) {
          void turso.execute({
            sql: 'UPDATE task_library SET is_deleted = ?, updated_at = ? WHERE id = ?',
            args: [1, new Date().toISOString(), taskId],
          }).catch((err) => console.error('Failed to delete task library item in Turso:', err));
        }
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
        if (isTursoConfigured && turso) {
          void turso.execute({
            sql: 'INSERT INTO daily_templates (id, task_library_id, task_name, category, platform_tag, time_minutes, assigned_to, assigned_name, created_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            args: [
              template.id,
              template.task_library_id,
              template.task_name,
              template.category,
              template.platform_tag,
              template.time_minutes,
              template.assigned_to,
              template.assigned_name,
              template.created_at,
              1,
            ],
          }).catch((err) => console.error('Failed to save daily template to Turso:', err));
        }
        addAudit(actor, 'task_library_changed', payload.taskName, { type: 'daily_template_created', assigned_to: payload.assignedTo });
      },
      removeDailyTemplate: (actor, templateId) => {
        setDailyTemplates((current) => current.map((t) => t.id === templateId ? { ...t, is_active: false } : t));
        if (isTursoConfigured && turso) {
          void turso.execute({
            sql: 'UPDATE daily_templates SET is_active = ? WHERE id = ?',
            args: [0, templateId],
          }).catch((err) => console.error('Failed to remove daily template in Turso:', err));
        }
        addAudit(actor, 'task_library_changed', templateId, { type: 'daily_template_removed' });
      },
      markDailyCompletion: async (employee, templateId, date, isDone) => {
        const template = dailyTemplates.find((t) => t.id === templateId);
        if (!template) return;
        const existing = dailyCompletions.find(
          (c) => c.template_id === templateId && c.employee_id === employee.id && c.date === date,
        );
        const completedAt = isDone ? new Date().toISOString() : null;
        if (existing) {
          setDailyCompletions((current) =>
            current.map((c) =>
              c.id === existing.id
                ? { ...c, is_done: isDone, completed_at: completedAt }
                : c,
            ),
          );
          if (isTursoConfigured && turso) {
            await turso.execute({
              sql: 'UPDATE daily_completions SET is_done = ?, completed_at = ? WHERE id = ?',
              args: [isDone ? 1 : 0, completedAt, existing.id],
            });
          }
        } else {
          const completion: DailyCompletion = {
            id: id('daily-done'),
            template_id: templateId,
            employee_id: employee.id,
            date,
            is_done: isDone,
            completed_at: completedAt,
          };
          setDailyCompletions((current) => [
            completion,
            ...current,
          ]);
          if (isTursoConfigured && turso) {
            await turso.execute({
              sql: 'INSERT INTO daily_completions (id, template_id, employee_id, date, is_done, completed_at) VALUES (?, ?, ?, ?, ?, ?)',
              args: [completion.id, completion.template_id, completion.employee_id, completion.date, completion.is_done ? 1 : 0, completion.completed_at],
            });
          }
        }
        if (isDone) {
          const alreadyLogged = taskLogs.some(
            (log) => log.employee_id === employee.id && log.task_library_id === template.task_library_id && log.logged_at.startsWith(date),
          );
          if (!alreadyLogged) {
            const log: TaskLog = {
              id: id('log'),
              employee_id: employee.id,
              task_library_id: template.task_library_id,
              approved_custom_task_id: null,
              task_name: template.task_name,
              category: template.category,
              platform_tag: template.platform_tag,
              task_time_snapshot: template.time_minutes,
              status: 'done',
              notes: 'Daily task',
              proof_url: null,
              project_tag: null,
              logged_at: new Date().toISOString(),
              is_custom: false,
            };
            setTaskLogs((current) => [
              log,
              ...current,
            ]);
            if (isTursoConfigured && turso) {
              await turso.execute({
                sql: `INSERT INTO task_logs (
                  id, employee_id, task_library_id, approved_custom_task_id, task_name, category, platform_tag,
                  task_time_snapshot, status, notes, proof_url, project_tag, logged_at, is_custom
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                  log.id,
                  log.employee_id,
                  log.task_library_id ?? null,
                  log.approved_custom_task_id ?? null,
                  log.task_name,
                  log.category,
                  log.platform_tag ?? null,
                  log.task_time_snapshot,
                  log.status,
                  log.notes,
                  log.proof_url,
                  log.project_tag,
                  log.logged_at,
                  0,
                ],
              });
            }
          }
        } else {
          const autoLog = taskLogs.find(
            (log) =>
              log.employee_id === employee.id &&
              log.task_library_id === template.task_library_id &&
              log.logged_at.startsWith(date) &&
              log.notes === 'Daily task',
          );
          setTaskLogs((current) => current.filter((log) => log.id !== autoLog?.id));
          if (autoLog && isTursoConfigured && turso) {
            await turso.execute({ sql: 'DELETE FROM task_logs WHERE id = ?', args: [autoLog.id] });
          }
        }
      },
      assignTask: (actor, payload) => {
        const assignment: TaskAssignment = {
          id: id('assign'),
          task_library_id: payload.taskLibraryId,
          task_name: payload.taskName,
          employee_id: payload.employeeId,
          employee_name: payload.employeeName,
          due_date: payload.dueDate,
          notes: payload.notes,
          assigned_at: new Date().toISOString(),
        };
        setTaskAssignments((current) => [
          assignment,
          ...current,
        ]);
        if (isTursoConfigured && turso) {
          void turso.execute({
            sql: 'INSERT INTO task_assignments (id, task_library_id, task_name, employee_id, employee_name, due_date, notes, assigned_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [
              assignment.id,
              assignment.task_library_id,
              assignment.task_name,
              assignment.employee_id,
              assignment.employee_name,
              assignment.due_date,
              assignment.notes,
              assignment.assigned_at,
            ],
          }).catch((err) => console.error('Failed to save task assignment to Turso:', err));
        }
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
