import { useState, useEffect, useCallback, useMemo } from 'react';
import { PromptTemplate } from '../../shared/types/prompt-templates';
import { fuzzySearch, FuzzySearchResult } from '../utils/fuzzy-search';

interface UseCommandPaletteOptions {
  onSelect?: (template: PromptTemplate) => void;
  onClose?: () => void;
}

export function useCommandPalette(options: UseCommandPaletteOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Load templates when opened
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const allTemplates = await window.electronAPI.listAllTemplates();
      setTemplates(allTemplates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fuzzy search filtered results
  const filteredResults = useMemo<FuzzySearchResult<PromptTemplate>[]>(() => {
    return fuzzySearch(
      templates,
      query,
      {
        name: (t) => t.name,
        description: (t) => t.description,
        keywords: (t) => t.keywords,
      },
      0 // Include all results, even with score 0
    );
  }, [templates, query]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults.length, query]);

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
    options.onClose?.();
  }, [options]);

  const selectTemplate = useCallback(
    (template: PromptTemplate) => {
      options.onSelect?.(template);
      close();
    },
    [options, close]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;

        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : prev
          );
          break;

        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case 'Enter':
          e.preventDefault();
          if (filteredResults.length > 0) {
            selectTemplate(filteredResults[selectedIndex].item);
          }
          break;

        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            // Shift+Tab: previous
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          } else {
            // Tab: next
            setSelectedIndex((prev) =>
              prev < filteredResults.length - 1 ? prev + 1 : prev
            );
          }
          break;
      }
    },
    [isOpen, filteredResults, selectedIndex, close, selectTemplate]
  );

  // Setup keyboard handler
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const refresh = useCallback(() => {
    loadTemplates();
  }, []);

  return {
    isOpen,
    open,
    close,
    query,
    setQuery,
    templates,
    filteredResults,
    selectedIndex,
    setSelectedIndex,
    selectTemplate,
    isLoading,
    refresh,
  };
}
