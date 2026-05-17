import {
  BarChart3,
  Bell,
  ClipboardCheck,
  FileText,
  Gauge,
  History,
  Library,
  LogOut,
  Menu,
  MoreHorizontal,
  Send,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

import { useAuth } from '../contexts/AuthContext';
import { ROLE_LABELS } from '../lib/constants';
import type { Role } from '../types';
import { RoleBadge } from './StatusBadge';
import { Button } from './ui';
import khulKePuchoLogo from '../assets/khul-ke-pucho-logo.jpg';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles: Role[];
  mobile?: boolean;
  more?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <Gauge size={18} />, roles: ['super_admin', 'manager', 'team_lead', 'employee'], mobile: true },
  { to: '/tasks', label: 'Log Task', icon: <ClipboardCheck size={18} />, roles: ['employee'], mobile: true },
  { to: '/proposals', label: 'Proposals', icon: <FileText size={18} />, roles: ['employee'], mobile: true },
  { to: '/leave', label: 'Leave', icon: <History size={18} />, roles: ['employee', 'super_admin'], mobile: true },
  { to: '/notifications', label: 'Notifications', icon: <Bell size={18} />, roles: ['employee', 'team_lead', 'manager', 'super_admin'], mobile: true },
  { to: '/users', label: 'Users', icon: <Users size={18} />, roles: ['super_admin'], mobile: true },
  { to: '/task-library', label: 'Tasks', icon: <Library size={18} />, roles: ['super_admin'], mobile: true },
  { to: '/approvals', label: 'Approvals', icon: <ClipboardCheck size={18} />, roles: ['super_admin', 'manager', 'team_lead'], mobile: true },
  { to: '/reports', label: 'Reports', icon: <BarChart3 size={18} />, roles: ['super_admin', 'manager', 'team_lead'], mobile: true },
  { to: '/team', label: 'Team', icon: <Users size={18} />, roles: ['manager', 'team_lead'], mobile: true },
  { to: '/broadcasts', label: 'Broadcasts', icon: <Send size={18} />, roles: ['super_admin'], more: true },
  { to: '/audit-log', label: 'Audit Log', icon: <ShieldCheck size={18} />, roles: ['super_admin'], more: true },
  { to: '/settings', label: 'Settings', icon: <Settings size={18} />, roles: ['super_admin'], more: true },
];

const superAdminMobileOrder = ['/dashboard', '/users', '/task-library', '/approvals', '/reports'];

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const items = useMemo(() => (user ? navItems.filter((item) => item.roles.includes(user.role)) : []), [user]);

  if (!user) {
    return <>{children}</>;
  }

  const mobileItems =
    user.role === 'super_admin'
      ? superAdminMobileOrder
          .map((path) => items.find((item) => item.to === path))
          .filter((item): item is NavItem => Boolean(item))
      : items.filter((item) => item.mobile && !item.more).slice(0, 5);
  const moreItems = items.filter((item) => item.more || !mobileItems.some((mobile) => mobile.to === item.to));

  const nav = (
    <nav className="grid gap-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            clsx(
              'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition',
              isActive ? 'bg-blue-500 text-white shadow-lg shadow-blue-950/30' : 'text-zinc-400 hover:bg-white/8 hover:text-white',
            )
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/8 bg-[#101114]/95 p-5 lg:block">
        <div className="mb-8 flex items-center gap-3">
          <img
            src={khulKePuchoLogo}
            alt="Khul Ke Pucho"
            className="h-11 w-11 rounded-xl bg-white object-cover p-0.5"
          />
          <div>
            <p className="text-lg font-semibold text-white">Khul Ke Pucho</p>
            <p className="text-xs text-zinc-500">Social media operations</p>
          </div>
        </div>
        {nav}
      </aside>

      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#0F0F0F]/85 px-4 py-3 backdrop-blur lg:ml-72">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={20} />
            </Button>
            <button className="flex items-center gap-3 text-left" onClick={() => navigate('/dashboard')}>
              <img src={khulKePuchoLogo} alt="Khul Ke Pucho" className="size-10 rounded-xl bg-white object-cover p-0.5 lg:hidden" />
              <div>
                <p className="text-sm font-semibold text-white sm:text-base">{user.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <RoleBadge role={user.role} />
                  <span className="hidden text-xs text-zinc-500 sm:inline">{user.department}</span>
                </div>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate('/notifications')} aria-label="Notifications">
              <Bell size={19} />
            </Button>
            <Button variant="ghost" onClick={() => navigate('/profile')} aria-label="Profile">
              <UserRound size={19} />
            </Button>
            <Button variant="secondary" onClick={() => void logout()} className="hidden sm:inline-flex">
              <LogOut size={17} />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden">
          <div className="h-full w-80 max-w-[86vw] border-r border-white/8 bg-[#101114] p-5">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={khulKePuchoLogo} alt="Khul Ke Pucho" className="size-8 rounded-lg bg-white object-cover p-0.5" />
                <p className="text-lg font-semibold text-white">Khul Ke Pucho</p>
              </div>
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                Close
              </Button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-7xl px-4 py-6 lg:ml-72 lg:px-8">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-[#101114]/96 px-2 py-2 backdrop-blur lg:hidden">
        <div className={clsx('grid gap-1', user.role === 'super_admin' ? 'grid-cols-6' : 'grid-cols-5')}>
          {mobileItems.map((item) => (
            <MobileNavItem key={item.to} item={item} />
          ))}
          {moreItems.length > 0 && user.role === 'super_admin' ? (
            <button
              className="grid min-h-14 place-items-center rounded-xl text-xs font-medium text-zinc-400"
              onClick={() => setMoreOpen(true)}
            >
              <MoreHorizontal size={20} />
              More
            </button>
          ) : null}
        </div>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-50 bg-[#0F0F0F] p-5 lg:hidden">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-2xl font-semibold text-white">More</p>
              <p className="text-sm text-zinc-400">{ROLE_LABELS[user.role]}</p>
            </div>
            <Button variant="secondary" onClick={() => setMoreOpen(false)}>
              Close
            </Button>
          </div>
          <div className="grid gap-3">
            {moreItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMoreOpen(false)}
                className="flex min-h-16 items-center gap-4 rounded-2xl border border-white/10 bg-[#1A1D23] px-4 text-base font-semibold text-white"
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
            <button
              className="flex min-h-16 items-center gap-4 rounded-2xl border border-white/10 bg-[#1A1D23] px-4 text-base font-semibold text-white"
              onClick={() => void logout()}
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MobileNavItem({ item }: { item: NavItem }) {
  const location = useLocation();
  const active = location.pathname === item.to;
  return (
    <NavLink
      to={item.to}
      className={clsx(
        'grid min-h-14 place-items-center rounded-xl text-xs font-medium transition',
        active ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:bg-white/8 hover:text-white',
      )}
    >
      {item.icon}
      <span className="max-w-full truncate px-1">{item.label}</span>
    </NavLink>
  );
}
