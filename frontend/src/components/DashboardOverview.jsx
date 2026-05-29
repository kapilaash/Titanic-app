// components/DashboardOverview.jsx
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import {
  getExplorationProgress,
  getNextExplorationTask,
  markExplorationTask,
  openCopilotFromMission,
  requestMissionGuide,
} from '../utils/explorationProgress';

const safeNumber = (value, fallback = null) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatInteger = (value) => {
  const numeric = safeNumber(value);
  return numeric === null ? '—' : new Intl.NumberFormat('en-US').format(numeric);
};

const formatPercent = (value) => {
  const numeric = safeNumber(value);
  return numeric === null ? '—' : `${numeric.toFixed(1)}%`;
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const fetchSummary = async () => (await api.get('/summary')).data;
const fetchSurvivalRates = async () => (await api.get('/survival_rates')).data;
const fetchModelInsights = async () => (await api.get('/regression/survival')).data;
const fetchTateHealth = async () => (await api.get('/copilot/health')).data;

const MetricBlock = ({ label, value, helper, tone = 'cyan' }) => {
  const toneMap = {
    cyan: 'from-cyan-300/24 text-cyan-100 border-cyan-200/18',
    violet: 'from-violet-300/24 text-violet-100 border-violet-200/18',
    emerald: 'from-emerald-300/24 text-emerald-100 border-emerald-200/18',
    amber: 'from-amber-300/24 text-amber-100 border-amber-200/18',
  };

  return (
    <div className={cn('group relative overflow-hidden rounded-[1.65rem] border bg-gradient-to-br via-white/[0.055] to-transparent p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.08]', toneMap[tone])}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-60" />
      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{label}</div>
      <div className="mt-3 text-4xl font-black tracking-[-0.06em] text-white md:text-5xl">{value}</div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">{helper}</p>
    </div>
  );
};

const LayerCard = ({ number, title, description, status = 'Active' }) => (
  <div className="group relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.075]">
    <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/10 blur-2xl transition-transform duration-500 group-hover:scale-125" />
    <div className="relative flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-xs font-black text-cyan-100 shadow-[0_0_30px_rgba(34,211,238,0.16)]">
        {number}
      </div>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-black text-white">{title}</h3>
          <span className="rounded-full border border-emerald-200/15 bg-emerald-300/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-200">
            {status}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
    </div>
  </div>
);

const WorkspaceButton = ({ icon, title, description, onClick, tone = 'cyan' }) => {
  const toneMap = {
    cyan: 'group-hover:border-cyan-200/30 group-hover:shadow-cyan-950/50 text-cyan-100',
    violet: 'group-hover:border-violet-200/30 group-hover:shadow-violet-950/50 text-violet-100',
    emerald: 'group-hover:border-emerald-200/30 group-hover:shadow-emerald-950/50 text-emerald-100',
    amber: 'group-hover:border-amber-200/30 group-hover:shadow-amber-950/50 text-amber-100',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group relative min-h-[11rem] overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 text-left shadow-xl shadow-slate-950/20 transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.075]', toneMap[tone])}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-50" />
      <div className="relative flex h-full flex-col justify-between">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-2xl text-white shadow-lg">{icon}</div>
          <h3 className="mt-4 text-xl font-black tracking-[-0.04em] text-white">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
        <div className="mt-5 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-300">
          Launch <span className="transition-transform group-hover:translate-x-1">→</span>
        </div>
      </div>
    </button>
  );
};

const DashboardOverview = ({ datasetInfo, connectionStatus, onNavigate }) => {
  const summaryQuery = useQuery({ queryKey: ['dashboard-summary'], queryFn: fetchSummary, staleTime: 1000 * 60 * 5 });
  const survivalQuery = useQuery({ queryKey: ['dashboard-survival-rates'], queryFn: fetchSurvivalRates, staleTime: 1000 * 60 * 5 });
  const modelQuery = useQuery({ queryKey: ['dashboard-model'], queryFn: fetchModelInsights, staleTime: 1000 * 60 * 5, retry: 1 });
  const tateHealthQuery = useQuery({ queryKey: ['dashboard-tate-health'], queryFn: fetchTateHealth, staleTime: 1000 * 30, retry: 1 });

  const progress = getExplorationProgress();
  const completedTasks = Object.values(progress).filter(Boolean).length;
  const nextTask = getNextExplorationTask(progress);
  const progressPercent = Math.round((completedTasks / Math.max(Object.keys(progress).length, 1)) * 100);

  const overview = useMemo(() => {
    const summary = summaryQuery.data || {};
    const survivalRates = survivalQuery.data || {};
    const model = modelQuery.data || {};
    const health = tateHealthQuery.data || {};

    const passengerCount =
      safeNumber(datasetInfo?.shape?.[0]) ??
      safeNumber(summary?.Age?.count) ??
      safeNumber(health?.dataset_size);

    const featureCount =
      safeNumber(datasetInfo?.shape?.[1]) ??
      safeNumber(Object.keys(summary || {}).length);

    const modelAccuracy = safeNumber(
      model?.model_performance?.accuracy !== undefined
        ? model.model_performance.accuracy * 100
        : model?.accuracy !== undefined
          ? model.accuracy * 100
          : null
    );

    const femaleRate = safeNumber(survivalRates?.by_sex?.female !== undefined ? survivalRates.by_sex.female * 100 : null);
    const maleRate = safeNumber(survivalRates?.by_sex?.male !== undefined ? survivalRates.by_sex.male * 100 : null);
    const overallSurvival = safeNumber(summary?.Survived?.mean !== undefined ? summary.Survived.mean * 100 : null);
    const documentCount = safeNumber(health?.document_count) ?? safeNumber(health?.dataset_size) ?? passengerCount;

    return {
      passengerCount,
      featureCount,
      modelAccuracy,
      femaleRate,
      maleRate,
      overallSurvival,
      documentCount,
      backendConnected: connectionStatus === 'connected',
      tateConnected: !tateHealthQuery.isError && Boolean(tateHealthQuery.data),
    };
  }, [connectionStatus, datasetInfo, modelQuery.data, summaryQuery.data, survivalQuery.data, tateHealthQuery.data, tateHealthQuery.isError]);

  const handleNavigate = (view, taskId) => {
    if (taskId) markExplorationTask(taskId);
    if (onNavigate) onNavigate(view);
  };

  const handleNextMission = () => {
    if (!nextTask) return;
    requestMissionGuide(nextTask.id);

    if (nextTask.section === 'copilot') {
      openCopilotFromMission();
      return;
    }

    if (nextTask.section && onNavigate) {
      onNavigate(nextTask.section);
    }
  };

  return (
    <div className="space-y-6">
      <section className="premium-card min-h-[34rem] p-6 md:p-10 lg:p-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative grid gap-10 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-3 rounded-full border border-cyan-200/15 bg-cyan-300/10 px-4 py-2">
              <span className={`h-2.5 w-2.5 rounded-full ${overview.backendConnected ? 'bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.9)]' : 'bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.8)]'}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">
                {overview.backendConnected ? 'Live intelligence layer online' : 'Interface ready · backend pending'}
              </span>
            </div>

            <h1 className="mt-8 max-w-5xl text-5xl font-black leading-[0.88] tracking-[-0.08em] text-white md:text-7xl xl:text-8xl">
              Titanic Intelligence Operating System.
            </h1>

            <p className="mt-7 max-w-3xl text-base leading-8 text-slate-400 md:text-lg">
              A cinematic analytics platform that combines live backend data, retrieval-aware passenger discovery, machine learning interpretation, and Tate AI into one portfolio-grade command experience.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleNavigate('analysis', 'analysisViewed')}
                className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 shadow-[0_18px_55px_rgba(255,255,255,0.12)] transition hover:-translate-y-0.5 hover:bg-cyan-50"
              >
                Launch intelligence workspace →
              </button>
              <button
                type="button"
                onClick={() => {
                  markExplorationTask('aiOpened');
                  openCopilotFromMission();
                }}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.1]"
              >
                Meet Tate AI
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <MetricBlock label="Passenger Records" value={formatInteger(overview.passengerCount)} helper="Backend dataset scope displayed without hardcoding." tone="cyan" />
            <MetricBlock label="Model Accuracy" value={formatPercent(overview.modelAccuracy)} helper="Shown only from the backend model endpoint." tone="violet" />
            <MetricBlock label="Overall Survival" value={formatPercent(overview.overallSurvival)} helper="Computed from the summary endpoint." tone="emerald" />
            <MetricBlock label="Search Index" value={formatInteger(overview.documentCount)} helper="Tate/search coverage from health metadata." tone="amber" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="premium-card p-6 md:p-8">
          <p className="kicker text-violet-200">Mission Progress</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">Guide visitors through the product, not around it.</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            The platform now behaves like a guided intelligence product. Each completed action proves a real feature: dashboard, search, sorting, ML, AI, and architecture.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-black text-white">{nextTask?.title || 'Journey complete'}</div>
                <div className="mt-1 text-xs text-slate-500">{nextTask?.layer || 'All exploration tasks finished'}</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-cyan-100">{progressPercent}%</div>
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">complete</div>
              </div>
            </div>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" style={{ width: `${progressPercent}%` }} />
            </div>
            <button
              type="button"
              onClick={handleNextMission}
              disabled={!nextTask}
              className="mt-5 w-full rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {nextTask ? `Continue: ${nextTask.actionLabel}` : 'All missions completed'}
            </button>
          </div>
        </div>

        <div className="premium-card p-6 md:p-8">
          <p className="kicker text-cyan-200">Architecture Spine</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">Five layers that make the project feel larger than the dataset.</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <LayerCard number="01" title="Data Service" description="Structured passenger records, summaries, and model-ready inputs from the backend." />
            <LayerCard number="02" title="Retrieval Layer" description="Search and Tate context help users discover records instead of only reading charts." />
            <LayerCard number="03" title="Prediction Layer" description="Model metrics and feature importance are rendered from backend responses." />
            <LayerCard number="04" title="AI Interface" description="Tate becomes the cognitive interface that explains the platform and guides exploration." />
            <LayerCard number="05" title="Operations Story" description="Prometheus, Grafana, Alertmanager, and Pyroscope support production-style credibility." status="Story" />
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <WorkspaceButton icon="▧" title="Analysis" description="Narrative charts and correlation evidence for survival patterns." tone="cyan" onClick={() => handleNavigate('analysis', 'analysisViewed')} />
        <WorkspaceButton icon="◈" title="ML Lab" description="Backend model performance, feature importance, and predictions." tone="violet" onClick={() => handleNavigate('regression', 'mlViewed')} />
        <WorkspaceButton icon="▤" title="Explorer" description="Searchable, sortable records with server-side query behavior." tone="emerald" onClick={() => handleNavigate('data', 'dataExplorerOpened')} />
        <WorkspaceButton icon="⌬" title="Build Story" description="Architecture walkthrough that turns the project into a product story." tone="amber" onClick={() => handleNavigate('engineering', 'buildStoryViewed')} />
      </section>
    </div>
  );
};

export default DashboardOverview;
