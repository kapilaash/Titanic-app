// components/CorrelationHeatmap.js
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCorrelation } from '../api/queries';

const getCorrelationStyle = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return { backgroundColor: 'rgba(148, 163, 184, 0.08)', color: '#94a3b8' };
  }

  const intensity = Math.min(Math.abs(numeric), 1);
  if (numeric > 0) {
    return {
      backgroundColor: `rgba(52, 211, 153, ${0.12 + intensity * 0.68})`,
      color: intensity > 0.48 ? '#ecfdf5' : '#d1fae5',
    };
  }

  return {
    backgroundColor: `rgba(251, 113, 133, ${0.12 + intensity * 0.68})`,
    color: intensity > 0.48 ? '#fff1f2' : '#ffe4e6',
  };
};

const getStrength = (value) => {
  const absoluteValue = Math.abs(Number(value));
  if (!Number.isFinite(absoluteValue)) return 'Unknown';
  if (absoluteValue >= 0.7) return 'Very strong';
  if (absoluteValue >= 0.5) return 'Strong';
  if (absoluteValue >= 0.3) return 'Moderate';
  if (absoluteValue >= 0.1) return 'Weak';
  return 'Very weak';
};

const CorrelationHeatmap = () => {
  const [selectedCell, setSelectedCell] = useState(null);

  const { data: correlation, isLoading, isError } = useQuery({
    queryKey: ['correlation'],
    queryFn: fetchCorrelation,
    staleTime: 1000 * 60 * 5,
  });

  const features = useMemo(() => Object.keys(correlation || {}), [correlation]);

  const strongestPair = useMemo(() => {
    if (!correlation || features.length === 0) return null;

    let strongest = null;
    features.forEach((rowFeature) => {
      features.forEach((columnFeature) => {
        if (rowFeature === columnFeature) return;
        const value = Number(correlation?.[rowFeature]?.[columnFeature]);
        if (!Number.isFinite(value)) return;
        if (!strongest || Math.abs(value) > Math.abs(strongest.value)) {
          strongest = { rowFeature, columnFeature, value };
        }
      });
    });

    return strongest;
  }, [correlation, features]);

  if (isLoading) {
    return (
      <div className="flex min-h-[26rem] items-center justify-center">
        <div className="h-12 w-12 rounded-full border-2 border-cyan-200 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-300/20 bg-rose-500/10 p-6 text-rose-100">
        Unable to load correlation data. Please check the backend connection.
      </div>
    );
  }

  if (!correlation || features.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker text-violet-200">Correlation Matrix</p>
          <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">Feature relationships</h3>
          <p className="mt-2 text-sm text-slate-500">Click any cell to inspect relationship strength.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-right">
          <div className="text-sm font-black text-white">
            {strongestPair ? `${strongestPair.rowFeature} ↔ ${strongestPair.columnFeature}` : '—'}
          </div>
          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">strongest pair</div>
        </div>
      </div>

      {selectedCell && (
        <div className="rounded-2xl border border-cyan-200/20 bg-cyan-300/10 p-4">
          <div className="text-sm font-black text-cyan-100">
            {selectedCell.rowFeature} ↔ {selectedCell.columnFeature}: {Number(selectedCell.value).toFixed(3)}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {getStrength(selectedCell.value)} {Number(selectedCell.value) >= 0 ? 'positive' : 'negative'} relationship.
          </p>
        </div>
      )}

      <div className="overflow-x-auto mobile-scroll rounded-[1.5rem] border border-white/10 bg-slate-950/45">
        <table className="min-w-max border-separate border-spacing-1 p-3">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 rounded-xl bg-slate-950 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Feature
              </th>
              {features.map((feature) => (
                <th key={feature} className="px-2 py-3 text-center text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                  <span className="inline-block max-w-[5.5rem] truncate align-bottom" title={feature}>{feature}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((rowFeature) => (
              <tr key={rowFeature}>
                <th className="sticky left-0 z-10 rounded-xl bg-slate-950 px-3 py-2 text-left text-xs font-black text-slate-300">
                  {rowFeature}
                </th>
                {features.map((columnFeature) => {
                  const value = correlation?.[rowFeature]?.[columnFeature];
                  const numeric = Number(value);
                  const isSelected = selectedCell?.rowFeature === rowFeature && selectedCell?.columnFeature === columnFeature;

                  return (
                    <td key={`${rowFeature}-${columnFeature}`} className="p-0.5">
                      <button
                        type="button"
                        onClick={() => setSelectedCell({ rowFeature, columnFeature, value: numeric })}
                        className={`h-12 w-16 rounded-xl text-xs font-black transition hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-300 ${isSelected ? 'ring-2 ring-cyan-200' : ''}`}
                        style={getCorrelationStyle(numeric)}
                        title={`${rowFeature} vs ${columnFeature}: ${Number.isFinite(numeric) ? numeric.toFixed(3) : 'N/A'}`}
                      >
                        {Number.isFinite(numeric) ? numeric.toFixed(2) : '—'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          ['Positive', 'Values closer to +1 move together.', 'bg-emerald-300/15 text-emerald-100'],
          ['Near Zero', 'Values near 0 have weak linear relation.', 'bg-slate-300/10 text-slate-200'],
          ['Negative', 'Values closer to -1 move in opposite directions.', 'bg-rose-300/15 text-rose-100'],
        ].map(([title, copy, style]) => (
          <div key={title} className={`rounded-2xl border border-white/10 p-4 ${style}`}>
            <div className="text-sm font-black">{title}</div>
            <p className="mt-1 text-xs leading-relaxed opacity-75">{copy}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
