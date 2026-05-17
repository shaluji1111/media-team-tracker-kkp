import clsx from 'clsx';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={clsx('rounded-2xl border border-white/8 bg-[#1A1D23] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.28)]', className)}>
      {children}
    </section>
  );
}

export function Button({
  children,
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'purple';
}) {
  return (
    <button
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/60 disabled:opacity-50',
        variant === 'primary' && 'bg-[#3B82F6] text-white hover:bg-blue-500',
        variant === 'purple' && 'bg-[#7C3AED] text-white hover:bg-violet-500',
        variant === 'secondary' && 'border border-white/12 bg-white/5 text-white hover:bg-white/10',
        variant === 'ghost' && 'text-zinc-300 hover:bg-white/8 hover:text-white',
        variant === 'danger' && 'bg-red-500/15 text-red-200 hover:bg-red-500/25',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'min-h-11 w-full rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'min-h-28 w-full rounded-xl border border-white/10 bg-[#111318] px-3 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20',
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={clsx(
        'min-h-11 w-full rounded-xl border border-white/10 bg-[#111318] px-3 text-sm text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-zinc-200">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'blue' | 'purple' | 'green' | 'yellow' | 'red' | 'neutral';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold',
        tone === 'blue' && 'border-blue-400/25 bg-blue-500/12 text-blue-200',
        tone === 'purple' && 'border-violet-400/25 bg-violet-500/12 text-violet-200',
        tone === 'green' && 'border-emerald-400/25 bg-emerald-500/12 text-emerald-200',
        tone === 'yellow' && 'border-amber-400/25 bg-amber-500/12 text-amber-200',
        tone === 'red' && 'border-red-400/25 bg-red-500/12 text-red-200',
        tone === 'neutral' && 'border-white/10 bg-white/6 text-zinc-300',
      )}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center">
      <div className="animate-modal-in max-h-[92vh] w-full overflow-auto rounded-2xl border border-white/10 bg-[#1A1D23] p-5 shadow-2xl sm:max-w-2xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <Button type="button" variant="ghost" onClick={onClose} aria-label="Close modal">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  eyebrow,
}: {
  title: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{eyebrow}</p> : null}
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
      </div>
      {action}
    </div>
  );
}
