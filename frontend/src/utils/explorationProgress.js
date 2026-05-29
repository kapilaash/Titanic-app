// utils/explorationProgress.js
export const EXPLORATION_STORAGE_KEY = 'titanic_exploration_progress_v3';
export const EXPLORATION_GUIDE_STORAGE_KEY = 'titanic_exploration_guidance_v2';
export const EXPLORATION_EVENT = 'titanic-exploration-progress';
export const EXPLORATION_GUIDE_EVENT = 'titanic-exploration-guide';
export const OPEN_COPILOT_EVENT = 'titanic-open-copilot';

const isBrowser = () => typeof window !== 'undefined';

const getApiBaseUrl = () => {
  const envBaseUrl = import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_BACKEND_URL;
  if (envBaseUrl) return envBaseUrl.replace(/\/$/, '');
  if (isBrowser() && window.location.hostname !== 'localhost') return '';
  return 'http://localhost:5000';
};

export const EXPLORATION_TASKS = [
  {
    id: 'dashboardViewed',
    title: 'Enter the Command Center',
    description: 'Review the live executive overview and confirm the platform is connected to backend data.',
    guideTitle: 'Command Center Mission',
    guideSummary: 'The dashboard introduces the product as a live intelligence system rather than a static analytics page.',
    guideSteps: ['Review the system status.', 'Scan the live metrics.', 'Choose the next workspace.'],
    guideSuccess: 'Completed when the Dashboard overview becomes visible.',
    icon: '◎',
    section: 'dashboard',
    actionLabel: 'Open Dashboard',
    layer: 'Overview',
  },
  {
    id: 'analysisViewed',
    title: 'Investigate Survival Signals',
    description: 'Open the Analysis workspace and review patterns, correlations, and survival breakdowns.',
    guideTitle: 'Analysis Mission',
    guideSummary: 'The Analysis workspace turns the dataset into visual evidence: correlations, survival contrasts, and cohort patterns.',
    guideSteps: ['Open Analysis.', 'Review the correlation matrix.', 'Compare survival patterns.'],
    guideSuccess: 'Completed when the Analysis page is opened.',
    icon: '▧',
    section: 'analysis',
    actionLabel: 'Open Analysis',
    layer: 'Analytics',
  },
  {
    id: 'mlViewed',
    title: 'Inspect Model Intelligence',
    description: 'Open ML Insights to review backend model metrics, feature importance, and predictions.',
    guideTitle: 'Machine Learning Mission',
    guideSummary: 'The ML workspace demonstrates model performance, feature impact, and prediction behavior from the backend.',
    guideSteps: ['Review model performance.', 'Inspect feature importance.', 'Check prediction examples.'],
    guideSuccess: 'Completed when ML Insights is opened.',
    icon: '◈',
    section: 'regression',
    actionLabel: 'Open ML Insights',
    layer: 'Machine Learning',
  },
  {
    id: 'dataExplorerOpened',
    title: 'Open the Intelligence Explorer',
    description: 'Browse passenger records returned by the backend with search, sorting, and pagination.',
    guideTitle: 'Data Explorer Mission',
    guideSummary: 'The explorer validates the record-level data behind dashboard metrics, AI responses, and ML features.',
    guideSteps: ['Open Data Explorer.', 'Review pagination.', 'Inspect individual passenger rows.'],
    guideSuccess: 'Completed when Data Explorer is opened.',
    icon: '▤',
    section: 'data',
    actionLabel: 'Open Explorer',
    layer: 'Data Access',
  },
  {
    id: 'passengerSearchUsed',
    title: 'Use Intelligent Search',
    description: 'Search for a passenger, ticket, cabin, or ID. Example: type “Alen” to find Allen.',
    guideTitle: 'Search Mission',
    guideSummary: 'This mission demonstrates the retrieval layer and typo-tolerant discovery experience.',
    guideSteps: ['Open Data Explorer.', 'Search for “Alen” or “Allen”.', 'Confirm matching records are returned.'],
    guideSuccess: 'Completed when a passenger search is used.',
    icon: '⌕',
    section: 'data',
    actionLabel: 'Try Search',
    layer: 'Search',
  },
  {
    id: 'dataSorted',
    title: 'Sort the Full Dataset',
    description: 'Click a sortable column to request dataset-wide ascending or descending sorting from the backend.',
    guideTitle: 'Sorting Mission',
    guideSummary: 'Sorting should operate on the dataset query, not only the rows visible on the current page.',
    guideSteps: ['Open Data Explorer.', 'Click a sortable column.', 'Confirm the table refreshes from page one.'],
    guideSuccess: 'Completed when a table column sort is used.',
    icon: '↕',
    section: 'data',
    actionLabel: 'Sort Data',
    layer: 'Data Access',
  },
  {
    id: 'predictionChecked',
    title: 'Review Prediction Behavior',
    description: 'Open prediction examples or model outputs to see how the ML layer behaves.',
    guideTitle: 'Prediction Mission',
    guideSummary: 'Prediction examples help visitors understand what the model is estimating and how confident it is.',
    guideSteps: ['Open ML Insights.', 'Choose the Predictions tab.', 'Review actual versus predicted outcomes.'],
    guideSuccess: 'Completed when prediction examples are opened.',
    icon: '◉',
    section: 'regression',
    actionLabel: 'Check Predictions',
    layer: 'Machine Learning',
  },
  {
    id: 'mlExplored',
    title: 'Explore Feature Impact',
    description: 'Inspect feature importance or model diagnostics to understand model reasoning.',
    guideTitle: 'Feature Impact Mission',
    guideSummary: 'Feature impact proves the ML page is not only a scoreboard; it exposes model behavior.',
    guideSteps: ['Open ML Insights.', 'Choose Feature Impact.', 'Review the strongest survival drivers.'],
    guideSuccess: 'Completed when feature impact is explored.',
    icon: '✦',
    section: 'regression',
    actionLabel: 'Open Features',
    layer: 'Machine Learning',
  },
  {
    id: 'aiOpened',
    title: 'Meet Tate AI',
    description: 'Open Tate to see contextual navigation and backend-aware assistance.',
    guideTitle: 'Tate AI Mission',
    guideSummary: 'Tate is positioned as the cognitive interface for the product experience.',
    guideSteps: ['Open Tate.', 'Check backend status.', 'Use a quick action or ask a question.'],
    guideSuccess: 'Completed when Tate is opened.',
    icon: '✺',
    section: 'copilot',
    actionLabel: 'Open Tate',
    layer: 'AI Copilot',
  },
  {
    id: 'aiQuestionAsked',
    title: 'Ask Tate a Question',
    description: 'Ask about survival, model accuracy, passenger search, or how the app works.',
    guideTitle: 'AI Question Mission',
    guideSummary: 'This mission proves Tate is connected to live platform context instead of being a static helper.',
    guideSteps: ['Open Tate.', 'Ask “What powers this app?” or “Tell me about Allen”.', 'Review the response.'],
    guideSuccess: 'Completed when Tate receives a question.',
    icon: '⌁',
    section: 'copilot',
    actionLabel: 'Ask Tate',
    layer: 'AI Workflow',
  },
  {
    id: 'buildStoryViewed',
    title: 'Read the Build Story',
    description: 'Open the architecture page to understand the system behind the interface.',
    guideTitle: 'Build Story Mission',
    guideSummary: 'The Build Story converts the portfolio project into a guided architecture walkthrough.',
    guideSteps: ['Review the journey progress.', 'Open engineering layers.', 'Follow recommendations to explore.'],
    guideSuccess: 'Completed when Build Story is opened.',
    icon: '⌬',
    section: 'engineering',
    actionLabel: 'Build Story',
    layer: 'Architecture',
  },
];

const createInitialProgress = () => EXPLORATION_TASKS.reduce((accumulator, task) => ({
  ...accumulator,
  [task.id]: false,
}), {});

const createInitialGuideState = () => ({
  pendingTaskId: null,
  minimized: {},
  dismissed: {},
  completedGuides: {},
});

const safeJsonParse = (rawValue, fallback) => {
  try {
    return rawValue ? JSON.parse(rawValue) : fallback;
  } catch {
    return fallback;
  }
};

export const getTaskById = (taskId) => EXPLORATION_TASKS.find((task) => task.id === taskId) || null;

export const getExplorationProgress = () => {
  if (!isBrowser()) return createInitialProgress();

  const savedProgress = safeJsonParse(
    window.localStorage.getItem(EXPLORATION_STORAGE_KEY),
    {}
  );

  return {
    ...createInitialProgress(),
    ...(savedProgress && typeof savedProgress === 'object' ? savedProgress : {}),
  };
};

export const saveExplorationProgress = (progress) => {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(EXPLORATION_STORAGE_KEY, JSON.stringify(progress));
    window.dispatchEvent(new CustomEvent(EXPLORATION_EVENT, { detail: progress }));
  } catch (error) {
    console.warn('Unable to save exploration progress:', error);
  }
};

export const markExplorationTask = (taskId) => {
  if (!taskId) return;

  const task = getTaskById(taskId);
  if (!task) return;

  const progress = getExplorationProgress();
  if (progress[taskId]) return;

  const nextProgress = {
    ...progress,
    [taskId]: true,
  };

  saveExplorationProgress(nextProgress);

  trackFrontendEvent({
    eventName: 'mission_task_completed',
    section: task.section,
    taskId,
    metadata: {
      title: task.title,
      layer: task.layer,
    },
  });
};

export const resetExplorationProgress = () => {
  const initialProgress = createInitialProgress();
  saveExplorationProgress(initialProgress);
  saveExplorationGuideState(createInitialGuideState());
};

export const getNextExplorationTask = (progress = getExplorationProgress()) => (
  EXPLORATION_TASKS.find((task) => !progress[task.id]) || null
);

export const getExplorationGuideState = () => {
  if (!isBrowser()) return createInitialGuideState();

  const savedState = safeJsonParse(
    window.localStorage.getItem(EXPLORATION_GUIDE_STORAGE_KEY),
    {}
  );

  return {
    ...createInitialGuideState(),
    ...(savedState && typeof savedState === 'object' ? savedState : {}),
  };
};

export const saveExplorationGuideState = (state) => {
  if (!isBrowser()) return;

  try {
    const nextState = {
      ...createInitialGuideState(),
      ...(state && typeof state === 'object' ? state : {}),
    };

    window.localStorage.setItem(EXPLORATION_GUIDE_STORAGE_KEY, JSON.stringify(nextState));
    window.dispatchEvent(new CustomEvent(EXPLORATION_GUIDE_EVENT, { detail: nextState }));
  } catch (error) {
    console.warn('Unable to save exploration guide state:', error);
  }
};

export const requestMissionGuide = (taskId) => {
  if (!getTaskById(taskId)) return;

  const state = getExplorationGuideState();
  saveExplorationGuideState({
    ...state,
    pendingTaskId: taskId,
    dismissed: {
      ...state.dismissed,
      [taskId]: false,
    },
    minimized: {
      ...state.minimized,
      [taskId]: false,
    },
  });
};

export const dismissMissionGuide = (taskId) => {
  const state = getExplorationGuideState();
  saveExplorationGuideState({
    ...state,
    dismissed: {
      ...state.dismissed,
      [taskId]: true,
    },
    completedGuides: {
      ...state.completedGuides,
      [taskId]: true,
    },
  });
};

export const minimizeMissionGuide = (taskId) => {
  const state = getExplorationGuideState();
  saveExplorationGuideState({
    ...state,
    minimized: {
      ...state.minimized,
      [taskId]: true,
    },
  });
};

export const reopenMissionGuide = (taskId) => {
  const state = getExplorationGuideState();
  saveExplorationGuideState({
    ...state,
    pendingTaskId: taskId,
    minimized: {
      ...state.minimized,
      [taskId]: false,
    },
    dismissed: {
      ...state.dismissed,
      [taskId]: false,
    },
  });
};

export const openCopilotFromMission = () => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));
};

export const trackFrontendEvent = async ({
  eventName,
  section = 'unknown',
  taskId = '',
  metadata = {},
}) => {
  if (!isBrowser() || !eventName) return;

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
