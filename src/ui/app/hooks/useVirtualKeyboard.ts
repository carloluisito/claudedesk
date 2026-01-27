import { useState, useEffect, useCallback, useRef } from 'react';

interface KeyboardState {
  isVisible: boolean;
  height: number;
  viewportHeight: number;
}

interface VirtualKeyboardAPI {
  boundingRect: DOMRect;
  overlaysContent: boolean;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

declare global {
  interface Navigator {
    virtualKeyboard?: VirtualKeyboardAPI;
  }
}

/**
 * Hook to detect and respond to virtual keyboard visibility
 * Works on both iOS and Android
 */
export function useVirtualKeyboard(): KeyboardState {
  const [state, setState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  const initialViewportHeight = useRef(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  // Modern Virtual Keyboard API (Chrome 94+)
  useEffect(() => {
    const vk = navigator.virtualKeyboard;
    if (!vk) return;

    // Enable overlaying content mode
    vk.overlaysContent = true;

    const handleGeometryChange = () => {
      const rect = vk.boundingRect;
      const isVisible = rect.height > 0;

      setState({
        isVisible,
        height: rect.height,
        viewportHeight: window.innerHeight - rect.height,
      });

      // Set CSS custom property for other components to use
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${rect.height}px`
      );
    };

    vk.addEventListener('geometrychange', handleGeometryChange);
    return () => vk.removeEventListener('geometrychange', handleGeometryChange);
  }, []);

  // Fallback: viewport resize detection (iOS Safari, older browsers)
  useEffect(() => {
    if (navigator.virtualKeyboard) return; // Use modern API if available

    const handleResize = () => {
      const currentHeight = window.innerHeight;
      const threshold = initialViewportHeight.current * 0.25; // 25% threshold
      const heightDiff = initialViewportHeight.current - currentHeight;

      const isVisible = heightDiff > threshold;
      const keyboardHeight = isVisible ? heightDiff : 0;

      setState({
        isVisible,
        height: keyboardHeight,
        viewportHeight: currentHeight,
      });

      // Set CSS custom property
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${keyboardHeight}px`
      );
    };

    // Use visualViewport if available (better on iOS)
    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener('resize', handleResize);
      viewport.addEventListener('scroll', handleResize);
      return () => {
        viewport.removeEventListener('resize', handleResize);
        viewport.removeEventListener('scroll', handleResize);
      };
    }

    // Fallback to window resize
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
}

/**
 * Hook to scroll an element into view when keyboard appears
 */
export function useKeyboardAwareScroll(elementRef: React.RefObject<HTMLElement>) {
  const { isVisible, height } = useVirtualKeyboard();

  useEffect(() => {
    if (!isVisible || !elementRef.current) return;

    const element = elementRef.current;
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight - height;

    // Check if element is below the visible area
    if (rect.bottom > viewportHeight) {
      const scrollAmount = rect.bottom - viewportHeight + 20; // 20px padding

      // Try smooth scroll into view
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });

      // Fallback: manually scroll parent container
      const scrollContainer = findScrollContainer(element);
      if (scrollContainer) {
        scrollContainer.scrollBy({
          top: scrollAmount,
          behavior: 'smooth',
        });
      }
    }
  }, [isVisible, height, elementRef]);
}

/**
 * Find the scrollable parent container
 */
function findScrollContainer(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflow = style.overflow + style.overflowY;

    if (overflow.includes('auto') || overflow.includes('scroll')) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return document.documentElement;
}

/**
 * Hook to adjust input position when keyboard is visible
 * Returns style object to apply to the input container
 */
export function useKeyboardOffset() {
  const { isVisible, height } = useVirtualKeyboard();

  const getOffset = useCallback((): React.CSSProperties => {
    if (!isVisible) return {};

    return {
      transform: `translateY(-${Math.min(height * 0.5, 100)}px)`,
      transition: 'transform 0.2s ease-out',
    };
  }, [isVisible, height]);

  return { isKeyboardVisible: isVisible, keyboardHeight: height, getOffset };
}
