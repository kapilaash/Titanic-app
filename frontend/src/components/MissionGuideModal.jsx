// components/MissionGuideModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  EXPLORATION_GUIDE_EVENT,
  dismissMissionGuide,
  getExplorationGuideState,
  getExplorationProgress,
  getNextExplorationTask,
  getTaskById,
  minimizeMissionGuide,
  reopenMissionGuide,
  requestMissionGuide,
} from '../utils/explorationProgress';

const sectionLabelMap = {
  dashboard: 'Command',
  analysis: 'Analysis',
  regression: 'ML Lab',
  data: 'Explorer',
  copilot: 'Tate AI',
  engineering: 'Build Story',
};

const MissionGuideModal = ({ activeView, onNavigate }) => {
  const [guideState, setGuideState] = useState(() => getExplorationGuideState());
  const [progress, setProgress] = useState(() => getExplorationProgress());

  useEffect(() => {
    const handleGuideChange = (event) => setGuideState(event.detail || getExplorationGuideState());
    const handleProgressChange = () => setProgress(getExplorationProgress());

    window.addEventListener(EXPLORATION_GUIDE_EVENT, handleGuideChange);
    window.addEventListener('titanic-exploration-progress', handleProgressChange);

    return () => {
      window.removeEventListener(EXPLORATION_GUIDE_EVENT, handleGuideChange);
      window.removeEventListener('titanic-exploration-progress', handleProgressChange);
    };
  }, []);

  const activeTask = useMemo(() => getTaskById(guideState.pendingTaskId), [guideState.pendingTaskId]);
  const nextTask = useMemo(() => getNextExplorationTask(progress), [progress]);

  if (!activeTask) return null;

  const isMinimized = Boolean(guideState.minimized?.[activeTask.id]);
  const isDismissed = Boolean(guideState.dismissed?.[activeTask.id]);
  const isTaskComplete = Boolean(progress[activeTask.id]);
  const isCorrectSection = activeTask.section === 'copilot' || activeTask.section === activeView;

  if (isDismissed) return null;

  const goToTaskSection = (task = activeTask) => {
    if (task.section === 'copilot') {
      window.dispatchEvent(new CustomEvent('titanic-open-copilot'));
      return;
    }

    if (task.section && onNavigate) {
      onNavigate(task.section);
    }
  };

  const handleContinueHere = () => {
    minimizeMissionGuide(activeTask.id);
  };

  const handleNextTask = () => {
    if (!isTaskComplete) return;

    const taskToOpen = getNextExplorationTask(getExplorationProgress());

    // If every mission is complete, keep the positive completion state but collapse
    // the guide into the small resume chip instead of leaving a disabled button visible.
    if (!taskToOpen) {
      minimizeMissionGuide(activeTask.id);
      return;
    }

    // Internal lifecycle action only: the completed guide is closed so the next guide can open.
    // There is intentionally no visible Dismiss button because users should not confuse
    // dismissal with the recommended Continue here flow.
    dismissMissionGuide(activeTask.id);

    requestMissionGuide(taskToOpen.id);
    goToTaskSection(taskToOpen);
  };

  if (isMinimized) {
    return (
      <button
        type="button"
        onClick={() => reopenMissionGuide(activeTask.id)}
        className="fixed bottom-4 left-4 z-[45] max-w-[13rem] rounded-2xl border border-cyan-200/15 bg-slate-950/75 px-3 py-2 text-left text-white shadow-2xl backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-slate-900/95 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        aria-label={`Reopen mission guide for ${activeTask.title}`}
      >
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-cyan-100">
            {activeTask.icon}
          </span>
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200">Guide minimized</div>
            <div className="truncate text-xs font-black text-white">Resume mission</div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[64] pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]" />

      <div className="absolute bottom-5 left-1/2 w-[min(94vw,44rem)] -translate-x-1/2 pointer-events-auto">
        <div className="premium-card overflow-hidden">
          <div className="relative border-b border-white/10 p-5 text-white">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-lg font-black text-cyan-100">
                {isTaskComplete ? '✓' : activeTask.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="kicker text-cyan-200">Mission Guide</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
                    {sectionLabelMap[activeTask.section] || activeTask.section}
                  </span>
                </div>

                <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                  {activeTask.guideTitle}
                </h3>

                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {activeTask.guideSummary}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {activeTask.guideSteps.map((step, index) => (
                <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                    Step {index + 1}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{step}</p>
                </div>
              ))}
            </div>

            <div
              className={`mt-4 rounded-2xl border p-4 ${
                isTaskComplete
                  ? 'border-emerald-200/20 bg-emerald-300/10'
                  : 'border-amber-200/20 bg-amber-300/10'
              }`}
            >
              <div className={`text-sm font-black ${isTaskComplete ? 'text-emerald-100' : 'text-amber-100'}`}>
                {isTaskComplete ? 'Mission completed' : isCorrectSection ? 'You are in the right section' : 'Navigation required'}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">
                {isTaskComplete
                  ? activeTask.guideSuccess
                  : isCorrectSection
                    ? 'Use Continue here to collapse this guide while you complete the mission in the current workspace.'
                    : activeTask.guideSuccess}
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              {!isCorrectSection && (
                <button
                  type="button"
                  onClick={() => goToTaskSection(activeTask)}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                >
                  {activeTask.actionLabel}
                </button>
              )}

              {isCorrectSection && !isTaskComplete && (
                <button
                  type="button"
                  onClick={handleContinueHere}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-50 focus:outline-none focus:ring-2 focus:ring-cyan-300/50"
                >
                  Continue here
                </button>
              )}

              <button
                type="button"
                onClick={handleNextTask}
                disabled={!isTaskComplete}
                className={`rounded-2xl px-5 py-3 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-cyan-300/50 disabled:cursor-not-allowed disabled:opacity-45 ${
                  nextTask
                    ? 'border border-white/10 bg-white/[0.06] text-white hover:-translate-y-0.5 hover:bg-white/[0.1]'
                    : 'border border-emerald-200/20 bg-emerald-300/12 text-emerald-100 hover:-translate-y-0.5 hover:bg-emerald-300/18'
                }`}
                aria-label={nextTask ? 'Open the next mission' : 'Collapse completed mission guide'}
              >
                {nextTask ? 'Next mission →' : 'All missions complete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionGuideModal;
