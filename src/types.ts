export type Role = 'super_admin' | 'manager' | 'team_lead' | 'employee';

export type UserStatus = 'active' | 'inactive' | 'pending';

export type TaskStatus = 'done' | 'in_progress' | 'pending';

export type ProposalStatus =
  | 'pending_tl'
  | 'pending_manager'
  | 'approved'
  | 'rejected';

export type LeaveStatus =
  | 'pending_tl'
  | 'pending_manager'
  | 'approved'
  | 'rejected';

export type LeaveType = 'sick' | 'personal' | 'other';

export type NotificationType =
  | 'proposal'
  | 'leave'
  | 'task_edit_warning'
  | 'broadcast'
  | 'security';

export type AuditAction =
  | 'user_created'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'password_reset'
  | 'task_library_changed'
  | 'proposal_reviewed'
  | 'leave_reviewed'
  | 'override'
  | 'broadcast_sent'
  | 'exported_report'
  | 'hierarchy_reassigned';

export interface AppUser {
  id: string;
  jsid: string;
  auth_email?: string;
  name: string;
  role: Role;
  department: string;
  manager_id: string | null;
  team_lead_id: string | null;
  status: UserStatus;
  created_at: string;
  first_login_done: boolean;
}

export interface TaskLibraryItem {
  id: string;
  name: string;
  category: string;
  platform_tag: string | null;
  time_minutes: number;
  effective_from_date: string;
  is_deleted: boolean;
  updated_at: string;
}

export interface ApprovedCustomTask {
  id: string;
  employee_id: string;
  task_name: string;
  category: string;
  time_minutes: number;
  approved_at: string;
  is_deleted?: boolean;
}

export interface SelfRegistrationRequest {
  id: string;
  name: string;
  department: string;
  requested_role: Role;
  status: ProposalStatus;
  created_at: string;
  decided_by: string | null;
  decided_at: string | null;
  note: string | null;
}

export interface PasswordResetRequest {
  id: string;
  jsid: string;
  user_id: string | null;
  status: ProposalStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export interface TaskLog {
  id: string;
  employee_id: string;
  task_library_id: string | null;
  approved_custom_task_id?: string | null;
  task_name: string;
  category: string;
  platform_tag: string | null;
  task_time_snapshot: number;
  status: TaskStatus;
  notes: string | null;
  proof_url: string | null;
  project_tag: string | null;
  logged_at: string;
  is_custom: boolean;
}

export interface CustomTaskProposal {
  id: string;
  employee_id: string;
  employee_name: string;
  task_name: string;
  description: string;
  category: string;
  proposed_time: number;
  status: ProposalStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  start_date: string;
  end_date: string;
  leave_type: LeaveType;
  reason: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  override_by: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
}

export interface PerformanceSnapshot {
  id: string;
  user_id: string;
  date: string;
  score: number | null;
  calculated_from: string;
}

export interface AuditEvent {
  id: string;
  actor_id: string | null;
  actor_name: string;
  target_id: string | null;
  target_name: string;
  action: AuditAction;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface TeamMetric {
  user: AppUser;
  hoursToday: number | null;
  score: number | null;
  tasksToday: number;
  status: 'on_track' | 'at_risk' | 'flagged' | 'on_leave' | 'no_data';
  childCount?: number;
}

export interface ReportRow {
  employee: AppUser;
  taskCount: number;
  totalHours: number;
  score: number | null;
  status: TeamMetric['status'];
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

export interface ReportOptions {
  period: ReportPeriod;
  date: string;
}

/** Created once by Super Admin; employee checks it off every day. */
export interface DailyTaskTemplate {
  id: string;
  task_library_id: string;
  task_name: string;
  category: string;
  platform_tag: string | null;
  time_minutes: number;
  /** employee id  OR  'all' for every active employee */
  assigned_to: string;
  assigned_name: string;
  created_at: string;
  is_active: boolean;
}

/** One record per employee per template per calendar date. */
export interface DailyCompletion {
  id: string;
  template_id: string;
  employee_id: string;
  date: string; // YYYY-MM-DD
  is_done: boolean;
  completed_at: string | null;
}

/** One-off task assigned by admin to a specific employee. */
export interface TaskAssignment {
  id: string;
  task_library_id: string;
  task_name: string;
  employee_id: string;
  employee_name: string;
  due_date: string;
  notes: string;
  assigned_at: string;
}
