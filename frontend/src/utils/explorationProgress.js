// utils/explorationProgress.js
export const EXPLORATION_STORAGE_KEY = 'titanic_exploration_progress_v3';
export const EXPLORATION_GUIDE_STORAGE_KEY = 'titanic_exploration_guidance_v2';
export const EXPLORATION_EVENT = 'titanic-exploration-progress';
export const EXPLORATION_GUIDE_EVENT = 'titanic-exploration-guide';
export const OPEN_COPILOT_EVENT = 'titanic-open-copilot';

const VALID_MANUAL_COMPLETION_SOURCES = new Set([
  'manual_confirm',
  'mission_interaction',
  'mission_confirm',
]);

const getApiBaseUrl = () => {
  const envBaseUrl = import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_BACKEND_URL;

  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return '';
  }

  return 'http://localhost:5000';
};

export const trackFrontendEvent = async ({
  eventName,
  section = 'unknown',
  taskId = '',
  metadata = {},
}) => {
  if (typeof window === 'undefined') return;

  try {
    await fetch(`${getApiBaseUrl()}/api/observability/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        event_name: eventName,
        section,
        task_id: taskId,
        metadata,
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn('Unable to send observability event:', error);
  }
};

/*
  Completion modes:
  - manual: the mission does NOT complete just because a page renders or navigation happens.
    The Mission Guide must call markExplorationTask(taskId, { source: 'mission_interaction' }).
  - interaction: the mission completes only when a real interaction occurs inside the relevant component,
    such as search, sort, opening Tate, asking Tate, or switching ML tabs.
*/
export const EXPLORATION_TASKS = [
  {
    id: 'dashboardViewed',
    title: 'Scan the live dashboard',
    description: 'Open the dashboard and confirm the command-center signals are visible.',
    guideTitle: 'Dashboard Signal Scan',
    guideSummary:
      'The dashboard is the entry point. It should feel like a command center, not a static landing page.',
    guideSteps: [
      'Go to the Dashboard.',
      'Review the live status, metrics, and architecture summary.',
      'Click the mission confirmation button to record that you intentionally scanned the dashboard.',
    ],
    guideSuccess: 'Confirm that you reviewed the dashboard signals.',
    completionMode: 'manual',
    completionLabel: 'Confirm dashboard scan',
    completionHint: 'This mission requires a confirmation click inside the Dashboard.',
    icon: '📊',
    section: 'dashboard',
    actionLabel: 'Go to Dashboard',
    layer: 'Overview',
  },
  {
    id: 'analysisViewed',
    title: 'Interact with survival analysis',
    description: 'Open Analysis and confirm the survival analytics workspace has been reviewed.',
    guideTitle: 'Survival Analysis Interaction',
    guideSummary:
      'The Analysis page presents survival patterns, chart reasoning, and correlation evidence.',
    guideSteps: [
      'Open the Analysis workspace.',
      'Review at least one survival chart or correlation view.',
      'Confirm the analysis review from the mission guide.',
    ],
    guideSuccess: 'Confirm that you reviewed the analysis workspace.',
    completionMode: 'manual',
    completionLabel: 'Confirm analysis review',
    completionHint: 'This mission requires a confirmation click after entering Analysis.',
    icon: '📈',
    section: 'analysis',
    actionLabel: 'Open Analysis',
    layer: 'Analytics',
  },
  {
    id: 'mlViewed',
    title: 'Inspect ML insights',
    description: 'Open ML Insights and confirm the backend-powered model section has been reviewed.',
    guideTitle: 'Machine Learning Inspection',
    guideSummary:
      'The ML page demonstrates model performance, backend accuracy, feature importance, and predictions.',
    guideSteps: [
      'Open ML Insights.',
      'Look at the model performance summary.',
      'Confirm that you inspected the model workspace.',
    ],
    guideSuccess: 'Confirm that you inspected ML Insights.',
    completionMode: 'manual',
    completionLabel: 'Confirm ML inspection',
    completionHint: 'This mission requires a confirmation click inside ML Insights.',
    icon: '🤖',
    section: 'regression',
    actionLabel: 'Open ML Insights',
    layer: 'Machine Learning',
  },
  {
    id: 'mlExplored',
    title: 'Open a model evidence tab',
    description: 'Switch to Feature Impact or Feature Analysis inside ML Insights.',
    guideTitle: 'Model Evidence Interaction',
    guideSummary:
      'A model is more credible when users inspect the evidence behind the prediction, not only the accuracy number.',
    guideSteps: [
      'Stay in ML Insights.',
      'Click Feature Impact or Feature Analysis.',
      'Review how the backend model explains passenger survival behavior.',
    ],
    guideSuccess: 'Click Feature Impact or Feature Analysis in ML Insights.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when the user changes to an ML evidence tab.',
    icon: '🎯',
    section: 'regression',
    actionLabel: 'Inspect Features',
    layer: 'Model Evidence',
  },
  {
    id: 'predictionChecked',
    title: 'Check prediction examples',
    description: 'Open the Predictions tab and inspect sample passenger predictions.',
    guideTitle: 'Prediction Review Interaction',
    guideSummary:
      'The prediction mission proves the frontend is reading prediction objects returned by the backend model endpoint.',
    guideSteps: [
      'Open ML Insights.',
      'Click the Predictions tab.',
      'Review at least one sample prediction card.',
    ],
    guideSuccess: 'Click the Predictions tab inside ML Insights.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when the Predictions tab is opened.',
    icon: '🧑‍✈️',
    section: 'regression',
    actionLabel: 'Check Predictions',
    layer: 'Prediction',
  },
  {
    id: 'dataExplorerOpened',
    title: 'Inspect the Data Explorer',
    description: 'Open the Data Explorer and confirm that row-level passenger data is visible.',
    guideTitle: 'Data Explorer Inspection',
    guideSummary:
      'The Data Explorer validates the records behind the dashboard, search, model, and Tate responses.',
    guideSteps: [
      'Open Data Explorer.',
      'Review the table controls and row-level passenger fields.',
      'Confirm that you inspected the data workspace.',
    ],
    guideSuccess: 'Confirm that you inspected the Data Explorer.',
    completionMode: 'manual',
    completionLabel: 'Confirm data inspection',
    completionHint: 'This mission requires a confirmation click inside Data Explorer.',
    icon: '📋',
    section: 'data',
    actionLabel: 'Open Data Explorer',
    layer: 'Data Access',
  },
  {
    id: 'passengerSearchUsed',
    title: 'Test intelligent search with “alen”',
    description: 'Use the Data Explorer demo search. Try “alen” to see typo-tolerant passenger retrieval.',
    guideTitle: 'Meilisearch Interaction',
    guideSummary:
      'This mission explains the intelligent search layer. A user can type a rough or misspelled name such as “alen” and see the backend return relevant passenger matches instead of relying on a simple current-page table filter.',
    guideSteps: [
      'Open Data Explorer.',
      'Click the “Try alen search” demo button or type “alen” manually.',
      'Review the returned passenger matches and the search engine indicator.',
    ],
    guideSuccess: 'Use the Data Explorer search box or the “alen” search demo.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when the user runs a search query.',
    icon: '🔍',
    section: 'data',
    actionLabel: 'Try “alen” Search',
    layer: 'Meilisearch',
  },
  {
    id: 'dataSorted',
    title: 'Sort a dataset column',
    description: 'Click a sortable column so the backend returns a dataset-wide sorted response.',
    guideTitle: 'Dataset Sorting Interaction',
    guideSummary:
      'Sorting demonstrates that the table is not only a visual component. It coordinates with backend query behavior.',
    guideSteps: [
      'Open Data Explorer.',
      'Click a sortable table column.',
      'Observe the reordered backend response.',
    ],
    guideSuccess: 'Click a sortable Data Explorer column.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when a sortable column is clicked.',
    icon: '↕️',
    section: 'data',
    actionLabel: 'Sort Data',
    layer: 'Sorting',
  },
  {
    id: 'aiOpened',
    title: 'Open Tate AI',
    description: 'Open Tate to see contextual navigation and backend-aware guidance.',
    guideTitle: 'Tate AI Launch',
    guideSummary:
      'Tate is the cognitive interface. Opening it should feel like activating the intelligence layer.',
    guideSteps: [
      'Open Tate using the floating AI launcher or this mission.',
      'Check that Tate is online.',
      'Review the suggested actions.',
    ],
    guideSuccess: 'Open Tate AI.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when Tate is opened.',
    icon: '🧠',
    section: 'copilot',
    actionLabel: 'Open Tate',
    layer: 'AI Copilot',
  },
  {
    id: 'aiQuestionAsked',
    title: 'Ask Tate a question',
    description: 'Ask about survival, model accuracy, passenger search, or how the app works.',
    guideTitle: 'AI Question Interaction',
    guideSummary:
      'This mission proves Tate is not decorative. It receives user input and responds with backend-aware context.',
    guideSteps: [
      'Open Tate.',
      'Ask a question such as “What is the model accuracy?” or “Tell me about Allen”.',
      'Review Tate’s answer.',
    ],
    guideSuccess: 'Send a question to Tate.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when a user sends Tate a question.',
    icon: '💬',
    section: 'copilot',
    actionLabel: 'Ask Tate',
    layer: 'AI Workflow',
  },
  {
    id: 'buildStoryViewed',
    title: 'Review the build story',
    description: 'Open Build Story and confirm the architecture walkthrough has been reviewed.',
    guideTitle: 'Build Story Review',
    guideSummary:
      'The Build Story turns the project into a guided architecture walkthrough, helping visitors understand the engineering value.',
    guideSteps: [
      'Open Build Story.',
      'Review the engineering layers and mission checklist.',
      'Confirm that you reviewed the architecture story.',
    ],
    guideSuccess: 'Confirm that you reviewed the Build Story.',
    completionMode: 'manual',
    completionLabel: 'Confirm build story review',
    completionHint: 'This mission requires a confirmation click inside Build Story.',
    icon: '⚙️',
    section: 'engineering',
    actionLabel: 'Build Story',
    layer: 'Architecture',
  },
];

const createInitialProgress = () =>
  EXPLORATION_TASKS.reduce((acc, task) => ({ ...acc, [task.id]: false }), {});

const createInitialGuideState = () => ({
  pendingTaskId: null,
  minimized: {},
  dismissed: {},
  completedGuides: {},
});

export const getTaskById = (taskId) =>
  EXPLORATION_TASKS.find((task) => task.id === taskId) || null;

export const getNextExplorationTask = (progress = getExplorationProgress()) =>
  EXPLORATION_TASKS.find((task) => !progress[task.id]) || null;

export const getExplorationProgress = () => {
  const initialProgress = createInitialProgress();

  if (typeof window === 'undefined') return initialProgress;

  try {
    const savedProgress = window.localStorage.getItem(EXPLORATION_STORAGE_KEY);
    const parsedProgress = savedProgress ? JSON.parse(savedProgress) : {};

    return EXPLORATION_TASKS.reduce((acc, task) => {
      acc[task.id] = Boolean(parsedProgress?.[task.id]);
      return acc;
    }, initialProgress);
  } catch (error) {
    console.warn('Unable to read exploration progress:', error);
    return initialProgress;
  }
};

export const saveExplorationProgress = (progress) => {
  if (typeof window === 'undefined') return;

  try {
    const normalizedProgress = EXPLORATION_TASKS.reduce((acc, task) => {
      acc[task.id] = Boolean(progress?.[task.id]);
      return acc;
    }, {});

    window.localStorage.setItem(EXPLORATION_STORAGE_KEY, JSON.stringify(normalizedProgress));
    window.dispatchEvent(new CustomEvent(EXPLORATION_EVENT, { detail: normalizedProgress }));
  } catch (error) {
    console.warn('Unable to save exploration progress:', error);
  }
};

export const markExplorationTask = (taskId, options = {}) => {
  const task = getTaskById(taskId);

  if (!task) {
    return false;
  }

  const source = options?.source || 'component_event';

  /*
    View-only missions are intentionally protected.
    They should not complete from page render, route navigation, IntersectionObserver,
    or "Next mission" navigation. They complete only from the Mission Guide's
    explicit confirmation interaction.
  */
  if (task.completionMode === 'manual' && !VALID_MANUAL_COMPLETION_SOURCES.has(source)) {
    return false;
  }

  const progress = getExplorationProgress();

  if (progress[taskId]) {
    return true;
  }

  const nextProgress = {
    ...progress,
    [taskId]: true,
  };

  saveExplorationProgress(nextProgress);

  trackFrontendEvent({
    eventName: 'exploration_task_completed',
    section: task.section || 'unknown',
    taskId,
    metadata: {
      taskTitle: task.title,
      layer: task.layer,
      completionMode: task.completionMode,
      source,
      ...options?.metadata,
    },
  });

  return true;
};

export const resetExplorationProgress = () => {
  const resetProgress = createInitialProgress();

  saveExplorationProgress(resetProgress);

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(EXPLORATION_GUIDE_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent(EXPLORATION_GUIDE_EVENT, { detail: createInitialGuideState() }));
    }
  } catch (error) {
    console.warn('Unable to reset exploration guide state:', error);
  }

  trackFrontendEvent({
    eventName: 'exploration_progress_reset',
    section: 'engineering',
    metadata: { totalTasks: EXPLORATION_TASKS.length },
  });
};

export const getExplorationGuideState = () => {
  if (typeof window === 'undefined') return createInitialGuideState();

  try {
    const savedState = window.localStorage.getItem(EXPLORATION_GUIDE_STORAGE_KEY);
    const parsedState = savedState ? JSON.parse(savedState) : {};

    return {
      ...createInitialGuideState(),
      ...parsedState,
      minimized: parsedState?.minimized || {},
      dismissed: parsedState?.dismissed || {},
      completedGuides: parsedState?.completedGuides || {},
    };
  } catch (error) {
    console.warn('Unable to read exploration guide state:', error);
    return createInitialGuideState();
  }
};

export const saveExplorationGuideState = (state) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(EXPLORATION_GUIDE_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(EXPLORATION_GUIDE_EVENT, { detail: state }));
  } catch (error) {
    console.warn('Unable to save exploration guide state:', error);
  }
};

export const requestMissionGuide = (taskId) => {
  const task = getTaskById(taskId);
  if (!task) return;

  const currentState = getExplorationGuideState();

  saveExplorationGuideState({
    ...currentState,
    pendingTaskId: taskId,
    minimized: {
      ...currentState.minimized,
      [taskId]: false,
    },
    dismissed: {
      ...currentState.dismissed,
      [taskId]: false,
    },
  });

  trackFrontendEvent({
    eventName: 'mission_guide_requested',
    section: task.section || 'unknown',
    taskId,
    metadata: {
      taskTitle: task.title,
      completionMode: task.completionMode,
    },
  });
};

export const dismissMissionGuide = (taskId) => {
  const currentState = getExplorationGuideState();

  saveExplorationGuideState({
    ...currentState,
    dismissed: {
      ...currentState.dismissed,
      [taskId]: true,
    },
  });
};

export const minimizeMissionGuide = (taskId) => {
  const currentState = getExplorationGuideState();

  saveExplorationGuideState({
    ...currentState,
    minimized: {
      ...currentState.minimized,
      [taskId]: true,
    },
  });
};

export const reopenMissionGuide = (taskId) => {
  const currentState = getExplorationGuideState();

  saveExplorationGuideState({
    ...currentState,
    pendingTaskId: taskId || currentState.pendingTaskId,
    minimized: {
      ...currentState.minimized,
      [taskId || currentState.pendingTaskId]: false,
    },
  });
};

export const openCopilotFromMission = () => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));

  trackFrontendEvent({
    eventName: 'tate_opened_from_mission',
    section: 'copilot',
    taskId: 'aiOpened',
  });
};
