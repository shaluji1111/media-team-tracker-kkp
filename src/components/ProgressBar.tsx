import clsx from 'clsx';

import { MIN_PRODUCTIVE_HOURS } from '../lib/constants';

export function ProgressBar({ hours }: { hours: number }) {
  const percentage = Math.min((hours / MIN_PRODUCTIVE_HOURS) * 100, 100);
  const color = hours >= MIN_PRODUCTIVE_HOURS ? 'bg-emerald-400' : hours >= 3 ? 'bg-amber-400' : 'bg-red-400';

  return (
    <div>
      <div className="mb-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-semibold text-white">{hours.toFixed(1)}h</p>
          <p className="text-sm text-zinc-400">of {MIN_PRODUCTIVE_HOURS}h productive minimum</p>
        </div>
        <p className="text-2xl font-semibold text-white">{Math.round(percentage)}%</p>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/8">
        <div className={clsx('animate-progress h-full rounded-full', color)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

