import { describe, expect, it } from 'vitest';

import { reportRowsFor, teamMetricsFor } from './mockData';
import { todayInBusinessTz } from '../lib/dates';
import type { AppUser, LeaveRequest } from '../types';

describe('team metrics leave handling', () => {
  it('marks employees with approved leave today as on leave', () => {
    const today = todayInBusinessTz();
    const manager: AppUser = {
      id: 'manager',
      jsid: 'JS1000',
      name: 'Manager',
      role: 'manager',
      department: 'Ops',
      manager_id: null,
      team_lead_id: null,
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      first_login_done: true,
    };
    const lead: AppUser = {
      id: 'lead',
      jsid: 'JS2000',
      name: 'Lead',
      role: 'team_lead',
      department: 'Ops',
      manager_id: manager.id,
      team_lead_id: null,
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      first_login_done: true,
    };
    const employee: AppUser = {
      id: 'employee',
      jsid: 'JS3000',
      name: 'Employee',
      role: 'employee',
      department: 'Ops',
      manager_id: null,
      team_lead_id: lead.id,
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      first_login_done: true,
    };
    const leave: LeaveRequest = {
      id: 'leave',
      employee_id: employee.id,
      employee_name: employee.name,
      start_date: today,
      end_date: today,
      leave_type: 'personal',
      reason: 'Planned leave',
      status: 'approved',
      reviewed_by: lead.id,
      override_by: null,
      created_at: '2026-05-18T00:00:00.000Z',
    };

    const metric = teamMetricsFor(lead, [manager, lead, employee], [], [leave]).find(
      (item) => item.user.id === employee.id,
    );

    expect(metric?.status).toBe('on_leave');
    expect(metric?.score).toBeNull();
  });
});

describe('report visibility identity resolution', () => {
  it('uses matching JSID when the viewer has a stale stored id', () => {
    const lead: AppUser = {
      id: 'real-lead-id',
      jsid: 'JS2000',
      name: 'Lead',
      role: 'team_lead',
      department: 'Ops',
      manager_id: 'manager',
      team_lead_id: null,
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      first_login_done: true,
    };
    const employee: AppUser = {
      id: 'employee',
      jsid: 'JS3000',
      name: 'Employee',
      role: 'employee',
      department: 'Ops',
      manager_id: null,
      team_lead_id: lead.id,
      status: 'active',
      created_at: '2026-01-01T00:00:00.000Z',
      first_login_done: true,
    };
    const staleViewer = { ...lead, id: 'demo-lead-id' };

    const rows = reportRowsFor(staleViewer, [lead, employee], [], []);

    expect(rows.map((row) => row.employee.id)).toEqual([employee.id]);
  });
});
