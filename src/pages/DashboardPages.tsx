import { CheckCircle2, Circle, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { ProgressBar } from '../components/ProgressBar';
import { ProductivityBadge, TaskStatusBadge } from '../components/StatusBadge';
import { Button, Card, Field, Input, Modal, SectionHeader, Select, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useWorkTrackData } from '../contexts/WorkTrackDataContext';
import { MIN_PRODUCTIVE_HOURS } from '../lib/constants';
import { businessWeekStart, formatDateTime, todayInBusinessTz, withinHours } from '../lib/dates';
import { formatHoursFromMinutes, formatScore } from '../lib/score';
import type { TaskLog, TaskStatus, TeamMetric } from '../types';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === 'employee') {
    return <EmployeeDashboard />;
  }
  if (user.role === 'team_lead') {
    return <TeamLeadDashboard />;
  }
  if (user.role === 'manager') {
    return <ManagerDashboard />;
  }
  return <SuperAdminDashboard />;
}

function EmployeeDashboard() {
  const { user } = useAuth();
  const { taskLogs, dailyTemplates, dailyCompletions, taskAssignments, markDailyCompletion } = useWorkTrackData();
  const navigate = useNavigate();
  const [logOpen, setLogOpen] = useState(false);
  const today = todayInBusinessTz();
  const weekStart = businessWeekStart();
  const logs = taskLogs.filter((log) => log.employee_id === user?.id);
  const todayLogs = logs.filter((log) => log.logged_at.startsWith(today));
  const weekLogs = logs.filter((log) => log.logged_at.slice(0, 10) >= weekStart && log.logged_at.slice(0, 10) <= today);
  const minutesToday = todayLogs.reduce((sum, log) => sum + log.task_time_snapshot, 0);
  const weeklyMinutes = weekLogs.reduce((sum, log) => sum + log.task_time_snapshot, 0);
  const tasksDone = todayLogs.filter((log) => log.status === 'done').length;
  const tasksProgress = todayLogs.filter((log) => log.status === 'in_progress').length;
  const tasksPending = todayLogs.filter((log) => log.status === 'pending').length;
  const myAssignments = taskAssignments.filter((assignment) => assignment.employee_id === user?.id);

  const myTemplates = dailyTemplates.filter(
    (t) => t.is_active && (t.assigned_to === 'all' || t.assigned_to === user?.id),
  );
  const doneCount = myTemplates.filter((t) =>
    dailyCompletions.some(
      (c) => c.template_id === t.id && c.employee_id === user?.id && c.date === today && c.is_done,
    ),
  ).length;

  return (
    <>
      <SectionHeader title="Dashboard" action={<Button onClick={() => setLogOpen(true)}><Plus size={18} />Log a Task</Button>} />
      <div className="grid gap-5 xl:grid-cols-[1.25fr_0.75fr]">
        <Card>
          <p className="mb-5 text-sm font-semibold text-zinc-400">Today's Progress</p>
          <ProgressBar hours={minutesToday / 60} />
        </Card>
        <Card>
          <p className="text-sm text-zinc-400">Weekly hours</p>
          <p className="mt-2 text-4xl font-semibold text-white">{(weeklyMinutes / 60).toFixed(1)}h</p>
          <p className="mt-3 text-sm text-zinc-500">Calculated from task logs since {weekStart}.</p>
        </Card>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Tasks completed" value={tasksDone} />
        <StatCard label="In progress" value={tasksProgress} />
        <StatCard label="Pending" value={tasksPending} />
        <StatCard label="Minimum target" value={`${MIN_PRODUCTIVE_HOURS}h`} />
      </div>

      {/* Daily Checklist */}
      {myTemplates.length > 0 && (
        <Card className="mt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-white">Daily Checklist</h2>
              <p className="mt-0.5 text-sm text-zinc-400">{doneCount} / {myTemplates.length} completed today</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: myTemplates.length ? `${(doneCount / myTemplates.length) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-xs text-zinc-400">{myTemplates.length ? Math.round((doneCount / myTemplates.length) * 100) : 0}%</span>
            </div>
          </div>
          <div className="grid gap-2">
            {myTemplates.map((tmpl) => {
              const isDone = dailyCompletions.some(
                (c) => c.template_id === tmpl.id && c.employee_id === user?.id && c.date === today && c.is_done,
              );
              return (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    if (user) {
                      void markDailyCompletion(user, tmpl.id, today, !isDone);
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                    isDone
                      ? 'border-emerald-500/30 bg-emerald-500/10'
                      : 'border-white/8 bg-white/[0.03] hover:bg-white/[0.06]'
                  }`}
                >
                  {isDone
                    ? <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
                    : <Circle size={20} className="shrink-0 text-zinc-500" />
                  }
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${isDone ? 'text-emerald-200 line-through decoration-emerald-500/50' : 'text-white'}`}>
                      {tmpl.task_name}
                    </p>
                    <p className="text-xs text-zinc-500">{tmpl.category} · {tmpl.platform_tag ?? 'General'} · {tmpl.time_minutes} min</p>
                  </div>
                  <span className={`text-xs font-semibold ${isDone ? 'text-emerald-400' : 'text-zinc-500'}`}>
                    {isDone ? 'Done ✓' : 'Mark done'}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Approved Custom Tasks */}
      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">My Approved Custom Tasks</h2>
        </div>
        <ApprovedCustomTasksList />
      </Card>

      {myAssignments.length > 0 ? (
        <Card className="mt-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Assigned Tasks</h2>
          <div className="grid gap-3">
            {myAssignments.map((assignment) => (
              <div key={assignment.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="font-semibold text-white">{assignment.task_name}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  {assignment.due_date ? `Due ${assignment.due_date}` : 'No due date'}
                </p>
                {assignment.notes ? <p className="mt-2 text-sm text-zinc-300">{assignment.notes}</p> : null}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Today's Task Log</h2>
          <Button variant="secondary" onClick={() => navigate('/tasks')}>Open full log</Button>
        </div>
        <TaskLogTable logs={todayLogs} />
      </Card>
      <LogTaskModal open={logOpen} onClose={() => setLogOpen(false)} />
    </>
  );
}

function TeamLeadDashboard() {
  const { user } = useAuth();
  const { teamMetricsForUser } = useWorkTrackData();
  const metrics = user ? teamMetricsForUser(user) : [];
  const score = metrics.length ? average(metrics.map((metric) => metric.score)) : null;

  return (
    <>
      <SectionHeader title="Team Lead Dashboard" />
      <Card className="mb-5">
        <p className="text-sm text-zinc-400">Your score is based on your team's performance</p>
        <p className="mt-2 text-5xl font-semibold text-white">{formatScore(score)}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <TeamMetricCard key={metric.user.id} metric={metric} />
        ))}
      </div>
    </>
  );
}

function ManagerDashboard() {
  const { user } = useAuth();
  const { teamMetricsForUser, users } = useWorkTrackData();
  const metrics = user ? teamMetricsForUser(user).filter((metric) => metric.user.role === 'team_lead') : [];
  const score = metrics.length ? average(metrics.map((metric) => metric.score)) : null;

  return (
    <>
      <SectionHeader title="Manager Dashboard" />
      <Card className="mb-5">
        <p className="text-sm text-zinc-400">Your score is based on your team's performance</p>
        <p className="mt-2 text-5xl font-semibold text-white">{formatScore(score)}</p>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.user.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-white">{metric.user.name}</p>
                <p className="text-sm text-zinc-400">{metric.user.department}</p>
              </div>
              <p className="text-2xl font-semibold text-white">{formatScore(metric.score)}</p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-sm text-zinc-400">
              <Users size={16} />
              {users.filter((candidate) => candidate.team_lead_id === metric.user.id).length} employees
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function SuperAdminDashboard() {
  const { user } = useAuth();
  const { teamMetricsForUser, proposals, leaves, taskLogs, users } = useWorkTrackData();
  const metrics = user ? teamMetricsForUser(user) : [];
  const employees = users.filter((candidate) => candidate.role === 'employee');
  const today = todayInBusinessTz();
  const todayLogs = taskLogs.filter((log) => log.logged_at.startsWith(today));
  const totalMinutes = todayLogs.reduce((sum, log) => sum + log.task_time_snapshot, 0);
  const flagged = metrics.filter((metric) => metric.status === 'flagged').length;

  return (
    <>
      <SectionHeader title="Super Admin Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Team hours today" value={(totalMinutes / 60).toFixed(1)} />
        <StatCard label="Employees flagged" value={flagged} danger />
        <StatCard label="Pending proposals" value={proposals.filter((proposal) => proposal.status !== 'approved' && proposal.status !== 'rejected').length} />
        <StatCard label="Pending leave" value={leaves.filter((leave) => leave.status !== 'approved' && leave.status !== 'rejected').length} />
        <StatCard label="Tasks logged" value={todayLogs.length} />
      </div>
      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Full Team</h2>
          <p className="text-sm text-zinc-400">{employees.length} employees</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="text-zinc-500">
              <tr>
                <th className="py-3">Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Hours</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {metrics.map((metric) => (
                <tr key={metric.user.id}>
                  <td className="py-3 text-white">{metric.user.name}</td>
                  <td className="text-zinc-300">{metric.user.role}</td>
                  <td className="text-zinc-300">{metric.user.department}</td>
                  <td className="text-zinc-300">{metric.hoursToday === null ? '-' : metric.hoursToday.toFixed(1)}</td>
                  <td className="text-zinc-300">{formatScore(metric.score)}</td>
                  <td><ProductivityBadge status={metric.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

export function LogTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { taskLibrary, approvedCustomTasks, logTask, taskLogs } = useWorkTrackData();
  const [taskId, setTaskId] = useState(`library:${taskLibrary.find((task) => !task.is_deleted)?.id ?? ''}`);
  const [status, setStatus] = useState<TaskStatus>('done');
  const [notes, setNotes] = useState('');
  const [projectTag, setProjectTag] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [group, setGroup] = useState<'flat' | 'category' | 'platform'>('flat');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const today = todayInBusinessTz();

  const loggedLibraryIds = new Set(
    taskLogs
      .filter((log) => log.employee_id === user?.id && log.logged_at.startsWith(today) && log.task_library_id)
      .map((log) => log.task_library_id)
  );

  const loggedCustomIds = new Set(
    taskLogs
      .filter((log) => log.employee_id === user?.id && log.logged_at.startsWith(today) && log.approved_custom_task_id)
      .map((log) => log.approved_custom_task_id)
  );

  const taskOptions = [
    ...taskLibrary
      .filter((task) => !task.is_deleted && !loggedLibraryIds.has(task.id))
      .map((task) => ({
        id: `library:${task.id}`,
        label: task.name,
        category: task.category,
        platform: task.platform_tag ?? 'General',
        time: task.time_minutes,
      })),
    ...approvedCustomTasks
      .filter((task) => task.employee_id === user?.id && !task.is_deleted && !loggedCustomIds.has(task.id))
      .map((task) => ({
        id: `custom:${task.id}`,
        label: task.task_name,
        category: task.category,
        platform: 'Private custom',
        time: task.time_minutes,
      })),
  ];
  const tasks = taskOptions.filter((task) =>
    `${task.label} ${task.category} ${task.platform}`.toLowerCase().includes(search.toLowerCase()),
  );
  const firstAvailableTaskId = taskOptions[0]?.id ?? '';
  const taskIdStillAvailable = taskOptions.some((task) => task.id === taskId);
  const selectedTaskId = taskIdStillAvailable ? taskId : firstAvailableTaskId;
  const selected = taskOptions.find((task) => task.id === selectedTaskId);
  const groupedTasks =
    group === 'flat'
      ? []
      : Array.from(new Set(tasks.map((task) => (group === 'category' ? task.category : task.platform)))).map((label) => ({
          label,
          tasks: tasks.filter((task) => (group === 'category' ? task.category : task.platform) === label),
        }));

  async function submit() {
    if (!user) {
      return;
    }
    setError('');
    try {
      await logTask({ employeeId: user.id, taskId: selectedTaskId, status, notes, projectTag, proofUrl });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not log task.');
    }
  }

  return (
    <Modal open={open} title="Log a Task" onClose={onClose}>
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-2 rounded-xl bg-[#111318] p-1">
          {(['flat', 'category', 'platform'] as const).map((option) => (
            <button
              key={option}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${group === option ? 'bg-blue-500 text-white' : 'text-zinc-400'}`}
              onClick={() => setGroup(option)}
            >
              {option}
            </button>
          ))}
        </div>
        <Field label="Search tasks">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by task, category, platform" />
        </Field>
        <Field label={`Task (${group} view)`}>
          <Select value={selectedTaskId} onChange={(event) => setTaskId(event.target.value)}>
            {group === 'flat'
              ? tasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    {task.label} - {task.category} - {task.platform}
                  </option>
                ))
              : groupedTasks.map((section) => (
                  <optgroup key={section.label} label={section.label}>
                    {section.tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {task.label} - {task.category} - {task.platform}
                      </option>
                    ))}
                  </optgroup>
                ))}
          </Select>
        </Field>
        <Field label="Predefined time">
          <Input value={selected ? `${selected.time} minutes` : ''} readOnly className="text-zinc-400" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
            <option value="done">Done</option>
            <option value="in_progress">In Progress</option>
            <option value="pending">Pending</option>
          </Select>
        </Field>
        <Field label="Project tag">
          <Input value={projectTag} onChange={(event) => setProjectTag(event.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Proof link or file note" hint="For Supabase, uploaded files are stored privately in task-proofs with owner/team RLS.">
          <Input value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} placeholder="Optional URL or file reference" />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
        </Field>
        {error ? <p className="rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{error}</p> : null}
        <Button onClick={() => void submit()} disabled={!selected}>Submit task</Button>
      </div>
    </Modal>
  );
}

function ApprovedCustomTasksList() {
  const { user } = useAuth();
  const { approvedCustomTasks, taskLogs, logTask } = useWorkTrackData();
  const [error, setError] = useState('');
  const today = todayInBusinessTz();

  if (!user) return null;

  const myApprovedTasks = approvedCustomTasks.filter(
    (t) => t.employee_id === user.id && !t.is_deleted,
  );

  if (myApprovedTasks.length === 0) {
    return <p className="text-sm text-zinc-400">You don't have any approved custom tasks yet.</p>;
  }

  return (
    <div className="grid gap-2">
      {myApprovedTasks.map((task) => {
        // A task might be logged multiple times, but let's just show how many times they logged it today
        const loggedToday = taskLogs.filter(
          (log) => log.employee_id === user.id && log.approved_custom_task_id === task.id && log.logged_at.startsWith(today),
        ).length;

        return (
          <div key={task.id} className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-emerald-100">{task.task_name}</p>
                <ProductivityBadge status="on_track" />
              </div>
              <p className="mt-1 text-sm text-zinc-400">{task.category} · {task.time_minutes} minutes per log</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-zinc-500">Logged {loggedToday} time{loggedToday !== 1 ? 's' : ''} today</span>
              <Button 
                className={`px-3 py-1.5 text-xs min-h-0 ${loggedToday >= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={loggedToday >= 1}
                onClick={() => {
                  setError('');
                  void logTask({
                    employeeId: user.id,
                    taskId: `custom:${task.id}`,
                    status: 'done',
                  }).catch((caught) => {
                    setError(caught instanceof Error ? caught.message : 'Could not log custom task.');
                  });
                }}
              >
                <CheckCircle2 size={16} /> {loggedToday >= 1 ? 'Already logged' : 'Log now'}
              </Button>
            </div>
          </div>
        );
      })}
      {error ? <p className="rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{error}</p> : null}
    </div>
  );
}

function TaskLogTable({ logs }: { logs: TaskLog[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-zinc-400">No tasks logged yet today.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-zinc-500">
          <tr>
            <th className="py-3">Task</th>
            <th>Category</th>
            <th>Time</th>
            <th>Status</th>
            <th>Logged</th>
            <th>Edit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="py-3 text-white">{log.task_name}</td>
              <td className="text-zinc-300">{log.category}</td>
              <td className="text-zinc-300">{formatHoursFromMinutes(log.task_time_snapshot)}</td>
              <td><TaskStatusBadge status={log.status} /></td>
              <td className="text-zinc-400">{formatDateTime(log.logged_at)}</td>
              <td>{withinHours(log.logged_at, 24) ? <span className="text-zinc-500">Open</span> : <span className="text-zinc-600">Closed</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TeamMetricCard({ metric }: { metric: TeamMetric }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{metric.user.name}</p>
          <p className="text-sm text-zinc-400">{metric.user.department}</p>
        </div>
        <ProductivityBadge status={metric.status} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
        <Metric label="Hours" value={metric.hoursToday === null ? '-' : metric.hoursToday.toFixed(1)} />
        <Metric label="Score" value={formatScore(metric.score)} />
        <Metric label="Tasks" value={metric.tasksToday} />
      </div>
    </Card>
  );
}

function StatCard({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <Card className={danger ? 'border-red-500/20' : undefined}>
      <p className="text-sm text-zinc-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${danger ? 'text-red-200' : 'text-white'}`}>{value}</p>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white/[0.04] p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-white">{value}</p>
    </div>
  );
}

function average(values: Array<number | null | undefined>) {
  const filtered = values.filter((value): value is number => typeof value === 'number');
  if (!filtered.length) {
    return null;
  }
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}
