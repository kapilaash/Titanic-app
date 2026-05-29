// components/SurvivalCharts.js
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { fetchSurvivalRates } from '../api/queries';

const chartColors = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#60a5fa'];

const toChartData = (source, labelMapper = (label) => label) => Object.entries(source || {}).map(([key, rate], index) => ({
  category: labelMapper(key),
  survivalRate: Number(rate) * 100,
  color: chartColors[index % chartColors.length],
})).filter((item) => Number.isFinite(item.survivalRate));

const SurvivalCharts = () => {
  const [activeChart, setActiveChart] = useState('class');

  const { data: survivalData, isLoading, isError } = useQuery({
    queryKey: ['survival-rates'],
    queryFn: fetchSurvivalRates,
    staleTime: 1000 * 60 * 5,
  });

  const chartConfigs = useMemo(() => {
    const byClass = toChartData(survivalData?.by_class, (pclass) => `Class ${pclass}`);
    const bySex = toChartData(survivalData?.by_sex, (sex) => sex.charAt(0).toUpperCase() + sex.slice(1));
    const byEmbarked = toChartData(survivalData?.by_embarked, (port) => ({
      C: 'Cherbourg',
      Q: 'Queenstown',
      S: 'Southampton',
    }[port] || port));
    const byTitle = toChartData(survivalData?.by_title);

    return {
      class: { data: byClass, title: 'Class hierarchy', description: 'Survival rate by ticket class', insight: byClass[0]?.survivalRate },
      sex: { data: bySex, title: 'Gender contrast', description: 'Survival rate by gender', insight: bySex[0]?.survivalRate },
      embarked: { data: byEmbarked, title: 'Boarding origin', description: 'Survival by embarkation port', insight: byEmbarked[0]?.survivalRate },
      title: { data: byTitle, title: 'Social title signal', description: 'Survival by extracted passenger title', insight: byTitle[0]?.survivalRate },
    };
  }, [survivalData]);

  const currentConfig = chartConfigs[activeChart];

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
        Unable to load survival chart data. Please check the backend connection.
      </div>
    );
  }

  if (!survivalData) return null;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-2xl border border-white/10 bg-slate-950/95 p-4 shadow-2xl backdrop-blur-xl">
          <p className="font-black text-white">{label}</p>
          <p className="mt-1 text-sm text-slate-400">
            Survival rate: <span className="font-black text-cyan-100">{Number(payload[0].value || 0).toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="kicker text-cyan-200">Survival Analysis</p>
          <h3 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white">{currentConfig.title}</h3>
          <p className="mt-2 text-sm text-slate-500">{currentConfig.description}</p>
        </div>
        <div className="w-full rounded-2xl border border-white/10 bg-white/[0.045] px-5 py-4 text-left lg:w-auto lg:text-right">
          <div className="text-3xl font-black tracking-[-0.05em] text-cyan-100">
            {Number.isFinite(currentConfig.insight) ? `${currentConfig.insight.toFixed(1)}%` : '—'}
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">lead signal</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {Object.entries(chartConfigs).map(([key, config]) => {
          const isActive = activeChart === key;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveChart(key)}
              className={`min-h-[4.9rem] rounded-2xl px-4 py-3 text-left transition-all duration-300 ${
                isActive
                  ? 'bg-white text-slate-950 shadow-[0_18px_45px_rgba(255,255,255,0.1)]'
                  : 'border border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/[0.075]'
              }`}
            >
              <div className="break-words text-sm font-black leading-tight">{config.title}</div>
              <div className={`mt-2 text-[10px] font-black uppercase leading-none tracking-[0.14em] ${isActive ? 'text-slate-500' : 'text-slate-600'}`}>
                {config.data.length} groups
              </div>
            </button>
          );
        })}
      </div>

      <div className="h-[24rem] rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={currentConfig.data} margin={{ top: 16, right: 12, left: 0, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis dataKey="category" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={{ stroke: 'rgba(148,163,184,0.2)' }} tickLine={false} tickFormatter={(value) => `${value}%`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="survivalRate" radius={[14, 14, 4, 4]}>
              {currentConfig.data.map((entry) => (
                <Cell key={entry.category} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SurvivalCharts;
