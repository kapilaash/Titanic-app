// components/AICopilot.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import {
  EXPLORATION_EVENT,
  EXPLORATION_TASKS,
  OPEN_COPILOT_EVENT,
  getExplorationProgress,
  getNextExplorationTask,
  markExplorationTask,
} from '../utils/explorationProgress';

const CHAT_STORAGE_KEY = 'tateCopilotMessages:v3';
const LEGACY_CHAT_STORAGE_KEYS = ['tateCopilotMessages:v2', 'tate_chat_history_v3', 'tate-chat-history'];
const MAX_STORED_MESSAGES = 40;
const TATE_STATE_EVENT = 'titanic-tate-state';

const sectionLabelMap = {
  dashboard: 'Dashboard',
  analysis: 'Analysis',
  regression: 'ML Insights',
  data: 'Data Explorer',
  copilot: 'Tate AI',
  engineering: 'Build Story',
};

const loadStoredMessages = () => {
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(-MAX_STORED_MESSAGES) : [];
  } catch {
    return [];
  }
};

const persistMessages = (messages) => {
  try {
    window.localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
    );
  } catch (error) {
    console.warn('Unable to persist Tate messages:', error);
  }
};

const safeText = (value) => {
  if (value === null || value === undefined) return '';
  return String(value);
};

const cn = (...classes) => classes.filter(Boolean).join(' ');

const renderInlineMarkdown = (text) => {
  const parts = safeText(text).split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-black text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const MessageContent = ({ content }) => {
  const lines = safeText(content).split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        if (!line.trim()) return <div key={`gap-${index}`} className="h-1" />;

        return (
          <p key={`${line}-${index}`} className="leading-relaxed">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
};

const MissionProgressLine = ({ completed, total }) => {
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-violet-400 transition-all duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

const MissionControlBar = ({
  activeView,
  onNavigate,
  progress,
  onRefreshProgress,
  onFocusInput,
  onClosePanel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const completedCount = useMemo(
    () => Object.values(progress).filter(Boolean).length,
    [progress]
  );
  const totalCount = EXPLORATION_TASKS.length;
  const nextMission = useMemo(() => getNextExplorationTask(progress), [progress]);
  const isAllComplete = !nextMission;
  const isCorrectSection = nextMission
    ? nextMission.section === 'copilot' || nextMission.section === activeView
    : false;

  useEffect(() => {
    if (isAllComplete) {
      setIsExpanded(false);
    }
  }, [isAllComplete]);

  const handleNavigateToMission = () => {
    if (!nextMission) return;

    if (nextMission.section === 'copilot') {
      markExplorationTask('aiOpened');
      onRefreshProgress();

      if (nextMission.id === 'aiQuestionAsked') {
        onFocusInput('What is the model accuracy?');
      } else {
        onFocusInput();
      }

      return;
    }

    if (onNavigate && nextMission.section) {
      onNavigate(nextMission.section);
    }

    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.setTimeout(() => onClosePanel(), 120);
    }
  };

  const handleManualCompletion = () => {
    if (!nextMission || nextMission.completionMode !== 'manual' || !isCorrectSection) return;

    markExplorationTask(nextMission.id, {
      source: 'mission_interaction',
      metadata: {
        completedInsideTate: true,
        activeView,
      },
    });

    /*
      Keep Mission Control expanded after confirmation so users immediately see
      the next mission's purpose, required action, and steps. This avoids making
      them click "More" again after every completed mission.
    */
    onRefreshProgress();
    setIsExpanded(true);
  };

  const actionButton = (() => {
    if (isAllComplete) {
      return {
        label: 'Done',
        onClick: () => {},
        disabled: true,
        className: 'cursor-default border border-emerald-200/20 bg-emerald-300/10 text-emerald-100',
      };
    }

    if (!isCorrectSection) {
      return {
        label: `Go to ${sectionLabelMap[nextMission.section] || nextMission.section}`,
        onClick: handleNavigateToMission,
        disabled: false,
        className: 'bg-white text-slate-950 hover:bg-cyan-50',
      };
    }

    if (nextMission.completionMode === 'manual') {
      return {
        label: nextMission.completionLabel || 'Confirm mission',
        onClick: handleManualCompletion,
        disabled: false,
        className: 'bg-gradient-to-r from-cyan-300 to-blue-400 text-slate-950 hover:shadow-cyan-950/30',
      };
    }

    return {
      label: nextMission.section === 'copilot' ? 'Continue in Tate' : `Open ${sectionLabelMap[nextMission.section] || 'section'}`,
      onClick: handleNavigateToMission,
      disabled: false,
      className: 'bg-white text-slate-950 hover:bg-cyan-50',
    };
  })();

  return (
    <div className="tate-mission-control mobile-scroll shrink-0 overflow-y-auto overscroll-contain border-b border-white/10 bg-slate-950/92 px-3 py-2.5 sm:px-4">
      <div className="rounded-[1.05rem] border border-cyan-200/15 bg-gradient-to-r from-cyan-300/[0.075] via-white/[0.035] to-violet-400/[0.065] p-3 shadow-[0_12px_35px_rgba(8,47,73,0.12)]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-lg">
            {isAllComplete ? '✓' : nextMission.icon}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((previous) => !previous)}
            className="min-w-0 flex-1 text-left"
            aria-expanded={isExpanded}
            aria-label="Toggle Tate Mission Control details"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">
                Mission
              </span>
              <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[9px] font-black text-slate-400">
                {completedCount}/{totalCount}
              </span>
              <span className="truncate text-sm font-black text-white">
                {isAllComplete ? 'Guided journey complete' : nextMission.title}
              </span>
            </div>

            <div className="mt-2">
              <MissionProgressLine completed={completedCount} total={totalCount} />
            </div>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((previous) => !previous)}
            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition hover:bg-white/[0.1]"
            aria-label={isExpanded ? 'Collapse mission details' : 'Expand mission details'}
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-3 border-t border-white/10 pt-3">
            <p className="text-sm leading-relaxed text-slate-400">
              {isAllComplete
                ? 'Tate can still answer questions, explain the architecture, or help demonstrate the platform.'
                : nextMission.guideSummary || nextMission.description}
            </p>

            {!isAllComplete && (
              <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                  Required action
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">
                  {nextMission.completionHint || nextMission.guideSuccess || 'Complete the interaction to unlock the next mission.'}
                </p>

                {Array.isArray(nextMission.guideSteps) && nextMission.guideSteps.length > 0 && (
                  <ol className="mt-3 space-y-2">
                    {nextMission.guideSteps.slice(0, 3).map((step, index) => (
                      <li key={`${nextMission.id}-${step}`} className="flex gap-2 text-xs leading-relaxed text-slate-300">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-[10px] font-black text-cyan-100">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={actionButton.onClick}
                disabled={actionButton.disabled}
                className={cn(
                  'rounded-2xl px-4 py-3 text-sm font-black transition disabled:opacity-70',
                  actionButton.className
                )}
              >
                {actionButton.label}
              </button>

              {!isAllComplete && nextMission.id === 'passengerSearchUsed' && (
                <button
                  type="button"
                  onClick={() => {
                    if (onNavigate) onNavigate('data');
                    onClosePanel();
                  }}
                  className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  Try “alen” in Explorer
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AICopilot = ({ activeView, onNavigate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => loadStoredMessages());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [quickActions, setQuickActions] = useState([]);
  const [apiStatus, setApiStatus] = useState('unknown');
  const [connectionError, setConnectionError] = useState('');
  const [healthInfo, setHealthInfo] = useState(null);
  const [isClearingMemory, setIsClearingMemory] = useState(false);
  const [progress, setProgress] = useState(() => getExplorationProgress());

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  const refreshProgress = useCallback(() => {
    setProgress(getExplorationProgress());
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('tate-panel-open', isOpen);
    window.dispatchEvent(new CustomEvent(TATE_STATE_EVENT, { detail: { isOpen } }));

    return () => {
      document.documentElement.classList.remove('tate-panel-open');
      window.dispatchEvent(new CustomEvent(TATE_STATE_EVENT, { detail: { isOpen: false } }));
    };
  }, [isOpen]);

  useEffect(() => {
    const handleProgressChange = () => refreshProgress();

    window.addEventListener(EXPLORATION_EVENT, handleProgressChange);
    return () => window.removeEventListener(EXPLORATION_EVENT, handleProgressChange);
  }, [refreshProgress]);

  const createInitialWelcomeMessage = useCallback(() => ({
    id: Date.now(),
    role: 'assistant',
    content: `⚓ **Welcome aboard the Titanic Intelligence Platform**\n\nI'm **Tate** — your AI copilot and mission-control guide.\n\nAsk about passengers, survival patterns, model accuracy, feature importance, search behavior, or continue the guided walkthrough from the compact Mission Control bar.`,
    type: 'welcome',
    timestamp: new Date().toISOString(),
  }), []);

  const checkApiHealth = useCallback(async () => {
    try {
      const response = await api.get('/copilot/health', { timeout: 3000 });
      setHealthInfo(response.data);
      setApiStatus('healthy');
      setConnectionError('');

      setMessages((previous) => (
        previous.length > 0 ? previous : [createInitialWelcomeMessage()]
      ));
    } catch (error) {
      setApiStatus('unhealthy');
      setHealthInfo(null);
      setConnectionError(error.message);

      setMessages((previous) => (
        previous.length > 0 ? previous : [{
          id: Date.now(),
          role: 'assistant',
          content: `⚠️ **Connection Issue**\n\nI cannot connect to the live Tate backend right now. I will not guess or use hardcoded Titanic values.\n\nStart the Flask backend, then retry the connection.`,
          type: 'error',
          timestamp: new Date().toISOString(),
        }]
      ));
    }
  }, [createInitialWelcomeMessage]);

  const openTate = useCallback(() => {
    markExplorationTask('aiOpened');
    refreshProgress();
    setIsOpen(true);
  }, [refreshProgress]);

  const closeTate = useCallback(() => {
    setIsOpen(false);
  }, []);

  const focusInput = useCallback((value = '') => {
    if (value) setInput(value);
    window.setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const updateContext = useCallback(async (context) => {
    try {
      await api.post('/copilot/set-context', { context }, { timeout: 3000 });
    } catch (error) {
      console.warn('Context update failed:', error.message);
    }
  }, []);

  const loadQuickActions = useCallback(async (context) => {
    try {
      const response = await api.get('/copilot/quick-actions', {
        params: { context },
        timeout: 3000,
      });

      const backendActions = Array.isArray(response.data.actions) ? response.data.actions : [];
      const filteredActions = backendActions
        .filter((action) => action?.label && action?.action)
        .filter((action) => !String(action.label).toLowerCase().includes('tour'));

      setQuickActions(filteredActions.slice(0, 4));
    } catch (error) {
      console.warn('Quick actions failed, using fallback:', error.message);
      setQuickActions([
        { icon: '◈', label: 'Model Accuracy', action: 'ask:What is the model accuracy?', type: 'model_info' },
        { icon: '⌕', label: 'Search Allen', action: 'ask:Tell me about Allen', type: 'analysis' },
        { icon: '▧', label: 'Survival Rate', action: 'ask:What was the overall survival rate?', type: 'statistics' },
        { icon: '⌬', label: 'Build Story', action: 'navigate:engineering', type: 'navigation' },
      ]);
    }
  }, []);

  useEffect(() => {
    const handleExternalOpen = () => {
      markExplorationTask('aiOpened');
      refreshProgress();
      setIsOpen(true);
    };

    window.addEventListener(OPEN_COPILOT_EVENT, handleExternalOpen);
    return () => window.removeEventListener(OPEN_COPILOT_EVENT, handleExternalOpen);
  }, [refreshProgress]);

  useEffect(() => {
    if (!isOpen) return;

    setMessages((previous) => (
      previous.length > 0 ? previous : [createInitialWelcomeMessage()]
    ));

    checkApiHealth();
    focusInput();
  }, [isOpen, checkApiHealth, createInitialWelcomeMessage, focusInput]);

  useEffect(() => {
    if (isOpen) {
      updateContext(activeView);
      loadQuickActions(activeView);
    }
  }, [activeView, isOpen, updateContext, loadQuickActions]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (messages.length > 0) persistMessages(messages);
  }, [messages]);

  const navigateToBuildStory = useCallback(() => {
    if (onNavigate) {
      onNavigate('engineering');
    }
    markExplorationTask('buildStoryViewed', {
      source: 'mission_interaction',
      metadata: { fromTate: true },
    });
    refreshProgress();
  }, [onNavigate, refreshProgress]);

  const handleSend = useCallback(async (overrideQuestion = null) => {
    const questionToSend = typeof overrideQuestion === 'string' ? overrideQuestion : input;
    if (!questionToSend.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: questionToSend,
      timestamp: new Date().toISOString(),
    };

    const historySnapshot = [...messages, userMessage]
      .slice(-10)
      .map(({ role, content, timestamp }) => ({ role, content, timestamp }));

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setIsLoading(true);
    markExplorationTask('aiQuestionAsked');
    refreshProgress();

    try {
      let response;

      try {
        response = await api.post('/copilot/chat', {
          question: questionToSend,
          context: activeView,
          history: historySnapshot,
        }, { timeout: 10000 });
      } catch (apiError) {
        response = {
          data: {
            response: `⚠️ **Backend unavailable**\n\nI cannot reach the live Tate copilot service right now, so I will not guess or use hardcoded Titanic values.`,
            type: 'connection_error',
            suggestions: [{ text: 'Retry connection', action: 'test_connection', type: 'suggestion' }],
            data: { backendAvailable: false },
          },
        };
      }

      let responseText = '';
      let responseType = 'text';

      if (response.data && response.data.response) {
        if (typeof response.data.response === 'string') {
          try {
            const parsed = JSON.parse(response.data.response);
            responseText = parsed.response || response.data.response;
            responseType = parsed.type || response.data.type || 'text';
          } catch {
            responseText = response.data.response;
            responseType = response.data.type || 'text';
          }
        } else if (typeof response.data.response === 'object') {
          responseText = response.data.response.response || JSON.stringify(response.data.response);
          responseType = response.data.response.type || response.data.type || 'text';
        } else {
          responseText = String(response.data.response);
          responseType = response.data.type || 'text';
        }
      } else {
        responseText = "I don't have an answer for that right now.";
      }

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: responseText,
        type: responseType,
        data: response.data.data,
        suggestions: response.data.suggestions || [],
        timestamp: new Date().toISOString(),
      };

      setMessages((previous) => [...previous, assistantMessage]);
      loadQuickActions(activeView);
    } catch (error) {
      setMessages((previous) => [...previous, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ **Unexpected error**\n\n${error.message}`,
        type: 'error',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [activeView, input, isLoading, loadQuickActions, messages, refreshProgress]);

  const testConnection = useCallback(async () => {
    try {
      await api.get('/health', { timeout: 3000 });
      const copilotTest = await api.get('/copilot/health', { timeout: 3000 });

      setHealthInfo(copilotTest.data);
      setApiStatus('healthy');
      setConnectionError('');
      setMessages((previous) => [...previous, {
        id: Date.now(),
        role: 'assistant',
        content: '✅ **Connection successful.** The backend and Tate copilot service are responding.',
        type: 'success',
        timestamp: new Date().toISOString(),
      }]);
    } catch (error) {
      setApiStatus('unhealthy');
      setHealthInfo(null);
      setConnectionError(error.message);
      setMessages((previous) => [...previous, {
        id: Date.now(),
        role: 'assistant',
        content: `❌ **Connection failed**\n\n${error.message}`,
        type: 'error',
        timestamp: new Date().toISOString(),
      }]);
    }
  }, []);

  const handleQuickAction = useCallback((action) => {
    if (!action) return;

    if (action.startsWith('navigate:')) {
      const destination = action.split(':')[1];
      if (destination === 'engineering') {
        navigateToBuildStory();
        return;
      }
      if (onNavigate) onNavigate(destination);
    } else if (action.startsWith('ask:')) {
      handleSend(action.substring(4));
    } else if (action === 'test_connection') {
      testConnection();
    }
  }, [handleSend, navigateToBuildStory, onNavigate, testConnection]);

  const clearChatMemory = useCallback(async () => {
    if (isClearingMemory) return;

    setIsClearingMemory(true);
    const resetMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `⚓ **Tate Intelligence is ready for launch**\n\nAsk about any passenger, survival pattern, model decision, system layer, or continue the guided mission from Mission Control.`,
      type: 'welcome',
      timestamp: new Date().toISOString(),
    };

    try {
      window.localStorage.removeItem(CHAT_STORAGE_KEY);
      LEGACY_CHAT_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
    } catch (storageError) {
      console.warn('Unable to clear Tate localStorage:', storageError);
    }

    setMessages([resetMessage]);
    setInput('');
    setConnectionError('');

    try {
      const response = await api.post('/copilot/clear-memory', {}, { timeout: 5000 });
      if (response?.data?.success) {
        setApiStatus('healthy');
        setHealthInfo((previous) => ({
          ...(previous || {}),
          memory: { conversation_messages: 0, last_passengers: 0 },
        }));
      }
    } catch (error) {
      console.warn('Backend memory clear failed. Frontend chat was still reset:', error.message);
      setApiStatus('unhealthy');
      setConnectionError(error.message);
      setMessages((previous) => [...previous, {
        id: `clear-warning-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Tate could not refresh this session completely.**\n\n${error.message}. Please confirm the Flask backend is running.`,
        type: 'error',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsClearingMemory(false);
    }
  }, [isClearingMemory]);

  const launcher = !isOpen ? (
    <button
      type="button"
      onClick={openTate}
      className="tate-copilot-button fixed bottom-6 right-6 z-[70] group flex items-center gap-3 rounded-full px-4 py-3 text-white"
      aria-label="Open Tate assistant"
    >
      <span className="tate-magic-orbit" aria-hidden="true" />
      <span className="tate-magic-sparkle tate-sparkle-one" aria-hidden="true">✦</span>
      <span className="tate-magic-sparkle tate-sparkle-two" aria-hidden="true">✧</span>
      <span className="tate-magic-sparkle tate-sparkle-three" aria-hidden="true">✦</span>

      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white shadow-[0_12px_35px_rgba(34,211,238,0.28)]">
        <span className="absolute inset-0 bg-gradient-to-br from-cyan-100 via-white to-violet-100 opacity-80" />
        <img src="/Tate.svg" alt="Tate AI assistant" className="relative h-11 w-11 object-contain transition-transform duration-500 group-hover:scale-110" />
        <span className={`absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${apiStatus === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </div>

      <div className="relative hidden pr-1 text-left sm:block">
        <div className="text-[15px] font-black leading-none tracking-[-0.035em] text-white drop-shadow-[0_0_16px_rgba(125,249,255,0.35)]">
          Tate
        </div>
        <div className="mt-1 text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/85">
          Cognitive Interface
        </div>
      </div>
    </button>
  ) : null;

  const panel = isOpen ? (
    <div
      className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] top-2 z-[9999] pointer-events-auto sm:inset-auto sm:bottom-5 sm:right-5 sm:top-auto sm:max-w-[calc(100vw-1rem)]"
      role="dialog"
      aria-label="Tate AI copilot and mission control"
    >
      <div className="tate-panel premium-card flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.5rem] shadow-[0_24px_80px_rgba(2,6,23,0.5)] sm:h-[min(82dvh,46rem)] sm:w-[min(94vw,30rem)] sm:rounded-[1.75rem]">
        <div className="shrink-0 border-b border-white/10 bg-slate-950/80 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-200/20 bg-white sm:h-12 sm:w-12">
                <img src="/Tate.svg" alt="Tate AI assistant" className="h-9 w-9 object-contain sm:h-10 sm:w-10" />
                <span className={`absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white ${apiStatus === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>

              <div className="min-w-0">
                <h2 className="truncate text-base font-black tracking-[-0.04em] text-white sm:text-lg">
                  Tate
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 sm:text-[10px]">
                  <span className={`h-1.5 w-1.5 rounded-full ${apiStatus === 'healthy' ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                  <span>{apiStatus === 'healthy' ? 'Backend online' : 'Checking backend'}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={closeTate}
              className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Close Tate"
            >
              Close
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3" aria-label="Tate session metadata">
              <div className="min-w-0 border-r border-white/10 pr-3">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-[9px]">Context</div>
                <div className="mt-1 truncate text-xs font-black text-slate-200">{sectionLabelMap[activeView] || activeView}</div>
              </div>
              <div className="min-w-0">
                <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500 sm:text-[9px]">Dataset</div>
                <div className="mt-1 truncate text-xs font-black text-slate-200">
                  {healthInfo?.dataset_size || healthInfo?.document_count || 'Live'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearChatMemory}
              disabled={isClearingMemory}
              className="shrink-0 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isClearingMemory ? 'Resetting…' : 'New Chat'}
            </button>
          </div>

          {connectionError && (
            <div className="mt-3 rounded-2xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold leading-relaxed text-amber-100">
              {connectionError}
            </div>
          )}
        </div>

        <MissionControlBar
          activeView={activeView}
          onNavigate={onNavigate}
          progress={progress}
          onRefreshProgress={refreshProgress}
          onFocusInput={focusInput}
          onClosePanel={closeTate}
        />

        <div ref={messagesContainerRef} className="mobile-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[92%] rounded-[1.35rem] border px-4 py-3 text-sm sm:max-w-[86%] ${
                message.role === 'user'
                  ? 'border-cyan-200/20 bg-cyan-300/15 text-cyan-50'
                  : message.type === 'error'
                    ? 'border-rose-200/20 bg-rose-400/10 text-rose-50'
                    : message.type === 'success'
                      ? 'border-emerald-200/20 bg-emerald-300/10 text-emerald-50'
                      : 'border-white/10 bg-white/[0.055] text-slate-200'
              }`}>
                <MessageContent content={message.content} />

                {Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {message.suggestions.slice(0, 3).map((suggestion, index) => (
                      <button
                        key={`${message.id}-${suggestion.text || index}`}
                        type="button"
                        onClick={() => handleQuickAction(suggestion.action || `ask:${suggestion.text}`)}
                        className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1]"
                      >
                        {suggestion.text || suggestion.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                  Tate is reasoning…
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-slate-950/85 p-3 sm:p-4">
          {quickActions.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto mobile-scroll pb-1">
              {quickActions.map((action, index) => (
                <button
                  key={`${action.label}-${index}`}
                  type="button"
                  onClick={() => handleQuickAction(action.action)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  <span className="mr-1">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(event) => {
              event.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Tate or continue a mission…"
              className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-500 shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  ) : null;

  return createPortal(
    <>
      {launcher}
      {panel}
    </>,
    document.body
  );
};

export default AICopilot;
