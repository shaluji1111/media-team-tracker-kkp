import type { Role, TaskStatus } from '../types';

export const APP_NAME = 'WorkTrack';
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';
export const MIN_PRODUCTIVE_HOURS = 6;
export const SHIFT_HOURS = 9;
export const SESSION_IDLE_LIMIT_MS = 8 * 60 * 60 * 1000;

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  done: 'Done',
  in_progress: 'In Progress',
  pending: 'Pending',
};

export const CATEGORIES = [
  'Graphic Design',
  'Video Editing',
  'Copywriting',
  'Social Media Management',
  'Strategy',
  'Admin Work',
];

export const PLATFORMS = [
  'Instagram',
  'YouTube',
  'Facebook',
  'LinkedIn',
  'TikTok',
  'Twitter/X',
  'General',
];

export const ROLE_ORDER: Record<Role, number> = {
  super_admin: 4,
  manager: 3,
  team_lead: 2,
  employee: 1,
};

