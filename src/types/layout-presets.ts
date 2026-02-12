import { LayoutNode } from '../shared/ipc-types';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  shortcut: string; // "1"-"5"
  structure: LayoutNode;
  isCustom?: boolean;
}

// Preset IDs (constants for easy reference)
export const PRESET_IDS = {
  SINGLE: 'single',
  TWO_COLUMN: 'two-column',
  THREE_COLUMN: 'three-column',
  QUAD_GRID: 'quad-grid',
  CUSTOM: 'custom',
} as const;

// Export the type for preset IDs
export type PresetId = typeof PRESET_IDS[keyof typeof PRESET_IDS];
