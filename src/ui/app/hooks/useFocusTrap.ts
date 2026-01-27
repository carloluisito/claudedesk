import { useEffect, useRef, useCallback, RefObject } from 'react';

/**
 * A hook that traps focus within a container element.
 * Useful for modals and dialogs to ensure keyboard accessibility.
 *
 * Features:
 * - Focuses first focusable element on mount
 * - Traps Tab/Shift+Tab within the container
 * - Restores focus to previously focused element on unmount
 *
 * @param isActive - Whether the focus trap is active
 * @returns A ref to attach to the container element
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive: boolean
): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> go to first
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    },
    [getFocusableElements]
  );

  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element to restore later
    previousFocusRef.current = document.activeElement;

    // Focus the first focusable element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Use requestAnimationFrame to ensure the element is rendered
      requestAnimationFrame(() => {
        focusableElements[0].focus();
      });
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to the previously focused element
      if (
        previousFocusRef.current &&
        previousFocusRef.current instanceof HTMLElement
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive, getFocusableElements, handleKeyDown]);

  return containerRef;
}

export default useFocusTrap;
