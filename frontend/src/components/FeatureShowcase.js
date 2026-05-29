// components/FeatureShowcase.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  EXPLORATION_EVENT,
  EXPLORATION_TASKS,
  getExplorationProgress,
  openCopilotFromMission,
  requestMissionGuide,
  resetExplorationProgress,
  trackFrontendEvent,
} from '../utils/explorationProgress';

const featureGroups = [
  {
    title: 'Data Foundation',
    icon: '01',
    description: 'The platform begins with a live backend boundary, cleaned passenger schema, and reusable query contracts.',
    items: ['Supabase/local fallback loading', 'Centralized API client', 'React Query caching', 'Stable response contracts'],
  },
  {
    title: 'Retrieval + Search',
    icon: '02',
    description: 'Passenger discovery becomes search-first instead of table-first, which makes the dataset feel interactive.',
    items: ['Typo-tolerant lookup', 'Dataset-wide sorting', 'Debounced queries', 'Paginated responses'],
  },
  {
    title: 'Analytics Layer',
    icon: '03',
    description: 'Survival charts and correlation analysis communicate evidence before showing raw visuals.',
    items: ['Survival breakdowns', 'Correlation matrix', 'Narrative metrics', 'Backend-driven charts'],
  },
  {
    title: 'Machine Learning',
    icon: '04',
    description: 'The ML layer exposes model outputs, feature importance, and prediction behavior from API responses.',
    items: ['Random Forest model', 'Accuracy from backend', 'Feature impact', 'Prediction examples'],
  },
  {
    title: 'Tate AI Interface',
    icon: '05',
    description: 'Tate becomes the cognitive layer that guides visitors, explains architecture, and answers context-aware questions.',
    items: ['Context-aware chat', 'Quick actions', 'Memory controls', 'Backend health awareness'],
  },
  {
    title: 'Operations Story',
    icon: '06',
    description: 'Observability tools make the project feel production-conscious instead of only visually polished.',
    items: ['Prometheus metrics', 'Grafana dashboards', 'Alertmanager routing', 'Pyroscope profiling'],
  },
];

const getCompletedCount = (progress) => EXPLORATION_TASKS.reduce((count, task) => count + (progress[task.id] ? 1 : 0), 0);

const getSectionLabel = (section) => ({
  dashboard: 'Command',
  analysis: 'Analysis',
  regression: 'ML Lab',
  data: 'Explorer',
  copilot: 'Tate AI',
  engineering: 'Build Story',
}[section] || section);

const FeatureShowcase = ({ datasetInfo, connectionStatus, onNavigate }) => {
  const [progress, setProgress] = useState(() => getExplorationProgress());
  const [expandedGroup, setExpandedGroup] = useState('Data Foundation');

  useEffect(() => {
    const handleProgressChange = (event) => {
      setProgress(event.detail || getExplorationProgress());
    };

    window.addEventListener(EXPLORATION_EVENT, handleProgressChange);
    return () => window.removeEventListener(EXPLORATION_EVENT, handleProgressChange);
  }, []);

  useEffect(() => {
    trackFrontendEvent({
      eventName: 'build_story_page_viewed',
      section: 'engineering',
      metadata: {
        completedTasks: getCompletedCount(getExplorationProgress()),
        totalTasks: EXPLORATION_TASKS.length,
      },
    });
  }, []);

  const completedCount = useMemo(() => getCompletedCount(progress), [progress]);
  const progressPercent = Math.round((completedCount / EXPLORATION_TASKS.length) * 100);
  const nextTask = EXPLORATION_TASKS.find((task) => !progress[task.id]);
  const activeGroup = featureGroups.find((group) => group.title === expandedGroup) || featureGroups[0];

  const handleMissionAction = (task) => {
    if (!task) return;
    requestMissionGuide(task.id);

    if (task.section === 'copilot') {
      openCopilotFromMission();
      return;
    }

    if (task.section && onNavigate) {
      onNavigate(task.section);
    }
  };

  const handleResetJourney = () => {
    resetExplorationProgress();
    setProgress(getExplorationProgress());
  };

  return (
    <section className="space-y-6">
      <div className="premium-card p-6 md:p-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-center">
          <div>
            <p className="kicker text-violet-200">Build Story</p>
            <h2 className="mt-4 text-5xl font-black leading-[0.9] tracking-[-0.08em] text-white md:text-7xl">
              Architecture that feels visible.
            </h2>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-slate-400 md:text-base">
              This page explains why the product is more than a Titanic dashboard: it has data contracts, retrieval, machine learning, AI guidance, and observability as deliberate system layers.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {nextTask ? (
                <button
                  type="button"
                  onClick={() => handleMissionAction(nextTask)}
                  className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-violet-50"
                >
                  Continue: {nextTask.title} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMissionAction(EXPLORATION_TASKS[0])}
                  className="rounded-2xl bg-white px-6 py-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-violet-50"
                >
                  Restart guided exploration
                </button>
              )}
              <button
                type="button"
                onClick={handleResetJourney}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.1]"
              >
                Reset progress
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.75rem] border border-cyan-200/15 bg-cyan-300/10 p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100/80">Journey</div>
              <div className="mt-3 text-5xl font-black tracking-[-0.08em] text-white">{progressPercent}%</div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/[0.08]">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400" style={{ width: `${progressPercent}%` }} />
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-400">{completedCount}/{EXPLORATION_TASKS.length} exploration tasks completed.</p>
            </div>

            <div className="rounded-[1.75rem] border border-emerald-200/15 bg-emerald-300/10 p-6">
              <div className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100/80">Dataset</div>
              <div className="mt-3 text-5xl font-black tracking-[-0.08em] text-white">
                {datasetInfo?.shape?.[0] ? new Intl.NumberFormat('en-US').format(datasetInfo.shape[0]) : '—'}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-slate-400">
                {datasetInfo?.shape?.[1] ? `${datasetInfo.shape[1]} available features` : 'Feature count unavailable'} · {connectionStatus === 'connected' ? 'backend online' : 'backend pending'}.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="premium-card p-5 md:p-6">
          <p className="kicker text-cyan-200">System Layers</p>
          <div className="mt-5 grid gap-3">
            {featureGroups.map((group) => (
              <button
                key={group.title}
                type="button"
                onClick={() => setExpandedGroup(group.title)}
                className={`rounded-[1.35rem] border p-4 text-left transition-all duration-300 ${
                  expandedGroup === group.title
                    ? 'border-cyan-200/25 bg-cyan-300/10 text-white'
                    : 'border-white/10 bg-white/[0.04] text-slate-400 hover:bg-white/[0.07] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/45 text-xs font-black text-cyan-100">
                    {group.icon}
                  </div>
                  <div>
                    <div className="font-black">{group.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{group.items.length} proof points</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="premium-card p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="kicker text-violet-200">Active Layer</p>
              <h3 className="mt-3 text-4xl font-black tracking-[-0.06em] text-white">{activeGroup.title}</h3>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">{activeGroup.description}</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/[0.06] text-xl font-black text-cyan-100">
              {activeGroup.icon}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {activeGroup.items.map((item) => (
              <div key={item} className="rounded-[1.5rem] border border-white/10 bg-slate-950/45 p-5">
                <div className="text-sm font-black text-white">{item}</div>
                <p className="mt-2 text-xs leading-relaxed text-slate-500">Designed to support credibility, clarity, and product-grade UX.</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="premium-card p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="kicker text-emerald-200">Mission Map</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">Every action proves a product capability.</h3>
          </div>
          <div className="text-sm font-semibold text-slate-500">{completedCount}/{EXPLORATION_TASKS.length} completed</div>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {EXPLORATION_TASKS.map((task) => {
            const isDone = Boolean(progress[task.id]);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => handleMissionAction(task)}
                className={`rounded-[1.35rem] border p-4 text-left transition-all duration-300 ${
                  isDone
                    ? 'border-emerald-200/18 bg-emerald-300/10'
                    : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.07]'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-sm font-black ${isDone ? 'border-emerald-200/20 bg-emerald-300/10 text-emerald-100' : 'border-white/10 bg-slate-950/45 text-slate-400'}`}>
                    {isDone ? '✓' : task.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-black text-white">{task.title}</div>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500">
                        {getSectionLabel(task.section)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">{task.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeatureShowcase;
