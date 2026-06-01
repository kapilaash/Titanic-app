// App.js
import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchDatasetInfo } from './api/queries';
import ErrorBoundary from './components/common/ErrorBoundary';
import LoadingFallback from './components/common/LoadingFallback';
import FeatureShowcase from './components/FeatureShowcase';
// import MissionGuideModal from './components/MissionGuideModal';
import { markExplorationTask } from './utils/explorationProgress';

const DataTable = lazy(() => import('./components/DataTable'));
const SummaryCards = lazy(() => import('./components/SummaryCards'));
const SurvivalCharts = lazy(() => import('./components/SurvivalCharts'));
const CorrelationHeatmap = lazy(() => import('./components/CorrelationHeatmap'));
const RegressionAnalysis = lazy(() => import('./components/RegressionAnalysis'));
const AICopilot = lazy(() => import('./components/AICopilot'));
const DashboardOverview = lazy(() => import('./components/DashboardOverview'));

const navigationTaskMap = {
  dashboard: 'dashboardViewed',
  analysis: 'analysisViewed',
  regression: 'mlViewed',
  data: 'dataExplorerOpened',
  engineering: 'buildStoryViewed',
};

const getConnectionCopy = (status) => {
  if (status === 'connected') return 'Live backend connected';
  if (status === 'connecting') return 'Connecting to backend';
  return 'Backend unavailable';
};

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [mountedViews, setMountedViews] = useState(() => new Set(['dashboard']));
  const dashboardMetricsRef = useRef(null);
  const [showCopilotIntro, setShowCopilotIntro] = useState(() => (
    typeof window !== 'undefined' && window.localStorage.getItem('copilotIntroDismissed') !== 'true'
  ));

  const {
    data: datasetInfo,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['dataset-info'],
    queryFn: fetchDatasetInfo,
    staleTime: 1000 * 60 * 5,
  });

  const connectionStatus = isError
    ? 'error'
    : isLoading || isFetching
      ? 'connecting'
      : 'connected';

  const navigationItems = useMemo(() => [
    { id: 'dashboard', label: 'Command', icon: '◎', description: 'Executive OS' },
    { id: 'analysis', label: 'Analysis', icon: '▧', description: 'Signals' },
    { id: 'regression', label: 'ML', icon: '◈', description: 'Model' },
    { id: 'data', label: 'Explorer', icon: '▤', description: 'Records' },
    { id: 'engineering', label: 'Build', icon: '⌬', description: 'Architecture' },
  ], []);

  const handleNavigate = (viewId) => {
    setActiveView(viewId);
    setMountedViews((previousViews) => {
      if (previousViews.has(viewId)) return previousViews;
      const nextViews = new Set(previousViews);
      nextViews.add(viewId);
      return nextViews;
    });

    if (navigationTaskMap[viewId]) {
      markExplorationTask(navigationTaskMap[viewId]);
    }
  };

  useEffect(() => {
    const target = dashboardMetricsRef.current;
    if (!target || activeView !== 'dashboard') return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          markExplorationTask('dashboardViewed');
          observer.disconnect();
        }
      },
      { threshold: [0.35] }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [activeView]);

  const getViewClassName = (viewId) => (
    activeView === viewId ? 'block animate-fade-in' : 'hidden'
  );

  const shouldMountView = (viewId) => mountedViews.has(viewId);

  const dismissIntro = (persist = false) => {
    setShowCopilotIntro(false);
    if (persist && typeof window !== 'undefined') {
      window.localStorage.setItem('copilotIntroDismissed', 'true');
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell min-h-screen text-slate-100">
        <div className="app-aurora" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="premium-card max-w-md p-8 text-center animate-fade-in">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] border border-cyan-300/20 bg-cyan-300/10 shadow-[0_0_70px_rgba(34,211,238,0.24)]">
              <div className="h-10 w-10 rounded-full border-2 border-cyan-200 border-t-transparent animate-spin" />
            </div>
            <p className="mt-7 text-xs font-black uppercase tracking-[0.34em] text-cyan-200">Titanic Intelligence OS</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">Connecting command center</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">Loading backend data, model signals, and workspace state.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="app-shell min-h-screen text-slate-100">
        <div className="app-aurora" />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-6">
          <div className="premium-card max-w-lg p-8 text-center animate-slide-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-rose-300/30 bg-rose-500/10 text-3xl text-rose-200">!</div>
            <p className="mt-6 text-xs font-black uppercase tracking-[0.3em] text-rose-200">Connection Error</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Backend service is not reachable</h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-400">
              The interface is ready, but the live dataset service could not be reached. Start the Flask backend or verify the API base URL.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50"
              >
                Retry connection
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/[0.1]"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen text-slate-100">
      <div className="app-aurora" />
      <div className="app-grid" />

      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-2xl">
        <div className="container mx-auto px-4">
          <div className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
            <button
              type="button"
              onClick={() => handleNavigate('dashboard')}
              className="group flex items-center gap-3 text-left"
            >
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-cyan-200/20 bg-white/[0.06] shadow-[0_0_45px_rgba(34,211,238,0.16)]">
                <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.35),transparent_45%)]" />
                <img src="/logo.png" alt="Titanic Analytics logo" className="relative h-9 w-9 object-contain" />
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.9)]" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200/80">Titanic Intelligence</div>
                <h1 className="text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">Command Platform</h1>
              </div>
            </button>

            <nav className="glass-panel flex gap-1 overflow-x-auto rounded-[1.35rem] p-1 mobile-scroll lg:max-w-none">
              {navigationItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`group min-w-[6rem] rounded-2xl px-3 py-3 text-center transition-all duration-300 lg:min-w-[7.5rem] ${
                      isActive
                        ? 'bg-white text-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.35)]'
                        : 'text-slate-400 hover:bg-white/[0.08] hover:text-white'
                    }`}
                  >
                    <div className="text-lg leading-none">{item.icon}</div>
                    <div className="mt-1 text-xs font-black uppercase tracking-[0.12em]">{item.label}</div>
                    <div className={`mt-0.5 hidden text-[10px] font-semibold lg:block ${isActive ? 'text-slate-500' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="glass-panel flex items-center justify-between gap-4 rounded-[1.35rem] px-4 py-3 lg:min-w-[16rem]">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System</div>
                <div className="mt-1 text-sm font-black text-white">{getConnectionCopy(connectionStatus)}</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-black tracking-[-0.04em] text-cyan-100">
                  {datasetInfo?.shape?.[0] ? new Intl.NumberFormat('en-US').format(datasetInfo.shape[0]) : '—'}
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">records</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {showCopilotIntro && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xl animate-fade-in">
          <div className="premium-card w-full max-w-xl overflow-hidden animate-slide-up">
            <div className="relative p-6 sm:p-8">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
              <button
                type="button"
                onClick={() => dismissIntro(false)}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                aria-label="Close introduction"
              >
                Close
              </button>

              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.4rem] border border-cyan-200/20 bg-white shadow-[0_0_50px_rgba(34,211,238,0.22)]">
                  <img src="/Tate.svg" alt="Tate AI assistant" className="h-12 w-12 object-contain" />
                </div>
                <div className="pr-12">
                  <p className="kicker text-cyan-200">Meet Tate</p>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">Your cognitive interface for the platform.</h2>
                  <p className="mt-4 text-sm leading-relaxed text-slate-400">
                    Tate explains the engineering, guides visitors through the product, and answers backend-aware questions about passengers, survival patterns, and model behavior.
                  </p>
                </div>
              </div>

              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {[
                  ['Guided', 'Navigate the product without guessing.'],
                  ['Backend-aware', 'Ask about live metrics and records.'],
                  ['Portfolio-ready', 'Show architecture, not only charts.'],
                ].map(([title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
                    <div className="text-sm font-black text-white">{title}</div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => dismissIntro(true)}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-black text-slate-200 transition hover:bg-white/[0.1]"
                >
                  Do not show again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    dismissIntro(false);
                    window.setTimeout(() => {
                      document.querySelector('[aria-label="Open Tate assistant"]')?.click();
                    }, 200);
                  }}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50"
                >
                  Open Tate →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 container mx-auto px-4 py-6 md:py-10">
        {shouldMountView('dashboard') && (
          <div className={`${getViewClassName('dashboard')} space-y-8`}>
            <section ref={dashboardMetricsRef}>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback label="Loading command center..." />}>
                  <DashboardOverview
                    datasetInfo={datasetInfo}
                    connectionStatus={connectionStatus}
                    onNavigate={handleNavigate}
                  />
                </Suspense>
              </ErrorBoundary>
            </section>
          </div>
        )}

        {shouldMountView('analysis') && (
          <div className={`${getViewClassName('analysis')} space-y-8`}>
            <section className="premium-card p-5 md:p-8">
              <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="kicker text-cyan-200">Signal Analysis</p>
                  <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">Who survived?</h2>
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
                    Survival was not random. Explore class, gender, title, embarkation, and feature relationships through backend-driven visual evidence.
                  </p>
                </div>
                <Suspense fallback={<LoadingFallback label="Loading metrics..." />}>
                  <SummaryCards compact />
                </Suspense>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(25rem,0.72fr)_minmax(0,1.28fr)]">
                <div className="min-w-0 rounded-[2rem] border border-white/10 bg-slate-950/50 p-4 md:p-6">
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback label="Loading survival charts..." />}>
                      <SurvivalCharts />
                    </Suspense>
                  </ErrorBoundary>
                </div>
                <div className="min-w-0 rounded-[2rem] border border-white/10 bg-slate-950/50 p-4 md:p-6">
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingFallback label="Loading correlation heatmap..." />}>
                      <CorrelationHeatmap />
                    </Suspense>
                  </ErrorBoundary>
                </div>
              </div>
            </section>
          </div>
        )}

        {shouldMountView('regression') && (
          <div className={getViewClassName('regression')}>
            <section className="premium-card p-5 md:p-8">
              <div className="mb-8 max-w-4xl">
                <p className="kicker text-violet-200">Machine Learning Lab</p>
                <h2 className="mt-3 text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">Model intelligence, made visible.</h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400 md:text-base">
                  Inspect performance, feature impact, and prediction behavior from the backend model layer without hardcoding frontend claims.
                </p>
              </div>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback label="Loading machine learning insights..." />}>
                  <RegressionAnalysis />
                </Suspense>
              </ErrorBoundary>
            </section>
          </div>
        )}

        {shouldMountView('data') && (
          <div className={getViewClassName('data')}>
            <section className="premium-card overflow-hidden">
              <div className="border-b border-white/10 p-5 md:p-8">
                <p className="kicker text-emerald-200">Intelligence Explorer</p>
                <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-4xl font-black tracking-[-0.06em] text-white md:text-6xl">Search the passenger universe.</h2>
                    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400 md:text-base">
                      Dataset-wide search, server-backed sorting, and paginated records keep the interface fast while still feeling exploratory.
                    </p>
                  </div>
                  <div className="glass-panel rounded-2xl px-5 py-4 text-right">
                    <div className="text-2xl font-black text-white">{datasetInfo?.shape?.[0] ? new Intl.NumberFormat('en-US').format(datasetInfo.shape[0]) : '—'}</div>
                    <div className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">indexed records</div>
                  </div>
                </div>
              </div>
              <ErrorBoundary>
                <Suspense fallback={<LoadingFallback label="Loading passenger explorer..." />}>
                  <DataTable />
                </Suspense>
              </ErrorBoundary>
            </section>
          </div>
        )}

        {shouldMountView('engineering') && (
          <div className={`${getViewClassName('engineering')} space-y-8`}>
            <FeatureShowcase
              datasetInfo={datasetInfo}
              connectionStatus={connectionStatus}
              onNavigate={handleNavigate}
            />
          </div>
        )}
      </main>

      <footer className="relative z-10 mt-12 border-t border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto flex flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-black text-white">Titanic Intelligence Platform</div>
            <p className="mt-1 text-xs text-slate-500">React · Flask · Supabase · Meilisearch · ML · Tate AI</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {['Live Data', 'Backend Metrics', 'Guided UX', 'Portfolio Story'].map((label) => (
              <span key={label} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                {label}
              </span>
            ))}
          </div>
        </div>
      </footer>

      <Suspense fallback={null}>
        <AICopilot activeView={activeView} onNavigate={handleNavigate} />
        {/* <MissionGuideModal activeView={activeView} onNavigate={handleNavigate} /> */}
      </Suspense>
    </div>
  );
}

export default App;
