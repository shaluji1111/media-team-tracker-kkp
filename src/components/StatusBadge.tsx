import { Badge } from './ui';
import { ROLE_LABELS, TASK_STATUS_LABELS } from '../lib/constants';
import type { ProposalStatus, Role, TaskStatus, TeamMetric } from '../types';

export function RoleBadge({ role }: { role: Role }) {
  return <Badge tone={role === 'super_admin' ? 'purple' : role === 'employee' ? 'blue' : 'neutral'}>{ROLE_LABELS[role]}</Badge>;
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const tone = status === 'done' ? 'green' : status === 'in_progress' ? 'yellow' : 'neutral';
  return <Badge tone={tone}>{TASK_STATUS_LABELS[status]}</Badge>;
}

export function ApprovalBadge({ status }: { status: ProposalStatus | 'approved' | 'rejected' | 'pending_tl' | 'pending_manager' }) {
  const tone = status === 'approved' ? 'green' : status === 'rejected' ? 'red' : 'yellow';
  const label = status === 'pending_tl' ? 'Pending TL' : status === 'pending_manager' ? 'Pending Manager' : status;
  return <Badge tone={tone}>{label.replace('_', ' ')}</Badge>;
}

export function ProductivityBadge({ status }: { status: TeamMetric['status'] }) {
  const tone =
    status === 'on_track' ? 'green' : status === 'at_risk' ? 'yellow' : status === 'flagged' ? 'red' : 'neutral';
  const label = {
    on_track: 'On Track',
    at_risk: 'At Risk',
    flagged: 'Flagged',
    on_leave: 'On Leave',
    no_data: 'No Data',
  }[status];
  return <Badge tone={tone}>{label}</Badge>;
}

