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
  const envBaseUrl =
    process.env.REACT_APP_API_BASE_URL ||
    process.env.REACT_APP_BACKEND_URL;

  if (envBaseUrl) {
    return envBaseUrl
      .replace(/\/api\/?$/, '')
      .replace(/\/$/, '');
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
  Mission copy rule:
  - Keep titles short and action-based.
  - Describe exactly what the user must do.
  - Avoid internal/product-heavy phrases in mission titles.
  - Keep architecture/value explanation inside the guide summary, after the action is clear.

  Completion modes:
  - manual: the mission does NOT complete just because a page renders or navigation happens.
    Tate Mission Control must call markExplorationTask(taskId, { source: 'mission_interaction' }).
  - interaction: the mission completes only when a real interaction occurs inside the relevant component,
    such as search, sort, opening Tate, asking Tate, or switching ML tabs.
*/
export const EXPLORATION_TASKS = [
  {
    id: 'dashboardViewed',
    title: 'Review the dashboard',
    description: 'Look at the live status, passenger records, model accuracy, survival rate, and search index.',
    guideTitle: 'Review the Dashboard',
    guideSummary:
      'Start with the dashboard because it gives users the quickest overview of the platform. Review the live backend status and the main metrics before moving into deeper analysis.',
    guideSteps: [
      'Open the Command section.',
      'Look at the backend status and the metric cards.',
      'Confirm this mission after you have reviewed the dashboard section.',
    ],
    guideSuccess: 'Confirm that you reviewed the dashboard metrics.',
    completionMode: 'manual',
    completionLabel: 'Confirm dashboard review',
    completionHint: 'Review the dashboard metrics, then confirm this mission.',
    icon: '📊',
    section: 'dashboard',
    actionLabel: 'Open Dashboard',
    layer: 'Overview',
  },
  {
    id: 'analysisViewed',
    title: 'Review survival charts',
    description: 'Open Analysis and review the charts that explain Titanic survival patterns.',
    guideTitle: 'Review Survival Analysis',
    guideSummary:
      'This mission helps users understand the chart-based evidence behind the dataset. Review the survival patterns by class, gender, or other visible analysis views.',
    guideSteps: [
      'Open the Analysis section.',
      'Review at least one survival chart or comparison panel.',
      'Confirm this mission after you understand what the chart is showing.',
    ],
    guideSuccess: 'Confirm that you reviewed the survival analysis workspace.',
    completionMode: 'manual',
    completionLabel: 'Confirm analysis review',
    completionHint: 'Review at least one analysis chart, then confirm this mission.',
    icon: '📈',
    section: 'analysis',
    actionLabel: 'Open Analysis',
    layer: 'Analytics',
  },
  {
    id: 'mlViewed',
    title: 'Inspect model results',
    description: 'Open ML Insights and review the backend-powered model accuracy and model summary.',
    guideTitle: 'Inspect ML Insights',
    guideSummary:
      'This mission shows that the model section is connected to backend results. Review the model accuracy, model summary, and any available prediction information.',
    guideSteps: [
      'Open the ML Insights section.',
      'Review the model accuracy and model performance summary.',
      'Confirm this mission after you inspect the model results.',
    ],
    guideSuccess: 'Confirm that you inspected the ML Insights overview.',
    completionMode: 'manual',
    completionLabel: 'Confirm ML inspection',
    completionHint: 'Review the model results, then confirm this mission.',
    icon: '🤖',
    section: 'regression',
    actionLabel: 'Open ML Insights',
    layer: 'Machine Learning',
  },
  {
    id: 'mlExplored',
    title: 'Open model evidence',
    description: 'Open Feature Impact or Feature Analysis to see which variables influenced the model.',
    guideTitle: 'Open Model Evidence',
    guideSummary:
      'This mission helps users move beyond the accuracy number. Feature evidence explains which passenger attributes influenced the survival model.',
    guideSteps: [
      'Stay in the ML Insights section.',
      'Click Feature Impact or Feature Analysis.',
      'Review the variables that matter most to the survival model.',
    ],
    guideSuccess: 'Open Feature Impact or Feature Analysis in ML Insights.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when you open a model evidence tab.',
    icon: '🎯',
    section: 'regression',
    actionLabel: 'Inspect Features',
    layer: 'Model Evidence',
  },
  {
    id: 'predictionChecked',
    title: 'Check sample predictions',
    description: 'Open the Predictions tab and review the sample survival predictions.',
    guideTitle: 'Check Sample Predictions',
    guideSummary:
      'This mission shows users that the ML section can display prediction examples, not only static model accuracy.',
    guideSteps: [
      'Open the ML Insights section.',
      'Click the Predictions tab.',
      'Review at least one sample prediction result.',
    ],
    guideSuccess: 'Open the Predictions tab inside ML Insights.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when you open the Predictions tab.',
    icon: '🧑‍✈️',
    section: 'regression',
    actionLabel: 'Check Predictions',
    layer: 'Prediction',
  },
  {
    id: 'dataExplorerOpened',
    title: 'Review passenger records',
    description: 'Open Data Explorer and inspect the passenger table.',
    guideTitle: 'Review Passenger Records',
    guideSummary:
      'This mission helps users connect the charts and model outputs back to the actual passenger records in the dataset.',
    guideSteps: [
      'Open the Data Explorer section.',
      'Review the table controls and passenger columns.',
      'Confirm this mission after you inspect the records.',
    ],
    guideSuccess: 'Confirm that you reviewed the Data Explorer.',
    completionMode: 'manual',
    completionLabel: 'Confirm data review',
    completionHint: 'Review the passenger table, then confirm this mission.',
    icon: '📋',
    section: 'data',
    actionLabel: 'Open Data Explorer',
    layer: 'Data Access',
  },
  {
    id: 'passengerSearchUsed',
    title: 'Search for “alen”',
    description: 'Use the Data Explorer search demo. Try “alen” to see typo-tolerant passenger retrieval.',
    guideTitle: 'Search with “alen”',
    guideSummary:
      'This mission demonstrates intelligent search. Type “alen” or use the search demo to see how the backend can return close passenger matches such as Allen instead of only filtering the current page.',
    guideSteps: [
      'Open the Data Explorer section.',
      'Click the “Try alen search” demo button or type “alen” manually.',
      'Review the returned passenger matches.',
    ],
    guideSuccess: 'Use the Data Explorer search box or the “alen” search demo.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when you run a search query in Data Explorer.',
    icon: '🔍',
    section: 'data',
    actionLabel: 'Try “alen” Search',
    layer: 'Search',
  },
  {
    id: 'dataSorted',
    title: 'Sort a table column',
    description: 'Click a sortable column in Data Explorer to reorder the dataset.',
    guideTitle: 'Sort the Passenger Table',
    guideSummary:
      'This mission helps users understand that the table supports interactive exploration. Sorting makes it easier to compare passenger records across the whole dataset.',
    guideSteps: [
      'Open the Data Explorer section.',
      'Click a sortable table column such as Age, Fare, Class, or Name.',
      'Review how the table order changes.',
    ],
    guideSuccess: 'Click a sortable Data Explorer column.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when you click a sortable table column.',
    icon: '↕️',
    section: 'data',
    actionLabel: 'Sort Data',
    layer: 'Sorting',
  },
  {
    id: 'aiOpened',
    title: 'Open Tate',
    description: 'Open Tate to use the AI copilot and Mission Control.',
    guideTitle: 'Open Tate',
    guideSummary:
      'This mission introduces Tate as the single assistant for questions, navigation, and guided walkthrough support.',
    guideSteps: [
      'Click the Tate floating button.',
      'Check that Tate opens successfully.',
      'Review the Mission Control bar inside Tate.',
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
    description: 'Ask Tate about a passenger, model accuracy, survival patterns, or how the app works.',
    guideTitle: 'Ask Tate a Question',
    guideSummary:
      'This mission confirms that Tate is an interactive assistant. Ask a simple question and review the answer.',
    guideSteps: [
      'Open Tate.',
      'Ask a question such as “What is the model accuracy?” or “Tell me about Allen”.',
      'Review Tate’s answer.',
    ],
    guideSuccess: 'Send a question to Tate.',
    completionMode: 'interaction',
    completionHint: 'This mission completes when you send a question to Tate.',
    icon: '💬',
    section: 'copilot',
    actionLabel: 'Ask Tate',
    layer: 'AI Workflow',
  },
  {
    id: 'buildStoryViewed',
    title: 'Review the build story',
    description: 'Open Build Story and review the project architecture explanation.',
    guideTitle: 'Review the Build Story',
    guideSummary:
      'This mission helps users understand how the project was built. Review the architecture, backend, search, ML, and observability story.',
    guideSteps: [
      'Open the Build Story section.',
      'Review the main engineering layers.',
      'Confirm this mission after you understand the architecture walkthrough.',
    ],
    guideSuccess: 'Confirm that you reviewed the Build Story.',
    completionMode: 'manual',
    completionLabel: 'Confirm build story review',
    completionHint: 'Review the Build Story section, then confirm this mission.',
    icon: '⚙️',
    section: 'engineering',
    actionLabel: 'Open Build Story',
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
    Manual missions are intentionally protected.
    They should not complete from page render, route navigation, IntersectionObserver,
    or any "Next mission" navigation. They complete only from Tate Mission Control's
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
