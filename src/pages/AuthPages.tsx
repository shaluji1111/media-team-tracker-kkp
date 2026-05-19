import { Eye, EyeOff, Sparkles, UserPlus } from 'lucide-react';
import { type FormEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
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
  const [isTyping, setIsTyping] = useState(false);

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
    <main className="grid min-h-screen overflow-hidden bg-[#F7F3EA] text-[#202124] lg:grid-cols-[1.06fr_0.94fr]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#DB2777] px-10 py-9 text-white lg:flex xl:px-14">
        <div className="absolute inset-0 opacity-[0.13] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative z-10 flex items-center gap-3">
          <img
            src={khulKePuchoLogo}
            alt="Khul Ke Pucho"
            className="size-12 rounded-2xl bg-white object-cover p-1 shadow-lg shadow-pink-950/25"
          />
          <div>
            <p className="text-lg font-semibold leading-tight">Khul Ke Pucho</p>
            <p className="text-xs font-medium text-white/70">Media team KPI workspace</p>
          </div>
        </div>

        <div className="relative z-10 flex flex-1 items-end justify-center pb-8 pt-8">
          <AnimatedLoginCharacters isTyping={isTyping} passwordVisible={showPassword && password.length > 0} />
        </div>

        <div className="relative z-10 grid gap-3">
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.05] text-white xl:text-5xl">
            Track work, approvals, and performance in one place.
          </h1>
          <p className="max-w-lg text-sm leading-6 text-white/75">
            A focused internal workspace for daily task logging and social media operations.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
        <div className="w-full max-w-[430px]">
          <div className="mb-10 flex justify-center lg:hidden">
            <img
              src={khulKePuchoLogo}
              alt="Khul Ke Pucho"
              className="h-auto w-full max-w-[210px] rounded-2xl bg-white p-2 shadow-sm"
            />
          </div>

          <div className="mb-9 text-center">
            <div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-2xl bg-pink-100 text-pink-700">
              <Sparkles size={20} />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-[#202124]">Welcome back</h2>
            <p className="mt-2 text-sm text-[#696969]">Sign in with your JSID and password.</p>
          </div>

          <form className="grid gap-5" onSubmit={(event) => void onSubmit(event)}>
            <label className="grid gap-2 text-sm font-semibold text-[#2D2D2D]">
              <span>JSID</span>
              <Input
                value={jsid}
                onBlur={() => setIsTyping(false)}
                onChange={(event) => setJsid(event.target.value)}
                onFocus={() => setIsTyping(true)}
                placeholder="JS0001"
                className="min-h-12 rounded-xl border-[#DDD6C7] bg-white px-4 !text-[#DB2777] [-webkit-text-fill-color:#DB2777] shadow-sm [caret-color:#DB2777] placeholder:text-[#A8A196] focus:border-pink-500 focus:ring-pink-500/15"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold text-[#2D2D2D]">
              <span>Password</span>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onBlur={() => setIsTyping(false)}
                  onChange={(event) => setPassword(event.target.value)}
                  onFocus={() => setIsTyping(true)}
                  className="min-h-12 rounded-xl border-[#DDD6C7] bg-white px-4 pr-12 !text-[#DB2777] [-webkit-text-fill-color:#DB2777] shadow-sm [caret-color:#DB2777] placeholder:text-[#A8A196] focus:border-pink-500 focus:ring-pink-500/15"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-[#696969] transition hover:bg-[#F1E9DC] hover:text-[#202124]"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2.5 font-medium text-[#565656]">
                <input
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                  type="checkbox"
                  className="size-4 rounded border-[#BDB5A8] accent-pink-600"
                />
                Remember me
              </label>
              <Link className="font-semibold text-pink-700 transition hover:text-pink-600" to="/forgot-password">
                Forgot password?
              </Link>
            </div>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

            <Button
              type="submit"
              disabled={loading}
              className="min-h-12 rounded-xl bg-[#DB2777] text-base font-semibold text-white shadow-lg shadow-pink-200 hover:bg-[#BE185D]"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/register')}
              className="min-h-12 rounded-xl border-[#DDD6C7] bg-white text-[#2D2D2D] hover:bg-[#F1E9DC]"
            >
              <UserPlus size={18} />
              Self-register
            </Button>
          </form>

          <p className="mt-8 text-center text-xs leading-5 text-[#80796F]">
            Access is limited to approved Khul Ke Pucho team members.
          </p>
        </div>
      </section>
    </main>
  );
}

function AnimatedLoginCharacters({
  isTyping,
  passwordVisible,
}: {
  isTyping: boolean;
  passwordVisible: boolean;
}) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    let blinkTimeout: number | undefined;

    const scheduleBlink = () => {
      blinkTimeout = window.setTimeout(
        () => {
          setIsPurpleBlinking(true);
          window.setTimeout(() => {
            setIsPurpleBlinking(false);
            scheduleBlink();
          }, 150);
        },
        Math.random() * 4000 + 3000,
      );
    };

    scheduleBlink();
    return () => window.clearTimeout(blinkTimeout);
  }, []);

  useEffect(() => {
    let blinkTimeout: number | undefined;

    const scheduleBlink = () => {
      blinkTimeout = window.setTimeout(
        () => {
          setIsBlackBlinking(true);
          window.setTimeout(() => {
            setIsBlackBlinking(false);
            scheduleBlink();
          }, 150);
        },
        Math.random() * 4000 + 3000,
      );
    };

    scheduleBlink();
    return () => window.clearTimeout(blinkTimeout);
  }, []);

  useEffect(() => {
    if (!isTyping) {
      setIsLookingAtEachOther(false);
      return undefined;
    }

    setIsLookingAtEachOther(true);
    const timer = window.setTimeout(() => setIsLookingAtEachOther(false), 800);
    return () => window.clearTimeout(timer);
  }, [isTyping]);

  useEffect(() => {
    if (!passwordVisible) {
      setIsPurplePeeking(false);
      return undefined;
    }

    const peekTimer = window.setTimeout(
      () => {
        setIsPurplePeeking(true);
        window.setTimeout(() => setIsPurplePeeking(false), 800);
      },
      Math.random() * 3000 + 2000,
    );

    return () => window.clearTimeout(peekTimer);
  }, [passwordVisible, isPurplePeeking]);

  const calculatePosition = (ref: RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    return {
      faceX: Math.max(-15, Math.min(15, deltaX / 20)),
      faceY: Math.max(-10, Math.min(10, deltaY / 30)),
      bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
    };
  };

  const purplePos = calculatePosition(purpleRef);
  const blackPos = calculatePosition(blackRef);
  const yellowPos = calculatePosition(yellowRef);
  const orangePos = calculatePosition(orangeRef);

  return (
    <div className="relative h-[390px] w-[520px] max-w-full">
      <div
        ref={purpleRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: '72px',
          width: '178px',
          height: isTyping && !passwordVisible ? '420px' : '382px',
          backgroundColor: '#6C3FF5',
          borderRadius: '12px 12px 0 0',
          zIndex: 1,
          transform: passwordVisible
            ? 'skewX(0deg)'
            : isTyping
              ? `skewX(${purplePos.bodySkew - 12}deg) translateX(38px)`
              : `skewX(${purplePos.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-700 ease-in-out"
          style={{
            left: passwordVisible ? '20px' : isLookingAtEachOther ? '55px' : `${45 + purplePos.faceX}px`,
            top: passwordVisible ? '35px' : isLookingAtEachOther ? '65px' : `${40 + purplePos.faceY}px`,
          }}
        >
          <EyeBall
            size={18}
            pupilSize={7}
            maxDistance={5}
            isBlinking={isPurpleBlinking}
            forceLookX={passwordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={passwordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
          />
          <EyeBall
            size={18}
            pupilSize={7}
            maxDistance={5}
            isBlinking={isPurpleBlinking}
            forceLookX={passwordVisible ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
            forceLookY={passwordVisible ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
          />
        </div>
      </div>

      <div
        ref={blackRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: '240px',
          width: '118px',
          height: '302px',
          backgroundColor: '#2D2D2D',
          borderRadius: '10px 10px 0 0',
          zIndex: 2,
          transform: passwordVisible
            ? 'skewX(0deg)'
            : isLookingAtEachOther
              ? `skewX(${blackPos.bodySkew * 1.5 + 10}deg) translateX(20px)`
              : `skewX(${isTyping ? blackPos.bodySkew * 1.5 : blackPos.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-700 ease-in-out"
          style={{
            left: passwordVisible ? '10px' : isLookingAtEachOther ? '32px' : `${26 + blackPos.faceX}px`,
            top: passwordVisible ? '28px' : isLookingAtEachOther ? '12px' : `${32 + blackPos.faceY}px`,
          }}
        >
          <EyeBall
            size={16}
            pupilSize={6}
            maxDistance={4}
            isBlinking={isBlackBlinking}
            forceLookX={passwordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={passwordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
          />
          <EyeBall
            size={16}
            pupilSize={6}
            maxDistance={4}
            isBlinking={isBlackBlinking}
            forceLookX={passwordVisible ? -4 : isLookingAtEachOther ? 0 : undefined}
            forceLookY={passwordVisible ? -4 : isLookingAtEachOther ? -4 : undefined}
          />
        </div>
      </div>

      <div
        ref={orangeRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: '0px',
          width: '232px',
          height: '194px',
          zIndex: 3,
          backgroundColor: '#FF9B6B',
          borderRadius: '120px 120px 0 0',
          transform: passwordVisible ? 'skewX(0deg)' : `skewX(${orangePos.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-8 transition-all duration-200 ease-out"
          style={{
            left: passwordVisible ? '50px' : `${82 + orangePos.faceX}px`,
            top: passwordVisible ? '85px' : `${90 + orangePos.faceY}px`,
          }}
        >
          <Pupil forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
          <Pupil forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
        </div>
      </div>

      <div
        ref={yellowRef}
        className="absolute bottom-0 transition-all duration-700 ease-in-out"
        style={{
          left: '310px',
          width: '138px',
          height: '226px',
          backgroundColor: '#E8D754',
          borderRadius: '70px 70px 0 0',
          zIndex: 4,
          transform: passwordVisible ? 'skewX(0deg)' : `skewX(${yellowPos.bodySkew}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        <div
          className="absolute flex gap-6 transition-all duration-200 ease-out"
          style={{
            left: passwordVisible ? '20px' : `${52 + yellowPos.faceX}px`,
            top: passwordVisible ? '35px' : `${40 + yellowPos.faceY}px`,
          }}
        >
          <Pupil forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
          <Pupil forceLookX={passwordVisible ? -5 : undefined} forceLookY={passwordVisible ? -4 : undefined} />
        </div>
        <div
          className="absolute h-1 w-20 rounded-full bg-[#2D2D2D] transition-all duration-200 ease-out"
          style={{
            left: passwordVisible ? '10px' : `${40 + yellowPos.faceX}px`,
            top: passwordVisible ? '88px' : `${88 + yellowPos.faceY}px`,
          }}
        />
      </div>
    </div>
  );
}

function EyeBall({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = 'white',
  pupilColor = '#2D2D2D',
  isBlinking = false,
  forceLookX,
  forceLookY,
}: {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
}) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const eyeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };

    const eye = eyeRef.current.getBoundingClientRect();
    const deltaX = mouseX - (eye.left + eye.width / 2);
    const deltaY = mouseY - (eye.top + eye.height / 2);
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="flex items-center justify-center rounded-full transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking ? (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      ) : null}
    </div>
  );
}

function Pupil({
  size = 12,
  maxDistance = 5,
  pupilColor = '#2D2D2D',
  forceLookX,
  forceLookY,
}: {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
}) {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      setMouseX(event.clientX);
      setMouseY(event.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };
    if (forceLookX !== undefined && forceLookY !== undefined) return { x: forceLookX, y: forceLookY };

    const pupil = pupilRef.current.getBoundingClientRect();
    const deltaX = mouseX - (pupil.left + pupil.width / 2);
    const deltaY = mouseY - (pupil.top + pupil.height / 2);
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance };
  };

  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
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
