// components/MissionGuideModal.jsx
/*
  Guided missions are now integrated directly inside Tate Mission Control.

  This component intentionally renders nothing so the website has only one
  global floating interaction point: Tate. It is kept as a compatibility layer
  because App.js may still import and mount MissionGuideModal.

  Mission completion logic remains in:
  - frontend/src/utils/explorationProgress.js

  Mission UI now lives in:
  - frontend/src/components/AICopilot.jsx
*/

const MissionGuideModal = () => null;

export default MissionGuideModal;
