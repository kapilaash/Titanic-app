// components/common/DataState.jsx
import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

export const LoadingText = ({ children = 'Syncing backend signal…', className = '' }) => (
  <div className={cn('inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500', className)}>
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-45" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-200" />
    </span>
    {children}
  </div>
);

export const SkeletonLine = ({ className = '' }) => (
  <span className={cn('data-skeleton block rounded-full', className)} />
);

export const MetricSkeletonValue = ({ label = 'Calibrating signal…' }) => (
  <div className="py-1">
    <div className="flex items-end gap-2">
      <SkeletonLine className="h-10 w-24 md:h-12 md:w-32" />
      <SkeletonLine className="mb-2 h-4 w-10" />
    </div>
    <LoadingText className="mt-3">{label}</LoadingText>
  </div>
);

export const MetricCardSkeleton = ({ compact = false, label = 'Loading intelligence…' }) => (
  <div className={cn('relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4', compact ? 'min-h-[6rem]' : 'min-h-[7rem]')}>
    <div className="data-scan-line" />
    <SkeletonLine className="h-3 w-20" />
    <SkeletonLine className="mt-4 h-8 w-28" />
    <LoadingText className="mt-3">{label}</LoadingText>
  </div>
);

export const MiniMetricSkeleton = ({ label = 'Syncing…' }) => (
  <div>
    <SkeletonLine className="h-3 w-16" />
    <SkeletonLine className="mt-3 h-6 w-20" />
    <div className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</div>
  </div>
);

export const ChartLoadingPanel = ({
  title = 'Loading intelligence view',
  description = 'The backend is preparing chart-ready analytics.',
  bars = 7,
}) => {
  const heights = [52, 72, 44, 86, 64, 38, 78, 56];

  return (
    <div className="relative min-h-[26rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker text-cyan-200">Backend Sync</p>
            <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{title}</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{description}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4">
            <MetricSkeletonValue label="Signal incoming…" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <SkeletonLine className="h-4 w-24" />
              <SkeletonLine className="mt-3 h-3 w-14" />
            </div>
          ))}
        </div>

        <div className="flex h-56 items-end gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-5">
          {Array.from({ length: bars }).map((_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center justify-end gap-3">
              <div
                className="data-skeleton w-full rounded-t-2xl"
                style={{ height: `${heights[index % heights.length]}%` }}
              />
              <SkeletonLine className="h-2 w-10" />
            </div>
          ))}
        </div>

        <LoadingText>Fetching live analytics from backend…</LoadingText>
      </div>
    </div>
  );
};

export const HeatmapLoadingPanel = () => (
  <div className="relative min-h-[26rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-6">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />
    <p className="kicker text-violet-200">Correlation Matrix</p>
    <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Mapping feature relationships</h3>
    <p className="mt-2 text-sm text-slate-500">The backend is preparing the numeric correlation grid.</p>
    <div className="mt-6 grid w-full max-w-4xl grid-cols-6 gap-2 rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-8 md:grid-cols-10">
      {Array.from({ length: 60 }).map((_, index) => (
        <div key={index} className="data-skeleton aspect-square rounded-xl" />
      ))}
    </div>
    <LoadingText className="mt-5">Computing relationship strengths…</LoadingText>
  </div>
);

export const ModelLoadingPanel = () => (
  <div className="relative min-h-[30rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-6">
    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/60 to-transparent" />
    <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
    <p className="kicker text-violet-200">ML Intelligence Sync</p>
    <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Calibrating model diagnostics</h3>
    <p className="mt-2 text-sm text-slate-500">Accuracy, validation folds, feature importance, and sample predictions are being fetched from the backend.</p>

    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {['Accuracy', 'Precision', 'Recall', 'F1 Score'].map((label) => (
        <div key={label} className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">{label}</div>
          <MetricSkeletonValue label="Awaiting model endpoint…" />
        </div>
      ))}
    </div>

    <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="mt-4 h-9 w-64 max-w-full" />
        <SkeletonLine className="mt-4 h-3 w-full" />
        <SkeletonLine className="mt-2 h-3 w-4/5" />
      </div>
      <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-6">
        <SkeletonLine className="h-4 w-36" />
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
              <SkeletonLine className="h-3 w-12" />
              <SkeletonLine className="mt-3 h-6 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>

    <LoadingText className="mt-6">Model signal handshake in progress…</LoadingText>
  </div>
);

export const TableLoadingPanel = ({ columns = 6, rows = 8 }) => (
  <div className="w-full rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <SkeletonLine className="h-4 w-36" />
        <SkeletonLine className="mt-3 h-3 w-56" />
      </div>
      <LoadingText>Retrieving passenger records…</LoadingText>
    </div>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, columnIndex) => (
            <SkeletonLine key={`${rowIndex}-${columnIndex}`} className={cn('h-4', columnIndex === 1 ? 'w-full' : 'w-4/5')} />
          ))}
        </div>
      ))}
    </div>
  </div>
);

export const EmptyDataPanel = ({ title = 'No data returned', description = 'Try refreshing or changing your query.' }) => (
  <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-8 text-center">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-lg text-slate-300">⌁</div>
    <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
    <p className="mt-2 text-sm text-slate-500">{description}</p>
  </div>
);
