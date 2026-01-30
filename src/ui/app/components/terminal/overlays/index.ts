/**
 * Terminal overlay components
 */

export { OverlayManager, type OverlayManagerProps } from './OverlayManager';

// Re-export individual overlays for direct usage if needed
export { CommandPalette } from '../CommandPalette';
export { SettingsPanel } from '../SettingsPanel';
export { ExportModal } from '../ExportModal';
export { UsageDashboard } from '../UsageDashboard';
export { ToolApprovalModal } from '../ToolApprovalModal';
export { NewSessionModal } from '../NewSessionModal';
export { StartAppModal } from '../StartAppModal';
export { ExpandedInputModal } from '../ExpandedInputModal';
export { SessionSearch } from '../SessionSearch';
export {
  SplitSessionSelector,
  AddRepoModal,
  MergeSessionsModal,
  SessionContextMenu,
} from '../SessionModals';
