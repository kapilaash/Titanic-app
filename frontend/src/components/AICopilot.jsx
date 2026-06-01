// components/AICopilot.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import {
  OPEN_COPILOT_EVENT,
  markExplorationTask,
} from '../utils/explorationProgress';

const CHAT_STORAGE_KEY = 'tateCopilotMessages:v3';
const LEGACY_CHAT_STORAGE_KEYS = ['tateCopilotMessages:v2', 'tate_chat_history_v3', 'tate-chat-history'];
const MAX_STORED_MESSAGES = 40;
const TATE_STATE_EVENT = 'titanic-tate-state';

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
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_STORED_MESSAGES)));
  } catch {
    // Storage can fail in private browsing; chat should still work.
  }
};

const InlineMarkdown = ({ text }) => {
  const textString = typeof text === 'string' ? text : String(text ?? '');
  const parts = [];
  let currentIndex = 0;
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;

  while ((match = boldRegex.exec(textString)) !== null) {
    if (match.index > currentIndex) {
      parts.push({ type: 'text', content: textString.substring(currentIndex, match.index) });
    }
    parts.push({ type: 'bold', content: match[1] });
    currentIndex = boldRegex.lastIndex;
  }

  if (currentIndex < textString.length) {
    parts.push({ type: 'text', content: textString.substring(currentIndex) });
  }

  if (parts.length === 0) return <span>{textString}</span>;

  return (
    <>
      {parts.map((part, index) => (
        part.type === 'bold'
          ? <strong key={`${part.content}-${index}`} className="font-black text-white">{part.content}</strong>
          : <span key={`${part.content}-${index}`}>{part.content}</span>
      ))}
    </>
  );
};

const MarkdownText = ({ text }) => {
  if (!text) return null;

  const textString = typeof text === 'string' ? text : String(text);
  const lines = textString.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        if (trimmed === '') return <div key={lineIndex} className="h-1" />;

        if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
          return (
            <div key={lineIndex} className="flex items-start gap-2 pl-1">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
              <span className="flex-1"><InlineMarkdown text={trimmed.substring(1).trim()} /></span>
            </div>
          );
        }

        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numberedMatch) {
          return (
            <div key={lineIndex} className="flex items-start gap-2 pl-1">
              <span className="w-5 shrink-0 text-cyan-200 font-black">{numberedMatch[1]}.</span>
              <span className="flex-1"><InlineMarkdown text={numberedMatch[2]} /></span>
            </div>
          );
        }

        return <div key={lineIndex}><InlineMarkdown text={line} /></div>;
      })}
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
  const [buildStoryNotice, setBuildStoryNotice] = useState('');
  const [healthInfo, setHealthInfo] = useState(null);
  const [isClearingMemory, setIsClearingMemory] = useState(false);

  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    document.documentElement.classList.toggle('tate-panel-open', isOpen);
    window.dispatchEvent(new CustomEvent(TATE_STATE_EVENT, { detail: { isOpen } }));

    return () => {
      document.documentElement.classList.remove('tate-panel-open');
      window.dispatchEvent(new CustomEvent(TATE_STATE_EVENT, { detail: { isOpen: false } }));
    };
  }, [isOpen]);

  const createInitialWelcomeMessage = useCallback(() => ({
    id: Date.now(),
    role: 'assistant',
    content: `⚓ **Welcome aboard the Titanic Intelligence Platform**\n\nI'm **Tate** — the cognitive interface for this project.\n\nAsk me about passengers, survival patterns, model accuracy, feature importance, search behavior, or how the platform is engineered.`,
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

  const openTate = () => {
    markExplorationTask('aiOpened');
    setIsOpen(true);
  };

  const navigateToBuildStory = () => {
    if (activeView === 'engineering') {
      setBuildStoryNotice('You are already in Build Story. Continue exploring the architecture layer.');
      window.clearTimeout(window.__tateBuildStoryNoticeTimer);
      window.__tateBuildStoryNoticeTimer = window.setTimeout(() => setBuildStoryNotice(''), 3200);
      return;
    }

    setBuildStoryNotice('');
    if (onNavigate) {
      onNavigate('engineering');
      markExplorationTask('buildStoryViewed');
    }
  };

  useEffect(() => {
    const handleExternalOpen = () => {
      markExplorationTask('aiOpened');
      setIsOpen(true);
    };

    window.addEventListener(OPEN_COPILOT_EVENT, handleExternalOpen);
    return () => window.removeEventListener(OPEN_COPILOT_EVENT, handleExternalOpen);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    setMessages((previous) => (
      previous.length > 0 ? previous : [createInitialWelcomeMessage()]
    ));

    checkApiHealth();

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
  }, [isOpen, checkApiHealth, createInitialWelcomeMessage]);

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

  const handleSend = async (overrideQuestion = null) => {
    const questionToSend = typeof overrideQuestion === 'string' ? overrideQuestion : input;
    if (!questionToSend.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: questionToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setIsLoading(true);
    markExplorationTask('aiQuestionAsked');

    try {
      let response;

      try {
        const recentHistory = [...messages, userMessage]
          .slice(-10)
          .map(({ role, content, timestamp }) => ({ role, content, timestamp }));

        response = await api.post('/copilot/chat', {
          question: questionToSend,
          context: activeView,
          history: recentHistory,
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
  };

  const handleQuickAction = (action) => {
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
  };

  const clearChatMemory = async () => {
    if (isClearingMemory) return;

    setIsClearingMemory(true);
    const resetMessage = {
      id: Date.now(),
      role: 'assistant',
      content: `⚓ **Tate Intelligence is ready for launch**\n\nAsk about any passenger, survival pattern, model decision, or system layer. I’ll help you turn the Titanic dataset into clear intelligence.`,
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
  };

  const testConnection = async () => {
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
  };

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
        <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.95),transparent_35%),radial-gradient(circle_at_70%_80%,rgba(147,197,253,0.45),transparent_45%)]" />
        <img src="/Tate.svg" alt="Tate AI assistant" className="relative h-11 w-11 object-contain transition-transform duration-500 group-hover:scale-110" />
        <span className={`absolute right-1 top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${apiStatus === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      </div>

      <div className="hidden pr-1 text-left leading-tight sm:block">
        <div className="text-sm font-black tracking-tight">Ask Tate</div>
        <div className="text-[11px] font-semibold text-cyan-100/90">Cognitive Interface</div>
      </div>
    </button>
  ) : null;

  const panel = isOpen ? (
    <div
      className="fixed bottom-5 right-5 z-[9999] max-w-[calc(100vw-1rem)] pointer-events-auto"
      role="dialog"
      aria-label="Tate Intelligence chat"
    >
      <div className="premium-card flex h-[min(74vh,42rem)] w-[min(94vw,24rem)] flex-col overflow-hidden rounded-[1.75rem] shadow-[0_24px_80px_rgba(2,6,23,0.5)]">
        <div className="border-b border-white/10 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-cyan-200/20 bg-white">
                <img src="/Tate.svg" alt="Tate AI assistant" className="h-10 w-10 object-contain" />
                <span className={`absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white ${apiStatus === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <div>
                <div className="text-sm font-black text-white">Tate Intelligence</div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
                  <span className={`h-1.5 w-1.5 rounded-full ${apiStatus === 'healthy' ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                  {apiStatus === 'healthy' ? 'Backend aware' : 'Connection pending'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
              aria-label="Close Tate assistant"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-2">
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-3" aria-label="Tate session metadata">
              <div className="min-w-0 border-r border-white/10 pr-3">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/60">Context</div>
                <div className="mt-0.5 truncate text-xs font-black capitalize text-slate-200">{activeView}</div>
              </div>

              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/60">Dataset</div>
                <div className="mt-0.5 truncate text-xs font-black text-slate-200">{healthInfo?.dataset_size || '—'} rows</div>
              </div>
            </div>

            <button
              type="button"
              onClick={clearChatMemory}
              disabled={isClearingMemory}
              className="shrink-0 rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3.5 py-2 text-[11px] font-black text-cyan-100 transition hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-300/15 disabled:cursor-wait disabled:opacity-60"
              aria-label="Reset Tate conversation"
              title="Reset Tate conversation"
            >
              {isClearingMemory ? 'Resetting' : 'Reset'}
            </button>
          </div>
        </div>

        {buildStoryNotice && (
          <div className="border-b border-cyan-200/15 bg-cyan-300/10 px-4 py-3 text-xs font-semibold text-cyan-100">
            {buildStoryNotice}
          </div>
        )}

        {connectionError && apiStatus === 'unhealthy' && (
          <div className="border-b border-amber-200/15 bg-amber-300/10 px-4 py-3 text-xs font-semibold text-amber-100">
            Backend warning: {connectionError}
          </div>
        )}

        <div ref={messagesContainerRef} className="mobile-scroll flex-1 space-y-4 overflow-y-auto p-4">
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[86%] rounded-[1.35rem] border px-4 py-3 ${
                  isUser
                    ? 'border-cyan-200/20 bg-cyan-300/15 text-cyan-50'
                    : 'border-white/10 bg-white/[0.055] text-slate-300'
                }`}>
                  <MarkdownText text={message.content} />
                  {Array.isArray(message.suggestions) && message.suggestions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.suggestions.slice(0, 3).map((suggestion) => (
                        <button
                          key={suggestion.text || suggestion.action}
                          type="button"
                          onClick={() => handleQuickAction(suggestion.action)}
                          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-black text-slate-200 transition hover:bg-white/[0.1]"
                        >
                          {suggestion.text || 'Open'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.055] px-4 py-3 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                  Tate is analyzing the request...
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          {quickActions.length > 0 && (
            <div className="mb-3 flex gap-2 overflow-x-auto mobile-scroll pb-1">
              {quickActions.map((action) => (
                <button
                  key={`${action.label}-${action.action}`}
                  type="button"
                  onClick={() => handleQuickAction(action.action)}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-black text-slate-300 transition hover:bg-white/[0.1] hover:text-white"
                >
                  <span className="mr-1">{action.icon || '✦'}</span>{action.label}
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
            <label htmlFor="tate-chat-input" className="sr-only">Ask Tate</label>
            <input
              id="tate-chat-input"
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onInput={(event) => setInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleSend();
                }
              }}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => event.stopPropagation()}
              placeholder="Ask Tate about survival, passengers, ML, search, or architecture..."
              autoComplete="off"
              spellCheck="false"
              disabled={false}
              readOnly={false}
              className="h-12 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white px-4 text-sm font-semibold text-slate-950 placeholder:text-slate-500 shadow-inner focus:border-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300/30"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="h-12 shrink-0 rounded-2xl bg-cyan-50 px-4 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-white disabled:cursor-wait disabled:opacity-70"
              title={input.trim() ? 'Send message' : 'Type a message first'}
            >
              {isLoading ? 'Wait' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {launcher}
      {panel && typeof document !== 'undefined' ? createPortal(panel, document.body) : panel}
    </>
  );
};

export default AICopilot;
