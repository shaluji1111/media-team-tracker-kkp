import {
  Bell,
  Check,
  ClipboardList,
  Download,
  FileDown,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Navigate } from 'react-router-dom';

import { LogTaskModal } from './DashboardPages';
import { ApprovalBadge, ProductivityBadge, RoleBadge, TaskStatusBadge } from '../components/StatusBadge';
import { Badge, Button, Card, EmptyState, Field, Input, Modal, SectionHeader, Select, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useWorkTrackData } from '../contexts/WorkTrackDataContext';
import { CATEGORIES, PLATFORMS, ROLE_LABELS } from '../lib/constants';
import { exportCsv } from '../lib/csv';
import { formatDate, formatDateTime, todayInBusinessTz } from '../lib/dates';
import { formatHoursFromMinutes, formatScore } from '../lib/score';
import type {
  AppUser,
  CustomTaskProposal,
  LeaveRequest,
  PasswordResetRequest,
  ProposalStatus,
  ReportRow,
  Role,
  SelfRegistrationRequest,
} from '../types';

export function TasksPage() {
  const { user } = useAuth();
  const { taskLogs } = useWorkTrackData();
  const [open, setOpen] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'employee') return <Navigate to="/dashboard" replace />;
  const logs = taskLogs.filter((log) => log.employee_id === user.id);
  return (
    <>
      <SectionHeader title="Task Log" action={<Button onClick={() => setOpen(true)}><Plus size={18} />Log a Task</Button>} />
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-zinc-500">
              <tr><th className="py-3">Task</th><th>Category</th><th>Platform</th><th>Time</th><th>Status</th><th>Logged</th><th>Project</th></tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="py-3 text-white">{log.task_name}</td>
                  <td className="text-zinc-300">{log.category}</td>
                  <td className="text-zinc-300">{log.platform_tag ?? 'General'}</td>
                  <td className="text-zinc-300">{formatHoursFromMinutes(log.task_time_snapshot)}</td>
                  <td><TaskStatusBadge status={log.status} /></td>
                  <td className="text-zinc-400">{formatDateTime(log.logged_at)}</td>
                  <td className="text-zinc-300">{log.project_tag ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <LogTaskModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ProposalsPage() {
  const { user } = useAuth();
  const { proposals, proposeTask } = useWorkTrackData();
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [proposedTime, setProposedTime] = useState(60);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'employee') return <Navigate to="/approvals" replace />;
  const mine = proposals.filter((proposal) => proposal.employee_id === user.id);

  function submit(event: FormEvent) {
    event.preventDefault();
    proposeTask(user!, { taskName, description, category, proposedTime });
    setTaskName('');
    setDescription('');
    setProposedTime(60);
  }

  return (
    <>
      <SectionHeader title="Custom Task Proposals" />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Propose Custom Task</h2>
          <form className="grid gap-4" onSubmit={submit}>
            <Field label="Task name"><Input value={taskName} onChange={(event) => setTaskName(event.target.value)} required /></Field>
            <Field label="Description"><Textarea value={description} onChange={(event) => setDescription(event.target.value)} required /></Field>
            <Field label="Category">
              <Select value={category} onChange={(event) => setCategory(event.target.value)}>
                {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </Field>
            <Field label="Proposed time in minutes">
              <Input type="number" min={15} value={proposedTime} onChange={(event) => setProposedTime(Number(event.target.value))} />
            </Field>
            <Button>Submit proposal</Button>
          </form>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">My Proposals</h2>
          <div className="grid gap-3">
            {mine.map((proposal) => <ProposalCard key={proposal.id} proposal={proposal} />)}
            {!mine.length ? <EmptyState title="No proposals" body="Submitted custom tasks appear here." /> : null}
          </div>
        </Card>
      </div>
    </>
  );
}

export function LeavePage() {
  const { user } = useAuth();
  const { leaves, applyLeave, reviewLeave } = useWorkTrackData();
  const [startDate, setStartDate] = useState(todayInBusinessTz());
  const [endDate, setEndDate] = useState(todayInBusinessTz());
  const [leaveType, setLeaveType] = useState<LeaveRequest['leave_type']>('sick');
  const [reason, setReason] = useState('');
  if (!user) return <Navigate to="/login" replace />;
  const visible = user.role === 'employee' ? leaves.filter((leave) => leave.employee_id === user.id) : leaves;

  function submit(event: FormEvent) {
    event.preventDefault();
    applyLeave(user!, { startDate, endDate, leaveType, reason });
    setReason('');
  }

  return (
    <>
      <SectionHeader title={user.role === 'employee' ? 'Leave Request' : 'Leave Management'} />
      {user.role === 'employee' ? (
        <Card className="mb-5">
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            <Field label="Start date"><Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></Field>
            <Field label="End date"><Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
            <Field label="Leave type">
              <Select value={leaveType} onChange={(event) => setLeaveType(event.target.value as LeaveRequest['leave_type'])}>
                <option value="sick">Sick</option><option value="personal">Personal</option><option value="other">Other</option>
              </Select>
            </Field>
            <Field label="Reason"><Input value={reason} onChange={(event) => setReason(event.target.value)} required /></Field>
            <Button className="md:col-span-2">Apply for leave</Button>
          </form>
        </Card>
      ) : null}
      <div className="grid gap-3">
        {visible.map((leave) => (
          <Card key={leave.id}>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{leave.employee_name}</p>
                  <ApprovalBadge status={leave.status} />
                </div>
                <p className="mt-2 text-sm text-zinc-400">{formatDate(leave.start_date)} - {formatDate(leave.end_date)} · {leave.leave_type}</p>
                <p className="mt-1 text-sm text-zinc-300">{leave.reason}</p>
              </div>
              {user.role !== 'employee' && !['approved', 'rejected'].includes(leave.status) ? (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => reviewLeave(user, leave.id, true)}>Approve</Button>
                  <Button variant="danger" onClick={() => reviewLeave(user, leave.id, false)}>Reject</Button>
                </div>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, markNotificationRead } = useWorkTrackData();
  if (!user) return <Navigate to="/login" replace />;
  const mine = notifications.filter((note) => note.user_id === user.id);
  return (
    <>
      <SectionHeader title="Notifications" />
      <div className="grid gap-3">
        {mine.map((note) => (
          <Card key={note.id} className={note.is_read ? 'opacity-70' : undefined}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Bell className="mt-1 text-blue-300" size={18} />
                <div>
                  <p className="font-medium text-white">{note.message}</p>
                  <p className="mt-1 text-sm text-zinc-500">{formatDateTime(note.created_at)}</p>
                </div>
              </div>
              {!note.is_read ? <Button variant="secondary" onClick={() => markNotificationRead(note.id)}>Mark read</Button> : <Badge>Read</Badge>}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function ApprovalsPage() {
  const { user } = useAuth();
  const { proposals, leaves, reviewProposal, reviewLeave } = useWorkTrackData();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <Navigate to="/proposals" replace />;

  const pendingProposals = proposals.filter((p) => !['approved', 'rejected'].includes(p.status));
  const decidedProposals = proposals.filter((p) => ['approved', 'rejected'].includes(p.status));
  const pendingLeaves = leaves.filter((l) => !['approved', 'rejected'].includes(l.status));
  const decidedLeaves = leaves.filter((l) => ['approved', 'rejected'].includes(l.status));

  return (
    <>
      <SectionHeader title="Approvals" />
      <div className="grid gap-5 xl:grid-cols-2">
        {/* Custom Tasks */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Custom Tasks</h2>
          <div className="grid gap-3">
            {pendingProposals.map((proposal) => (
              <ApprovalActionCard
                key={proposal.id}
                title={proposal.task_name}
                subtitle={`${proposal.employee_name} · ${proposal.proposed_time} min`}
                body={proposal.description}
                status={proposal.status}
                onApprove={() => reviewProposal(user, proposal.id, true)}
                onReject={() => reviewProposal(user, proposal.id, false)}
              />
            ))}
            {!pendingProposals.length && !decidedProposals.length && (
              <p className="text-sm text-zinc-500">No custom task proposals yet.</p>
            )}
            {decidedProposals.length > 0 && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-xs font-medium text-zinc-500">Decided — Super Admin can override</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
                {decidedProposals.map((proposal) => (
                  <ApprovalActionCard
                    key={proposal.id}
                    title={proposal.task_name}
                    subtitle={`${proposal.employee_name} · ${proposal.proposed_time} min`}
                    body={proposal.description}
                    status={proposal.status}
                    isOverride
                    onApprove={() => reviewProposal(user, proposal.id, true)}
                    onReject={() => reviewProposal(user, proposal.id, false)}
                  />
                ))}
              </>
            )}
          </div>
        </Card>

        {/* Leave Requests */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-white">Leave Requests</h2>
          <div className="grid gap-3">
            {pendingLeaves.map((leave) => (
              <ApprovalActionCard
                key={leave.id}
                title={leave.employee_name}
                subtitle={`${formatDate(leave.start_date)} - ${formatDate(leave.end_date)} · ${leave.leave_type}`}
                body={leave.reason}
                status={leave.status}
                onApprove={() => reviewLeave(user, leave.id, true)}
                onReject={() => reviewLeave(user, leave.id, false)}
              />
            ))}
            {!pendingLeaves.length && !decidedLeaves.length && (
              <p className="text-sm text-zinc-500">No leave requests yet.</p>
            )}
            {decidedLeaves.length > 0 && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-xs font-medium text-zinc-500">Decided — Super Admin can override</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
                {decidedLeaves.map((leave) => (
                  <ApprovalActionCard
                    key={leave.id}
                    title={leave.employee_name}
                    subtitle={`${formatDate(leave.start_date)} - ${formatDate(leave.end_date)} · ${leave.leave_type}`}
                    body={leave.reason}
                    status={leave.status}
                    isOverride
                    onApprove={() => reviewLeave(user, leave.id, true)}
                    onReject={() => reviewLeave(user, leave.id, false)}
                  />
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

export function ReportsPage() {
  const { user } = useAuth();
  const { reportRowsForUser } = useWorkTrackData();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [exporting, setExporting] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'employee') return <Navigate to="/dashboard" replace />;
  const rows = reportRowsForUser(user).filter((row) => {
    const matchesQuery = `${row.employee.name} ${row.employee.role} ${row.employee.department}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === 'all' || row.status === status;
    return matchesQuery && matchesStatus;
  });
  const topPerformer = [...rows].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))[0];
  const averageHours = rows.length ? rows.reduce((sum, row) => sum + row.totalHours, 0) / rows.length : 0;
  const totalTasks = rows.reduce((sum, row) => sum + row.taskCount, 0);

  async function exportPdf() {
    setExporting(true);
    try {
      const { exportReportPdf } = await import('../lib/pdf');
      await exportReportPdf(rows, 'WorkTrack Daily Report');
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <SectionHeader
        title="Reports"
        action={<div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => exportCsv(rows.map(csvRow), 'worktrack-report.csv')}><Download size={17} />CSV</Button><Button onClick={() => void exportPdf()} disabled={exporting}><FileDown size={17} />{exporting ? 'Exporting...' : 'PDF'}</Button></div>}
      />
      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-4">
          <Field label="Report type">
            <Select value={period} onChange={(event) => setPeriod(event.target.value as 'daily' | 'weekly' | 'monthly')}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
            </Select>
          </Field>
          <Field label="Search"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, role, department" /></Field>
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All</option><option value="on_track">On Track</option><option value="at_risk">At Risk</option><option value="flagged">Flagged</option><option value="no_data">No Data</option>
            </Select>
          </Field>
          <Field label={period === 'daily' ? 'Date' : period === 'weekly' ? 'Week starts' : 'Month'}>
            <Input type={period === 'monthly' ? 'month' : 'date'} defaultValue={todayInBusinessTz()} />
          </Field>
        </div>
      </Card>
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card><p className="text-sm text-zinc-400">Top performer</p><p className="mt-2 text-xl font-semibold text-white">{topPerformer?.employee.name ?? '-'}</p></Card>
        <Card><p className="text-sm text-zinc-400">Average hours/day</p><p className="mt-2 text-xl font-semibold text-white">{averageHours.toFixed(1)}h</p></Card>
        <Card><p className="text-sm text-zinc-400">Total tasks completed</p><p className="mt-2 text-xl font-semibold text-white">{totalTasks}</p></Card>
      </div>
      <ReportTable rows={rows} />
    </>
  );
}

export function TeamPage() {
  const { user } = useAuth();
  const { teamMetricsForUser } = useWorkTrackData();
  if (!user) return <Navigate to="/login" replace />;
  if (!['manager', 'team_lead'].includes(user.role)) return <Navigate to="/dashboard" replace />;
  return (
    <>
      <SectionHeader title="Team" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {teamMetricsForUser(user).map((metric) => (
          <Card key={metric.user.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{metric.user.name}</p>
                <p className="text-sm text-zinc-400">{ROLE_LABELS[metric.user.role]}</p>
              </div>
              <ProductivityBadge status={metric.status} />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">
              <span>Score {formatScore(metric.score)}</span>
              <span>{metric.hoursToday === null ? '-' : `${metric.hoursToday.toFixed(1)}h`}</span>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

export function UsersPage() {
  const { user } = useAuth();
  const {
    users,
    registrationRequests,
    passwordResetRequests,
    createUser,
    approveRegistration,
    rejectRegistration,
    deactivateUser,
    reactivateUser,
    resetPassword,
  } = useWorkTrackData();
  const [open, setOpen] = useState(false);
  const [generated, setGenerated] = useState<{ jsid: string; password: string; context: string } | null>(null);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return (
    <>
      <SectionHeader
        title="Employee Management"
        action={
          <Button variant="purple" onClick={() => setOpen(true)}>
            <UserPlus size={18} />
            Add Employee
          </Button>
        }
      />
      {generated ? (
        <Card className="mb-5 border-blue-500/30">
          <p className="font-semibold text-white">{generated.context}</p>
          <p className="mt-2 text-sm text-zinc-300">JSID: {generated.jsid} · Password: {generated.password}</p>
          <p className="mt-1 text-xs text-zinc-500">Share this once. The user will be forced to set a new password on first login.</p>
        </Card>
      ) : null}
      <Card className="mb-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Pending Password Reset Requests</h2>
        <div className="grid gap-3">
          {passwordResetRequests.filter((request) => request.resolved_at === null).map((request) => (
            <PendingPasswordResetCard
              key={request.id}
              request={request}
              user={users.find((candidate) => candidate.id === request.user_id) ?? null}
              onReset={() => {
                const target = users.find((candidate) => candidate.id === request.user_id);
                if (!target) {
                  throw new Error('User not found.');
                }
                setGenerated({
                  jsid: target.jsid,
                  password: resetPassword(user, target.id),
                  context: 'Temporary password generated from reset request',
                });
              }}
            />
          ))}
          {passwordResetRequests.every((request) => request.resolved_at !== null) ? (
            <EmptyState title="No pending reset requests" body="Forgot-password requests appear here for Super Admin review." />
          ) : null}
        </div>
      </Card>
      <Card className="mb-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Pending Registrations</h2>
        <div className="grid gap-3">
          {registrationRequests.filter((request) => request.status === 'pending_tl').map((request) => (
            <PendingRegistrationCard
              key={request.id}
              request={request}
              users={users}
              onApprove={(payload) => {
                const credentials = approveRegistration(user, request.id, payload);
                setGenerated({
                  ...credentials,
                  context: 'Temporary credentials generated for approved registration',
                });
              }}
              onReject={() => rejectRegistration(user, request.id, 'Rejected by Super Admin')}
            />
          ))}
          {registrationRequests.every((request) => request.status !== 'pending_tl') ? (
            <EmptyState title="No pending registrations" body="Self-registered accounts appear here for approval and assignment." />
          ) : null}
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-zinc-500"><tr><th className="py-3">JSID</th><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {users.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 text-zinc-300">{item.jsid}</td>
                  <td className="text-white">{item.name}</td>
                  <td><RoleBadge role={item.role} /></td>
                  <td className="text-zinc-300">{item.department}</td>
                  <td><Badge tone={item.status === 'active' ? 'green' : 'red'}>{item.status}</Badge></td>
                  <td className="text-zinc-400">{formatDate(item.created_at)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {item.role !== 'super_admin' ? (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setGenerated({
                              jsid: item.jsid,
                              password: resetPassword(user, item.id),
                              context: 'Temporary password generated manually',
                            })
                          }
                        >
                          Reset
                        </Button>
                      ) : null}
                      {item.status === 'active' && item.role !== 'super_admin' ? (
                        <Button variant="danger" onClick={() => {
                          const result = deactivateUser(user, item.id);
                          if (result.blocked) window.alert(result.reason);
                        }}>Deactivate</Button>
                      ) : null}
                      {item.status !== 'active' && item.role !== 'super_admin' ? (
                        <Button variant="secondary" onClick={() => {
                          const result = reactivateUser(user, item.id);
                          if (result.blocked) window.alert(result.reason);
                        }}>Reactivate</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <AddUserModal
        open={open}
        onClose={() => setOpen(false)}
        onCreate={(payload) => {
          const credentials = createUser(user, payload);
          setGenerated({ ...credentials, context: 'Temporary credentials generated for new user' });
        }}
      />
    </>
  );
}

function PendingPasswordResetCard({
  request,
  user,
  onReset,
}: {
  request: PasswordResetRequest;
  user: AppUser | null;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{user?.name ?? request.jsid}</p>
          <p className="text-sm text-zinc-400">{request.jsid} Â· {formatDateTime(request.created_at)}</p>
        </div>
        <ApprovalBadge status={request.status} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onReset}>Reset password</Button>
      </div>
    </div>
  );
}

function PendingRegistrationCard({
  request,
  users,
  onApprove,
  onReject,
}: {
  request: SelfRegistrationRequest;
  users: AppUser[];
  onApprove: (payload: { role: AppUser['role']; department: string; managerId?: string; teamLeadId?: string }) => void;
  onReject: () => void;
}) {
  const [role, setRole] = useState<AppUser['role']>(request.requested_role);
  const [department, setDepartment] = useState(request.department);
  const [managerId, setManagerId] = useState(users.find((item) => item.role === 'manager' && item.status === 'active')?.id);
  const [teamLeadId, setTeamLeadId] = useState(users.find((item) => item.role === 'team_lead' && item.status === 'active')?.id);
  const managers = users.filter((item) => item.role === 'manager' && item.status === 'active');
  const leads = users.filter((item) => item.role === 'team_lead' && item.status === 'active');

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{request.name}</p>
          <p className="text-sm text-zinc-400">Requested {ROLE_LABELS[request.requested_role]} · {formatDateTime(request.created_at)}</p>
        </div>
        <ApprovalBadge status={request.status} />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Field label="Role">
          <Select value={role} onChange={(event) => setRole(event.target.value as AppUser['role'])}>
            <option value="employee">Employee</option><option value="team_lead">Team Lead</option><option value="manager">Manager</option>
          </Select>
        </Field>
        <Field label="Department"><Input value={department} onChange={(event) => setDepartment(event.target.value)} /></Field>
        {role === 'team_lead' ? (
          <Field label="Manager"><Select value={managerId} onChange={(event) => setManagerId(event.target.value)}>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</Select></Field>
        ) : null}
        {role === 'employee' ? (
          <Field label="Team Lead"><Select value={teamLeadId} onChange={(event) => setTeamLeadId(event.target.value)}>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}</Select></Field>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => onApprove({ role, department, managerId, teamLeadId })}>Approve</Button>
        <Button variant="danger" onClick={onReject}>Reject</Button>
      </div>
    </div>
  );
}

export function TaskLibraryPage() {
  const { user } = useAuth();
  const {
    taskLibrary, addLibraryTask, updateLibraryTask, softDeleteTask,
    users, taskAssignments, assignTask,
    dailyTemplates, addDailyTemplate, removeDailyTemplate,
  } = useWorkTrackData();
  const [tab, setTab] = useState<'library' | 'daily' | 'assignments'>('library');

  // Add-to-library form
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [platformTag, setPlatformTag] = useState(PLATFORMS[0]);
  const [timeMinutes, setTimeMinutes] = useState(60);
  const [query, setQuery] = useState('');

  // One-off assign modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTaskId, setAssignTaskId] = useState('');
  const [assignEmployeeId, setAssignEmployeeId] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');

  // Daily template form
  const [dailyTaskId, setDailyTaskId] = useState('');
  const [dailyAssignTo, setDailyAssignTo] = useState('all');

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;

  const activeTasks = taskLibrary.filter((t) => !t.is_deleted);
  const filteredTasks = activeTasks.filter((t) =>
    `${t.name} ${t.category} ${t.platform_tag ?? ''}`.toLowerCase().includes(query.toLowerCase()),
  );
  const employees = users.filter((u) => u.role === 'employee' && u.status === 'active');
  const activeTemplates = dailyTemplates.filter((t) => t.is_active);

  function openAssignModal(taskId: string) {
    setAssignTaskId(taskId);
    setAssignEmployeeId(employees[0]?.id ?? '');
    setAssignModalOpen(true);
  }

  function submitAssignment(event: FormEvent) {
    event.preventDefault();
    const task = taskLibrary.find((t) => t.id === assignTaskId);
    const emp = users.find((u) => u.id === assignEmployeeId);
    if (!task || !emp || !user) return;
    assignTask(user, {
      taskLibraryId: task.id, taskName: task.name,
      employeeId: emp.id, employeeName: emp.name,
      dueDate: assignDueDate, notes: assignNotes,
    });
    setAssignModalOpen(false);
    setAssignDueDate('');
    setAssignNotes('');
  }

  function submitDailyTemplate(event: FormEvent) {
    event.preventDefault();
    const task = taskLibrary.find((t) => t.id === dailyTaskId);
    if (!task || !user) return;
    const assignedName = dailyAssignTo === 'all'
      ? 'All Employees'
      : (users.find((u) => u.id === dailyAssignTo)?.name ?? 'Unknown');
    addDailyTemplate(user, {
      taskLibraryId: task.id, taskName: task.name,
      category: task.category, platformTag: task.platform_tag,
      timeMinutes: task.time_minutes,
      assignedTo: dailyAssignTo, assignedName,
    });
    setDailyTaskId('');
  }

  const tabDefs = [
    { key: 'library' as const, label: 'Task Library' },
    { key: 'daily' as const, label: 'Daily Templates' },
    { key: 'assignments' as const, label: `Assignments (${taskAssignments.length})` },
  ];

  return (
    <>
      <SectionHeader
        title="Task Library"
        action={
          tab === 'library' ? (
            <Button variant="purple" onClick={() => openAssignModal(activeTasks[0]?.id ?? '')}>
              <ClipboardList size={18} />Assign Task
            </Button>
          ) : undefined
        }
      />

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-2xl bg-white/5 p-1">
        {tabDefs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${
              tab === t.key ? 'bg-blue-500 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Task Library ── */}
      {tab === 'library' && (
        <>
          <Card className="mb-5">
            <form
              className="grid gap-3 md:grid-cols-5"
              onSubmit={(e) => { e.preventDefault(); addLibraryTask(user, { name, category, platformTag, timeMinutes }); setName(''); }}
            >
              <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
              <Field label="Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Platform">
                <Select value={platformTag} onChange={(e) => setPlatformTag(e.target.value)}>
                  {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                </Select>
              </Field>
              <Field label="Minutes"><Input type="number" min={1} value={timeMinutes} onChange={(e) => setTimeMinutes(Number(e.target.value))} /></Field>
              <Button className="self-end"><Plus size={18} />Add</Button>
            </form>
          </Card>
          <Card>
            <div className="mb-4 max-w-md">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by task, category, platform" />
            </div>
            <div className="grid gap-3">
              {filteredTasks.map((task) => (
                <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{task.name}</p>
                    <p className="text-sm text-zinc-400">{task.category} · {task.platform_tag ?? 'General'} · {task.time_minutes} min</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input className="w-24" type="number" defaultValue={task.time_minutes} onBlur={(e) => updateLibraryTask(user, task.id, Number(e.target.value))} />
                    <Button variant="secondary" onClick={() => openAssignModal(task.id)}>
                      <ClipboardList size={15} />Assign
                    </Button>
                    <Button variant="danger" onClick={() => softDeleteTask(user, task.id)}><Trash2 size={16} />Delete</Button>
                  </div>
                </div>
              ))}
              {!filteredTasks.length && (
                <EmptyState title="No active tasks" body="Deleted tasks are hidden from the employee task picker but historical logs remain intact." />
              )}
            </div>
          </Card>
        </>
      )}

      {/* ── Tab 2: Daily Templates ── */}
      {tab === 'daily' && (
        <>
          <Card className="mb-5">
            <h2 className="mb-1 text-base font-semibold text-white">Set Up a Daily Recurring Task</h2>
            <p className="mb-5 text-sm text-zinc-400">
              Enter once — the employee sees this on their dashboard every day and checks it off. When marked done it automatically counts toward their task log and productivity score.
            </p>
            <form className="grid gap-4 md:grid-cols-3" onSubmit={submitDailyTemplate}>
              <Field label="Task from library">
                <Select value={dailyTaskId} onChange={(e) => setDailyTaskId(e.target.value)} required>
                  <option value="">— select task —</option>
                  {activeTasks.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} · {t.category} · {t.time_minutes} min</option>
                  ))}
                </Select>
              </Field>
              <Field label="Assign to">
                <Select value={dailyAssignTo} onChange={(e) => setDailyAssignTo(e.target.value)}>
                  <option value="all">All Employees</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} · {emp.jsid}</option>
                  ))}
                </Select>
              </Field>
              <Button className="self-end" disabled={!dailyTaskId}>
                <Plus size={18} />Save Daily Template
              </Button>
            </form>
          </Card>
          <Card>
            <h2 className="mb-4 text-base font-semibold text-white">Active Daily Templates</h2>
            {activeTemplates.length === 0 ? (
              <EmptyState title="No daily templates yet" body="Daily templates you create appear here. Employees see them on their dashboard every day." />
            ) : (
              <div className="grid gap-3">
                {activeTemplates.map((tmpl) => (
                  <div key={tmpl.id} className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-white">{tmpl.task_name}</p>
                      <p className="text-sm text-zinc-400">{tmpl.category} · {tmpl.platform_tag ?? 'General'} · {tmpl.time_minutes} min</p>
                      <p className="mt-1 text-xs font-medium text-blue-300">→ {tmpl.assigned_name}</p>
                    </div>
                    <Button variant="danger" onClick={() => removeDailyTemplate(user, tmpl.id)}>
                      <Trash2 size={16} />Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Tab 3: Assignments ── */}
      {tab === 'assignments' && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">One-off Task Assignments</h2>
            <Button variant="purple" onClick={() => openAssignModal(activeTasks[0]?.id ?? '')}>
              <ClipboardList size={18} />New Assignment
            </Button>
          </div>
          {taskAssignments.length === 0 ? (
            <EmptyState title="No assignments yet" body="Use 'Assign Task' or the Assign button on any task in the Library tab." />
          ) : (
            <div className="grid gap-3">
              {taskAssignments.map((a) => (
                <div key={a.id} className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-white">{a.task_name}</p>
                    <p className="text-sm text-zinc-400">Assigned to <span className="text-zinc-200">{a.employee_name}</span></p>
                    {a.notes ? <p className="mt-1 text-xs text-zinc-500">{a.notes}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-1 text-right">
                    {a.due_date ? <span className="text-xs text-amber-300">Due {a.due_date}</span> : null}
                    <span className="text-xs text-zinc-500">{formatDateTime(a.assigned_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Assign Modal */}
      <Modal open={assignModalOpen} title="Assign Task to Employee" onClose={() => setAssignModalOpen(false)}>
        <form className="grid gap-4" onSubmit={submitAssignment}>
          <Field label="Task">
            <Select value={assignTaskId} onChange={(e) => setAssignTaskId(e.target.value)}>
              {activeTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.name} · {t.category} · {t.platform_tag ?? 'General'}</option>
              ))}
            </Select>
          </Field>
          <Field label="Employee">
            <Select value={assignEmployeeId} onChange={(e) => setAssignEmployeeId(e.target.value)}>
              {employees.length === 0
                ? <option disabled>No active employees</option>
                : employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} · {emp.jsid} · {emp.department}</option>
                  ))
              }
            </Select>
          </Field>
          <Field label="Due date (optional)">
            <Input type="date" value={assignDueDate} onChange={(e) => setAssignDueDate(e.target.value)} />
          </Field>
          <Field label="Notes (optional)">
            <Input value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} placeholder="Any special instructions…" />
          </Field>
          <Button disabled={!assignTaskId || !assignEmployeeId}>
            <ClipboardList size={17} />Confirm Assignment
          </Button>
        </form>
      </Modal>
    </>
  );
}

export function AuditLogPage() {
  const { user } = useAuth();
  const { auditEvents } = useWorkTrackData();
  const [query, setQuery] = useState('');
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  const events = auditEvents.filter((event) => `${event.actor_name} ${event.target_name} ${event.action}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <SectionHeader title="Audit Log" />
      <Card>
        <div className="mb-4 max-w-md"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search audit events" /></div>
        <div className="grid gap-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold text-white">{event.action.replaceAll('_', ' ')}</p>
                <span className="text-sm text-zinc-500">{formatDateTime(event.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-zinc-300">{event.actor_name} acted on {event.target_name}</p>
              <pre className="mt-3 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-zinc-400">{JSON.stringify(event.metadata, null, 2)}</pre>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export function BroadcastsPage() {
  const { user } = useAuth();
  const { users, sendBroadcast } = useWorkTrackData();
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<'all' | Role>('all');
  const [confirming, setConfirming] = useState(false);
  const [sent, setSent] = useState<number | null>(null);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  const recipientCount = users.filter((candidate) => candidate.status === 'active' && (target === 'all' || candidate.role === target)).length;
  return (
    <>
      <SectionHeader title="Broadcasts" />
      <Card className="max-w-2xl">
        <div className="grid gap-4">
          <Field label="Message"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} /></Field>
          <Field label="Target">
            <Select value={target} onChange={(event) => setTarget(event.target.value as 'all' | Role)}>
              <option value="all">All</option><option value="employee">Employees only</option><option value="team_lead">Team Leads</option><option value="manager">Managers</option><option value="super_admin">Super Admins</option>
            </Select>
          </Field>
          <p className="text-sm text-zinc-400">{recipientCount} active recipients</p>
          {confirming ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
              <p className="font-semibold text-amber-100">Confirm broadcast to {recipientCount} recipients?</p>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => { setSent(sendBroadcast(user, message, target)); setConfirming(false); setMessage(''); }}><Send size={17} />Send now</Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <Button disabled={!message.trim()} onClick={() => setConfirming(true)}><Send size={17} />Review broadcast</Button>
          )}
          {sent !== null ? <p className="rounded-xl bg-emerald-500/12 p-3 text-sm text-emerald-100">Broadcast sent to {sent} users.</p> : null}
        </div>
      </Card>
    </>
  );
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <SectionHeader title="My Profile" />
      <Card className="max-w-xl">
        <div className="flex items-center gap-4">
          <div className="grid size-16 place-items-center rounded-2xl bg-blue-500 text-xl font-black">{user.name.slice(0, 1)}</div>
          <div><p className="text-xl font-semibold text-white">{user.name}</p><p className="text-sm text-zinc-400">{user.jsid}</p></div>
        </div>
        <div className="mt-6 grid gap-3 text-sm text-zinc-300"><p>Department: {user.department}</p><p>Role: {ROLE_LABELS[user.role]}</p><p>Status: {user.status}</p></div>
        <Button className="mt-6" variant="secondary" onClick={() => void logout()}>Logout</Button>
      </Card>
    </>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return (
    <>
      <SectionHeader title="Settings" />
      <Card className="max-w-2xl">
        <div className="flex gap-3">
          <ShieldAlert className="text-amber-300" />
          <div>
            <p className="font-semibold text-white">Production readiness</p>
            <p className="mt-1 text-sm text-zinc-400">Enable Supabase PITR or scheduled database and Storage exports before production launch.</p>
          </div>
        </div>
      </Card>
    </>
  );
}

function ProposalCard({ proposal }: { proposal: CustomTaskProposal }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-white">{proposal.task_name}</p>
        <ApprovalBadge status={proposal.status} />
      </div>
      <p className="mt-2 text-sm text-zinc-400">{proposal.category} · {proposal.proposed_time} minutes</p>
      {proposal.review_note ? <p className="mt-2 text-sm text-red-200">{proposal.review_note}</p> : null}
    </div>
  );
}

function ApprovalActionCard({
  title,
  subtitle,
  body,
  status,
  isOverride = false,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle: string;
  body: string;
  status: ProposalStatus | LeaveRequest['status'];
  isOverride?: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const borderClass = isOverride
    ? isApproved
      ? 'border-emerald-500/25'
      : isRejected
        ? 'border-red-500/20'
        : 'border-white/8'
    : 'border-white/8';

  return (
    <div className={`rounded-2xl border bg-white/[0.03] p-4 ${borderClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="font-semibold text-white">{title}</p><p className="text-sm text-zinc-400">{subtitle}</p></div>
        <ApprovalBadge status={status} />
      </div>
      <p className="mt-3 text-sm text-zinc-300">{body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {isOverride && (
          <span className="text-xs font-medium text-zinc-500">Override:</span>
        )}
        <Button
          variant="secondary"
          onClick={onApprove}
          className={isApproved && isOverride ? 'opacity-40 cursor-not-allowed' : ''}
        >
          <Check size={17} />{isOverride ? 'Set Approved' : 'Approve'}
        </Button>
        <Button
          variant="danger"
          onClick={onReject}
          className={isRejected && isOverride ? 'opacity-40 cursor-not-allowed' : ''}
        >
          <X size={17} />{isOverride ? 'Set Rejected' : 'Reject'}
        </Button>
      </div>
    </div>
  );
}

function ReportTable({ rows }: { rows: ReportRow[] }) {
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="text-zinc-500"><tr><th className="py-3">Employee</th><th>Role</th><th>Department</th><th>Tasks</th><th>Hours</th><th>Score</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-white/8">
            {rows.map((row) => (
              <tr key={row.employee.id}>
                <td className="py-3 text-white">{row.employee.name}</td>
                <td className="text-zinc-300">{ROLE_LABELS[row.employee.role]}</td>
                <td className="text-zinc-300">{row.employee.department}</td>
                <td className="text-zinc-300">{row.taskCount}</td>
                <td className="text-zinc-300">{row.totalHours.toFixed(1)}</td>
                <td className="text-zinc-300">{formatScore(row.score)}</td>
                <td><ProductivityBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function AddUserModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (payload: { name: string; role: AppUser['role']; department: string; managerId?: string; teamLeadId?: string }) => void;
}) {
  const { users } = useWorkTrackData();
  const [name, setName] = useState('');
  const [role, setRole] = useState<AppUser['role']>('employee');
  const [department, setDepartment] = useState('Content');
  const [managerId, setManagerId] = useState(users.find((user) => user.role === 'manager')?.id);
  const [teamLeadId, setTeamLeadId] = useState(users.find((user) => user.role === 'team_lead')?.id);
  const managers = users.filter((user) => user.role === 'manager' && user.status === 'active');
  const leads = users.filter((user) => user.role === 'team_lead' && user.status === 'active');

  function submit(event: FormEvent) {
    event.preventDefault();
    onCreate({ name, role, department, managerId, teamLeadId });
    setName('');
    onClose();
  }

  return (
    <Modal open={open} title="Add User" onClose={onClose}>
      <form className="grid gap-4" onSubmit={submit}>
        <Field label="Full name"><Input value={name} onChange={(event) => setName(event.target.value)} required /></Field>
        <Field label="Role">
          <Select value={role} onChange={(event) => setRole(event.target.value as AppUser['role'])}>
            <option value="employee">Employee</option><option value="team_lead">Team Lead</option><option value="manager">Manager</option><option value="super_admin">Super Admin</option>
          </Select>
        </Field>
        <Field label="Department"><Input value={department} onChange={(event) => setDepartment(event.target.value)} /></Field>
        {role === 'team_lead' ? (
          <Field label="Manager"><Select value={managerId} onChange={(event) => setManagerId(event.target.value)}>{managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}</Select></Field>
        ) : null}
        {role === 'employee' ? (
          <Field label="Team Lead"><Select value={teamLeadId} onChange={(event) => setTeamLeadId(event.target.value)}>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}</option>)}</Select></Field>
        ) : null}
        <Button>Create account</Button>
      </form>
    </Modal>
  );
}

function csvRow(row: ReportRow) {
  return {
    employee: row.employee.name,
    role: ROLE_LABELS[row.employee.role],
    department: row.employee.department,
    task_count: row.taskCount,
    total_hours: row.totalHours,
    score: row.score,
    status: row.status,
  };
}
