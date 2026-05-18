import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useWorkTrackData } from '../contexts/WorkTrackDataContext';
import { isValidJsid, normalizeJsid } from '../lib/jsid';
import { Button, Card, Field, Input, Select } from '../components/ui';
import khulKePuchoLogo from '../assets/khul-ke-pucho-logo.jpg';

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [jsid, setJsid] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.first_login_done ? '/dashboard' : '/set-password'} replace />;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const normalized = normalizeJsid(jsid);
    if (!isValidJsid(jsid)) {
      setError('Enter a valid JSID (e.g., JS0001 or JS21587).');
      return;
    }
    setLoading(true);
    try {
      await login(normalized, password, remember);
      navigate('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <div className="mb-7">
          <img
            src={khulKePuchoLogo}
            alt="Khul Ke Pucho"
            className="mx-auto mb-4 block h-auto w-full max-w-[220px] rounded-lg bg-white p-2"
          />
          <p className="mt-2 text-center text-sm text-zinc-400">Sign in with your JSID and password.</p>
        </div>
        <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
          <Field label="JSID">
            <Input value={jsid} onChange={(event) => setJsid(event.target.value)} placeholder="JS0001" />
          </Field>
          <Field label="Password">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="pr-12"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          <div className="flex items-center justify-between gap-3 text-sm">
            <label className="flex items-center gap-2 text-zinc-300">
              <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" />
              Remember me
            </label>
            <Link className="text-blue-300 hover:text-blue-200" to="/forgot-password">
              Forgot password
            </Link>
          </div>
          {error ? <p className="rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{error}</p> : null}
          <Button type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
          <Button type="button" variant="secondary" onClick={() => navigate('/register')}>
            <UserPlus size={18} />
            Self-register
          </Button>
        </form>
      </Card>
    </AuthShell>
  );
}

export function SetPasswordPage() {
  const { user, setNewPassword } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (user.first_login_done) {
    return <Navigate to="/dashboard" replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await setNewPassword(password);
      navigate('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Password change failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white">Set New Password</h1>
        <p className="mt-2 text-sm text-zinc-400">Default passwords are invalidated after this change.</p>
        <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
          <Field label="New password">
            <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          <Field label="Confirm password">
            <Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </Field>
          {error ? <p className="rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{error}</p> : null}
          <Button disabled={loading}>{loading ? 'Saving...' : 'Save password'}</Button>
        </form>
      </Card>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { isDemoMode, requestPasswordReset } = useAuth();
  const { submitPasswordResetRequest } = useWorkTrackData();
  const [jsid, setJsid] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (isDemoMode) {
        submitPasswordResetRequest(jsid);
      } else {
        await requestPasswordReset(jsid);
      }
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit reset request.');
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white">Password Reset</h1>
        {submitted ? (
          <div className="mt-6 rounded-xl bg-emerald-500/12 p-4 text-sm text-emerald-100">
            Your reset request has been submitted. The Super Admin can review it in Employee Management under Password
            Reset Requests and share a new temporary password.
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
            <Field label="JSID">
              <Input value={jsid} onChange={(event) => setJsid(event.target.value)} placeholder="JS0001" />
            </Field>
            {error ? <p className="rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{error}</p> : null}
            <Button>Submit request</Button>
          </form>
        )}
        <Link className="mt-5 inline-flex text-sm text-blue-300 hover:text-blue-200" to="/login">
          Back to login
        </Link>
      </Card>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { isDemoMode, submitRegistration } = useAuth();
  const { submitRegistrationRequest } = useWorkTrackData();
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Content');
  const [requestedRole, setRequestedRole] = useState('employee');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (isDemoMode) {
        submitRegistrationRequest({ name, department, requestedRole: requestedRole as 'employee' | 'team_lead' | 'manager' });
      } else {
        await submitRegistration({ name, department, requestedRole });
      }
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Registration failed.');
    }
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-semibold text-white">Self Registration</h1>
        <p className="mt-2 text-sm text-zinc-400">
          This request does not create a password yet. After approval, the Super Admin shares your JSID and temporary
          password. You set your own password on first login.
        </p>
        {submitted ? (
          <div className="mt-6 rounded-xl bg-blue-500/12 p-4 text-sm text-blue-100">
            Your registration is pending Super Admin approval. After approval, the Super Admin shares your JSID and a
            temporary password.
          </div>
        ) : (
          <form className="mt-6 grid gap-4" onSubmit={(event) => void submit(event)}>
            <Field label="Full name">
              <Input value={name} onChange={(event) => setName(event.target.value)} required />
            </Field>
            <Field label="Department">
              <Input value={department} onChange={(event) => setDepartment(event.target.value)} required />
            </Field>
            <Field label="Requested role">
              <Select value={requestedRole} onChange={(event) => setRequestedRole(event.target.value)}>
                <option value="employee">Employee</option>
                <option value="team_lead">Team Lead</option>
                <option value="manager">Manager</option>
              </Select>
            </Field>
            {error ? <p className="rounded-xl bg-red-500/12 p-3 text-sm text-red-200">{error}</p> : null}
            <Button>Submit registration</Button>
          </form>
        )}
        <Link className="mt-5 inline-flex text-sm text-blue-300 hover:text-blue-200" to="/login">
          Back to login
        </Link>
      </Card>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-400" />
      {children}
    </main>
  );
}
