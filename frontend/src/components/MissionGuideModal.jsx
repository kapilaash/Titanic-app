// components/MissionGuideModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  EXPLORATION_GUIDE_EVENT,
  getExplorationGuideState,
  getExplorationProgress,
  getNextExplorationTask,
  getTaskById,
  markExplorationTask,
  minimizeMissionGuide,
  reopenMissionGuide,
  requestMissionGuide,
} from '../utils/explorationProgress';

const sectionLabelMap = {
  dashboard: 'Dashboard',
  analysis: 'Analysis',
  regression: 'ML Insights',
  data: 'Data Explorer',
  copilot: 'Tate AI',
  engineering: 'Build Story',
};


const MissionChip = ({
  task,
  title = 'Start guided mission',
  subtitle,
  onClick,
  tone = 'cyan',
}) => {
  const toneMap = {
    cyan: 'border-cyan-200/30 hover:shadow-cyan-950/40',
    emerald: 'border-emerald-200/30 hover:shadow-emerald-950/40',
  };

  if (!task) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-24 left-4 z-[65] max-w-[calc(100vw-2rem)] rounded-2xl border bg-slate-950 px-4 py-3 text-left text-white shadow-2xl shadow-slate-950/30 transition-all hover:-translate-y-0.5 ${toneMap[tone] || toneMap.cyan}`}
      aria-label={title}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{task.icon}</span>
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
            {title}
          </div>
          <div className="text-sm font-black text-white">{task.title}</div>
          {subtitle && (
            <div className="mt-0.5 max-w-[18rem] text-xs font-semibold text-slate-400">
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </button>
  );
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

  /*
    If the user has not opened a mission yet, keep the guided journey visible as a
    small minimized chip. This prevents the journey from being hidden behind a
    manual "find and click a mission first" workflow.
  */
  if (!activeTask && nextTask) {
    return (
      <MissionChip
        task={nextTask}
        title="Start guided mission"
        subtitle="Begin the interactive product walkthrough."
        onClick={() => requestMissionGuide(nextTask.id)}
      />
    );
  }

  if (!activeTask && !nextTask) {
    return null;
  }


  const isMinimized = Boolean(guideState.minimized?.[activeTask.id]);
  const isTaskComplete = Boolean(progress[activeTask.id]);
  const isCorrectSection = activeTask.section === 'copilot' || activeTask.section === activeView;
  const requiresManualConfirmation = activeTask.completionMode === 'manual';

  const handleGoToTaskSection = () => {
    if (activeTask.section === 'copilot') {
      window.dispatchEvent(new CustomEvent('titanic-open-copilot'));
      return;
    }

    if (activeTask.section && onNavigate) {
      onNavigate(activeTask.section);
    }
  };

  const handleManualCompletion = () => {
    if (!isCorrectSection || !requiresManualConfirmation || isTaskComplete) return;

    markExplorationTask(activeTask.id, {
      source: 'mission_interaction',
      metadata: {
        confirmedFromSection: activeView,
      },
    });
  };

  const handleNextTask = () => {
    if (!isTaskComplete) return;

    const taskToOpen = getNextExplorationTask(getExplorationProgress());

    if (!taskToOpen) {
      minimizeMissionGuide(activeTask.id);
      return;
    }

    requestMissionGuide(taskToOpen.id);

    if (taskToOpen.section === 'copilot') {
      window.dispatchEvent(new CustomEvent('titanic-open-copilot'));
      return;
    }

    if (taskToOpen.section && onNavigate) {
      onNavigate(taskToOpen.section);
    }
  };

  const getPrimaryButton = () => {
    if (!isCorrectSection) {
      return {
        label: `Go to ${sectionLabelMap[activeTask.section] || activeTask.section}`,
        onClick: handleGoToTaskSection,
        disabled: false,
        className: 'bg-slate-950 text-white hover:bg-slate-800',
      };
    }

    if (!isTaskComplete && requiresManualConfirmation) {
      return {
        label: activeTask.completionLabel || 'Confirm mission interaction',
        onClick: handleManualCompletion,
        disabled: false,
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl',
      };
    }

    if (!isTaskComplete && activeTask.section === 'copilot') {
      return {
        label: activeTask.id === 'aiQuestionAsked' ? 'Open Tate and ask a question' : 'Open Tate',
        onClick: () => window.dispatchEvent(new CustomEvent('titanic-open-copilot')),
        disabled: false,
        className: 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:shadow-xl',
      };
    }

    if (!isTaskComplete) {
      return {
        label: 'Waiting for required interaction',
        onClick: () => {},
        disabled: true,
        className: 'cursor-not-allowed bg-slate-200 text-slate-500 shadow-none',
      };
    }

    if (nextTask && nextTask.id !== activeTask.id) {
      return {
        label: `Next mission: ${nextTask.title}`,
        onClick: handleNextTask,
        disabled: false,
        className: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl',
      };
    }

    return {
      label: 'All missions complete',
      onClick: () => minimizeMissionGuide(activeTask.id),
      disabled: false,
      className: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:shadow-xl',
    };
  };

  const primaryButton = getPrimaryButton();

  if (isMinimized) {
    return (
      <MissionChip
        task={activeTask}
        title={isTaskComplete ? 'Mission checkpoint' : 'Resume mission'}
        subtitle={isTaskComplete ? 'Open to continue the guided journey.' : 'Return to the active interaction.'}
        tone={isTaskComplete ? 'emerald' : 'cyan'}
        onClick={() => reopenMissionGuide(activeTask.id)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[64] pointer-events-none">
      <div className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]" />

      <div className="absolute bottom-5 left-1/2 w-[min(94vw,44rem)] -translate-x-1/2 pointer-events-auto">
        <div className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.35)]">
          <div className="relative bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-5 text-white">
            <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.5),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.42),transparent_40%)]" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-3xl">
                  {activeTask.icon}
                </div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-blue-100">
                    Interactive guided mission
                  </div>
                  <h3 className="mt-1 text-xl font-black tracking-tight">{activeTask.guideTitle || activeTask.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-blue-50">
                    {isCorrectSection
                      ? `You are in ${sectionLabelMap[activeTask.section] || activeTask.section}. Complete the required interaction below.`
                      : `Navigate to ${sectionLabelMap[activeTask.section] || activeTask.section}. This mission will not auto-complete from navigation alone.`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => minimizeMissionGuide(activeTask.id)}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                Continue here
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-sm leading-relaxed text-slate-600">{activeTask.guideSummary}</p>

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="text-xs font-black uppercase tracking-wide text-blue-700">What to do now</div>
                <ol className="mt-3 space-y-2">
                  {(activeTask.guideSteps || []).map((step, index) => (
                    <li key={`${activeTask.id}-${step}`} className="flex gap-3 text-sm text-slate-700">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="space-y-3">
              <div
                className={`rounded-2xl border p-4 ${
                  isTaskComplete
                    ? 'border-emerald-100 bg-emerald-50'
                    : isCorrectSection
                      ? 'border-blue-100 bg-blue-50'
                      : 'border-amber-100 bg-amber-50'
                }`}
              >
                <div
                  className={`text-xs font-black uppercase tracking-wide ${
                    isTaskComplete
                      ? 'text-emerald-700'
                      : isCorrectSection
                        ? 'text-blue-700'
                        : 'text-amber-700'
                  }`}
                >
                  {isTaskComplete
                    ? 'Mission completed'
                    : requiresManualConfirmation
                      ? 'Interaction confirmation required'
                      : 'User action required'}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {isTaskComplete
                    ? 'This mission is complete. You can continue to the next recommendation.'
                    : activeTask.completionHint || activeTask.guideSuccess}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-black uppercase tracking-wide text-slate-500">Current location</div>
                <div className="mt-2 text-sm font-black text-slate-950">{sectionLabelMap[activeView] || activeView}</div>
                <div className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-500">
                  Navigation alone will not complete this mission.
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => minimizeMissionGuide(activeTask.id)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-100"
            >
              Continue here
            </button>

            <div className="flex flex-col items-stretch gap-2 sm:items-end">
              <button
                type="button"
                onClick={primaryButton.onClick}
                disabled={primaryButton.disabled}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg transition-all ${primaryButton.className}`}
              >
                {primaryButton.label}
              </button>

              {!isTaskComplete && (
                <div className="max-w-xs text-xs font-semibold text-slate-500 sm:text-right">
                  Complete the required interaction to unlock the next mission.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MissionGuideModal;
