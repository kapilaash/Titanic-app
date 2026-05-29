// components/SummaryCards.js
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSummary } from '../api/queries';

const formatNumber = (value, decimals = 0, suffix = '') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
};

const SummaryCards = ({ compact = false }) => {
  const { data: summary, isLoading, isError } = useQuery({
    queryKey: ['summary'],
    queryFn: fetchSummary,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-4 text-sm font-semibold text-rose-100">
        Unable to load summary data from the backend.
      </div>
    );
  }

  if (!summary) return null;

  const cards = [
    {
      title: 'Passengers',
      value: formatNumber(summary.Age?.count),
      helper: 'dataset scope',
      tone: 'text-cyan-100',
    },
    {
      title: 'Avg Age',
      value: formatNumber(summary.Age?.mean, 1, ' yrs'),
      helper: 'mean passenger age',
      tone: 'text-emerald-100',
    },
    {
      title: 'Avg Fare',
      value: Number.isFinite(Number(summary.Fare?.mean)) ? `$${Number(summary.Fare.mean).toFixed(2)}` : '—',
      helper: 'mean ticket price',
      tone: 'text-violet-100',
    },
    {
      title: 'Survival',
      value: Number.isFinite(Number(summary.Survived?.mean)) ? `${(Number(summary.Survived.mean) * 100).toFixed(1)}%` : '—',
      helper: 'overall rate',
      tone: 'text-amber-100',
    },
  ];

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
      {cards.map((card) => (
        <div
          key={card.title}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.085]"
        >
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{card.title}</div>
          <div className={`mt-2 text-2xl font-black tracking-[-0.05em] ${card.tone}`}>{card.value}</div>
          <div className="mt-1 text-[11px] font-semibold text-slate-500">{card.helper}</div>
        </div>
      ))}
    </div>
  );
};

export default SummaryCards;
