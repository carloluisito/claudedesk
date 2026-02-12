import { useState, useEffect, useCallback } from 'react';
import { LayoutPreset } from '../../types/layout-presets';

export interface UseLayoutPickerReturn {
  isPickerOpen: boolean;
  presets: LayoutPreset[];
  currentPresetId: string | null;
  setCurrentPresetId: (id: string | null) => void;
  openPicker: () => void;
  closePicker: () => void;
  selectPreset: (preset: LayoutPreset) => Promise<void>;
}

export function useLayoutPicker(
  onPresetSelected?: (preset: LayoutPreset) => void
): UseLayoutPickerReturn {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [presets, setPresets] = useState<LayoutPreset[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);

  // Load presets on mount
  useEffect(() => {
    const loadPresets = async () => {
      try {
        const fetchedPresets = await window.electronAPI.getLayoutPresets();
        setPresets(fetchedPresets);

        // Load last used preset ID from settings
        const settings = await window.electronAPI.getSettings();
        setCurrentPresetId(settings.lastUsedLayoutPresetId || null);
      } catch (err) {
        console.error('Failed to load layout presets:', err);
      }
    };

    loadPresets();
  }, []);

  const openPicker = useCallback(() => {
    setIsPickerOpen(true);
  }, []);

  const closePicker = useCallback(() => {
    setIsPickerOpen(false);
  }, []);

  const selectPreset = useCallback(async (preset: LayoutPreset) => {
    try {
      // Apply the preset
      const success = await window.electronAPI.applyLayoutPreset(preset.id);

      if (success) {
        setCurrentPresetId(preset.id);
        closePicker();

        // Notify callback
        if (onPresetSelected) {
          onPresetSelected(preset);
        }
      } else {
        console.error('Failed to apply preset:', preset.id);
      }
    } catch (err) {
      console.error('Error applying preset:', err);
    }
  }, [closePicker, onPresetSelected]);

  return {
    isPickerOpen,
    presets,
    currentPresetId,
    setCurrentPresetId,
    openPicker,
    closePicker,
    selectPreset,
  };
}
