import { v4 as uuidv4 } from 'uuid';
import { LayoutNode, LayoutLeaf, LayoutGrid } from '../shared/ipc-types';
import { LayoutPreset, PRESET_IDS } from '../types/layout-presets';
import { SettingsManager } from './settings-persistence';

/**
 * LayoutPresetsManager — Manages layout presets, custom grid generation, and validation.
 */
export class LayoutPresetsManager {
  private settingsPersistence: SettingsManager;
  private defaultPresets: LayoutPreset[];

  constructor(settingsPersistence: SettingsManager) {
    this.settingsPersistence = settingsPersistence;
    this.defaultPresets = this.buildDefaultPresets();
  }

  /**
   * Get all available layout presets
   */
  getPresets(): LayoutPreset[] {
    return this.defaultPresets;
  }

  /**
   * Get a specific preset by ID
   */
  getPresetById(id: string): LayoutPreset | null {
    return this.defaultPresets.find(p => p.id === id) || null;
  }

  /**
   * Generate a custom grid layout from rows and columns
   */
  createCustomGridLayout(rows: number, cols: number): LayoutNode {
    // Validate inputs
    if (rows < 1 || rows > 6 || cols < 1 || cols > 6) {
      throw new Error('Rows and columns must be between 1 and 6');
    }

    // If single pane, return a leaf
    if (rows === 1 && cols === 1) {
      return this.createLeaf();
    }

    // If single row, create horizontal grid
    if (rows === 1) {
      return this.createHorizontalGrid(cols);
    }

    // If single column, create vertical grid
    if (cols === 1) {
      return this.createVerticalGrid(rows);
    }

    // Otherwise, create a grid of rows, each containing columns
    const rowSize = 100 / rows;
    const colSize = 100 / cols;
    const rowChildren: LayoutNode[] = [];

    for (let r = 0; r < rows; r++) {
      const colChildren: LayoutNode[] = [];
      for (let c = 0; c < cols; c++) {
        colChildren.push(this.createLeaf());
      }

      // Create horizontal grid for this row
      rowChildren.push({
        type: 'grid',
        id: uuidv4(),
        direction: 'horizontal',
        children: colChildren,
        sizes: new Array(cols).fill(colSize),
      });
    }

    // Return vertical grid of rows
    return {
      type: 'grid',
      id: uuidv4(),
      direction: 'vertical',
      children: rowChildren,
      sizes: new Array(rows).fill(rowSize),
    };
  }

  /**
   * Validate a layout structure
   */
  validateLayout(node: LayoutNode): boolean {
    try {
      return this.validateNode(node);
    } catch (err) {
      console.error('Layout validation failed:', err);
      return false;
    }
  }

  /**
   * Save the last used preset ID to settings
   */
  saveLastUsedPreset(presetId: string): void {
    try {
      this.settingsPersistence.updateLastUsedLayoutPreset(presetId);
    } catch (err) {
      console.error('Failed to save last used preset:', err);
    }
  }

  // ── Private helpers ──

  private buildDefaultPresets(): LayoutPreset[] {
    return [
      {
        id: PRESET_IDS.SINGLE,
        name: 'Single Pane',
        description: 'One full-width terminal',
        shortcut: '1',
        structure: this.createLeaf(),
      },
      {
        id: PRESET_IDS.TWO_COLUMN,
        name: '2-Column Layout',
        description: 'Two terminals side-by-side',
        shortcut: '2',
        structure: this.createHorizontalGrid(2),
      },
      {
        id: PRESET_IDS.THREE_COLUMN,
        name: '3-Column Layout',
        description: 'Three equal-width terminals',
        shortcut: '3',
        structure: this.createHorizontalGrid(3),
      },
      {
        id: PRESET_IDS.QUAD_GRID,
        name: '2×2 Grid',
        description: 'Four terminals in a grid',
        shortcut: '4',
        structure: this.createQuadGrid(),
      },
      {
        id: PRESET_IDS.CUSTOM,
        name: 'Custom Layout',
        description: 'Build your own grid',
        shortcut: '5',
        structure: this.createLeaf(), // Placeholder, overridden by builder
        isCustom: true,
      },
    ];
  }

  private createLeaf(): LayoutLeaf {
    return {
      type: 'leaf',
      paneId: uuidv4(),
      sessionId: null,
    };
  }

  private createHorizontalGrid(count: number): LayoutGrid {
    const size = 100 / count;
    const children: LayoutNode[] = [];

    for (let i = 0; i < count; i++) {
      children.push(this.createLeaf());
    }

    return {
      type: 'grid',
      id: uuidv4(),
      direction: 'horizontal',
      children,
      sizes: new Array(count).fill(size),
    };
  }

  private createVerticalGrid(count: number): LayoutGrid {
    const size = 100 / count;
    const children: LayoutNode[] = [];

    for (let i = 0; i < count; i++) {
      children.push(this.createLeaf());
    }

    return {
      type: 'grid',
      id: uuidv4(),
      direction: 'vertical',
      children,
      sizes: new Array(count).fill(size),
    };
  }

  private createQuadGrid(): LayoutGrid {
    // 2×2 grid: vertical split of two horizontal splits
    const topRow: LayoutGrid = {
      type: 'grid',
      id: uuidv4(),
      direction: 'horizontal',
      children: [this.createLeaf(), this.createLeaf()],
      sizes: [50, 50],
    };

    const bottomRow: LayoutGrid = {
      type: 'grid',
      id: uuidv4(),
      direction: 'horizontal',
      children: [this.createLeaf(), this.createLeaf()],
      sizes: [50, 50],
    };

    return {
      type: 'grid',
      id: uuidv4(),
      direction: 'vertical',
      children: [topRow, bottomRow],
      sizes: [50, 50],
    };
  }

  private validateNode(node: LayoutNode): boolean {
    if (!node || typeof node !== 'object') {
      return false;
    }

    if (node.type === 'leaf') {
      return typeof node.paneId === 'string';
    }

    if (node.type === 'branch') {
      return (
        typeof node.direction === 'string' &&
        typeof node.ratio === 'number' &&
        node.ratio >= 0 &&
        node.ratio <= 1 &&
        Array.isArray(node.children) &&
        node.children.length === 2 &&
        this.validateNode(node.children[0]) &&
        this.validateNode(node.children[1])
      );
    }

    if (node.type === 'grid') {
      if (
        typeof node.id !== 'string' ||
        (node.direction !== 'horizontal' && node.direction !== 'vertical') ||
        !Array.isArray(node.children) ||
        !Array.isArray(node.sizes) ||
        node.children.length !== node.sizes.length ||
        node.children.length === 0
      ) {
        return false;
      }

      // Validate sizes sum to approximately 100
      const sum = node.sizes.reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.5) {
        return false;
      }

      // Validate all children
      return node.children.every(child => this.validateNode(child));
    }

    return false;
  }
}
