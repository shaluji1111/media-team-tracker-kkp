import { CheckCircle2, Circle, Plus, Users } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';

import { ProgressBar } from '../components/ProgressBar';
import { ProductivityBadge, TaskStatusBadge } from '../components/StatusBadge';
import { Button, Card, Field, Input, Modal, SectionHeader, Select, Textarea } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useWorkTrackData } from '../contexts/WorkTrackDataContext';
import { MIN_PRODUCTIVE_HOURS } from '../lib/constants';
import { formatDateTime, todayInBusinessTz, withinHours } from '../lib/dates';
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
  const { taskLogs, dailyTemplates, dailyCompletions, markDailyCompletion } = useWorkTrackData();
  const navigate = useNavigate();
  const [logOpen, setLogOpen] = useState(false);
  const today = todayInBusinessTz();
  const logs = taskLogs.filter((log) => log.employee_id === user?.id);
  const minutesToday = logs.reduce((sum, log) => sum + log.task_time_snapshot, 0);
  const tasksDone = logs.filter((log) => log.status === 'done').length;
  const tasksProgress = logs.filter((log) => log.status === 'in_progress').length;
  const tasksPending = logs.filter((log) => log.status === 'pending').length;

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
          <p className="mt-2 text-4xl font-semibold text-white">{(minutesToday / 60 + 18.5).toFixed(1)}h</p>
          <p className="mt-3 text-sm text-zinc-500">Cumulative scores can exceed 100% across longer periods.</p>
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
                  onClick={() => user && markDailyCompletion(user, tmpl.id, today, !isDone)}
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

      <Card className="mt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Today's Task Log</h2>
          <Button variant="secondary" onClick={() => navigate('/tasks')}>Open full log</Button>
        </div>
        <TaskLogTable logs={logs} />
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
  const totalMinutes = taskLogs.reduce((sum, log) => sum + log.task_time_snapshot, 0);
  const flagged = metrics.filter((metric) => metric.status === 'flagged').length;

  return (
    <>
      <SectionHeader title="Super Admin Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Team hours today" value={(totalMinutes / 60).toFixed(1)} />
        <StatCard label="Employees flagged" value={flagged} danger />
        <StatCard label="Pending proposals" value={proposals.filter((proposal) => proposal.status !== 'approved' && proposal.status !== 'rejected').length} />
        <StatCard label="Pending leave" value={leaves.filter((leave) => leave.status !== 'approved' && leave.status !== 'rejected').length} />
        <StatCard label="Tasks logged" value={taskLogs.length} />
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
  const { taskLibrary, approvedCustomTasks, logTask } = useWorkTrackData();
  const [taskId, setTaskId] = useState(`library:${taskLibrary.find((task) => !task.is_deleted)?.id ?? ''}`);
  const [status, setStatus] = useState<TaskStatus>('done');
  const [notes, setNotes] = useState('');
  const [projectTag, setProjectTag] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [group, setGroup] = useState<'flat' | 'category' | 'platform'>('flat');
  const [search, setSearch] = useState('');
  const taskOptions = [
    ...taskLibrary
      .filter((task) => !task.is_deleted)
      .map((task) => ({
        id: `library:${task.id}`,
        label: task.name,
        category: task.category,
        platform: task.platform_tag ?? 'General',
        time: task.time_minutes,
      })),
    ...approvedCustomTasks
      .filter((task) => task.employee_id === user?.id && !task.is_deleted)
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
  const selected = taskOptions.find((task) => task.id === taskId);

  function submit() {
    if (!user) {
      return;
    }
    logTask({ employeeId: user.id, taskId, status, notes, projectTag, proofUrl });
    onClose();
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
          <Select value={taskId} onChange={(event) => setTaskId(event.target.value)}>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.label} - {task.category} - {task.platform}
              </option>
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
        <Button onClick={submit}>Submit task</Button>
      </div>
    </Modal>
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
              <td>{withinHours(log.logged_at, 24) ? <Button variant="ghost">Edit</Button> : <span className="text-zinc-600">Closed</span>}</td>
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
