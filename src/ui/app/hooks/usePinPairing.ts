import { useState, useCallback } from 'react';
import { api } from '../lib/api';

export interface PinStatus {
  hasActivePin: boolean;
  expiresAt?: number;
  expiresInSeconds?: number;
}

export interface GeneratedPin {
  pin: string;
  expiresAt: number;
  expiresInSeconds: number;
}

export interface ValidationResult {
  success: boolean;
  token?: string;
  error?: string;
  attemptsRemaining?: number;
}

export function usePinPairing() {
  const [generating, setGenerating] = useState(false);
  const [validating, setValidating] = useState(false);

  // Desktop: Generate a new pairing PIN
  const generatePin = useCallback(async (): Promise<GeneratedPin | null> => {
    setGenerating(true);
    try {
      const data = await api<GeneratedPin>('POST', '/auth/pin/generate');
      return data;
    } catch (error) {
      console.error('Failed to generate PIN:', error);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  // Desktop: Get status of active PIN
  const getPinStatus = useCallback(async (): Promise<PinStatus | null> => {
    try {
      const data = await api<PinStatus>('GET', '/auth/pin/status');
      return data;
    } catch (error) {
      console.error('Failed to get PIN status:', error);
      return null;
    }
  }, []);

  // Desktop: Invalidate current PIN
  const invalidatePin = useCallback(async (): Promise<boolean> => {
    try {
      const data = await api<{ invalidated: boolean }>('DELETE', '/auth/pin');
      return data.invalidated;
    } catch (error) {
      console.error('Failed to invalidate PIN:', error);
      return false;
    }
  }, []);

  // Mobile: Validate a PIN
  const validatePin = useCallback(async (pin: string): Promise<ValidationResult> => {
    setValidating(true);
    try {
      // Call validate endpoint without auth (it's the auth entry point)
      const response = await fetch('/api/auth/pin/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        return {
          success: true,
          token: result.data.token,
        };
      } else {
        return {
          success: false,
          error: result.error || 'Validation failed',
          attemptsRemaining: result.attemptsRemaining,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    } finally {
      setValidating(false);
    }
  }, []);

  return {
    // State
    generating,
    validating,

    // Desktop functions
    generatePin,
    getPinStatus,
    invalidatePin,

    // Mobile functions
    validatePin,
  };
}
