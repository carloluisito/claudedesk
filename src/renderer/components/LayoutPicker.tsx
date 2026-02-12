import { useEffect, useState, useRef, useCallback } from 'react';
import { LayoutPreset } from '../../types/layout-presets';
import { LayoutPreviewCard } from './LayoutPreviewCard';
import { CustomLayoutBuilder } from './CustomLayoutBuilder';

interface LayoutPickerProps {
  isOpen: boolean;
  presets: LayoutPreset[];
  currentPresetId: string | null;
  onSelectPreset: (preset: LayoutPreset) => void;
  onCreateCustom: (rows: number, cols: number) => void;
  onClose: () => void;
}

export function LayoutPicker({
  isOpen,
  presets,
  currentPresetId,
  onSelectPreset,
  onCreateCustom,
  onClose,
}: LayoutPickerProps) {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Reset focused index when opened
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
    }
  }, [isOpen]);

  // Focus first card when opened
  useEffect(() => {
    if (isOpen && cardRefs.current[0]) {
      // Small delay to let the animation start
      setTimeout(() => {
        cardRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen || isCustomBuilderOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Number keys 1-5 for quick select
      const num = parseInt(e.key);
      if (num >= 1 && num <= 5) {
        const preset = presets.find(p => p.shortcut === e.key);
        if (preset) {
          if (preset.isCustom) {
            setIsCustomBuilderOpen(true);
          } else {
            onSelectPreset(preset);
          }
        }
        return;
      }

      // Arrow key navigation
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev + 1) % presets.length;
          cardRefs.current[next]?.focus();
          return next;
        });
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = (prev - 1 + presets.length) % presets.length;
          cardRefs.current[next]?.focus();
          return next;
        });
      }

      // Tab navigation
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          setFocusedIndex(prev => {
            const next = (prev - 1 + presets.length) % presets.length;
            cardRefs.current[next]?.focus();
            return next;
          });
        } else {
          setFocusedIndex(prev => {
            const next = (prev + 1) % presets.length;
            cardRefs.current[next]?.focus();
            return next;
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isCustomBuilderOpen, presets, onSelectPreset, onClose]);

  const handlePresetSelect = useCallback((preset: LayoutPreset) => {
    if (preset.isCustom) {
      setIsCustomBuilderOpen(true);
    } else {
      onSelectPreset(preset);
    }
  }, [onSelectPreset]);

  const handleCustomCreate = useCallback((rows: number, cols: number) => {
    onCreateCustom(rows, cols);
    setIsCustomBuilderOpen(false);
  }, [onCreateCustom]);

  if (!isOpen) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className="layout-picker-overlay"
        onClick={(e) => {
          if (e.target === overlayRef.current) {
            onClose();
          }
        }}
      >
        <div className="layout-picker-container">
          <div className="layout-picker-header">
            <h1>Choose Your Workspace Layout</h1>
            <p>Select a layout preset or create a custom grid</p>
          </div>

          <div className="layout-picker-grid">
            {presets.map((preset, index) => (
              <div
                key={preset.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className="layout-picker-grid-item"
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <LayoutPreviewCard
                  preset={preset}
                  isSelected={preset.id === currentPresetId}
                  isFocused={index === focusedIndex}
                  onSelect={() => handlePresetSelect(preset)}
                  onFocus={() => setFocusedIndex(index)}
                />
              </div>
            ))}
          </div>

          <div className="layout-picker-footer">
            <div className="layout-picker-hint">
              Use <kbd>1</kbd>-<kbd>5</kbd> for quick select • <kbd>Tab</kbd> to navigate • <kbd>ESC</kbd> to close
            </div>
          </div>
        </div>
      </div>

      <CustomLayoutBuilder
        isOpen={isCustomBuilderOpen}
        onClose={() => setIsCustomBuilderOpen(false)}
        onCreate={handleCustomCreate}
      />
    </>
  );
}
