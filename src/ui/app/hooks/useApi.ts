import { useState, useCallback } from 'react';
import { api, ApiError } from '../lib/api';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: () => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await api<T>(method, path, body);
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Request failed';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      return null;
    }
  }, [method, path, body]);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, execute, reset };
}

export function useMutation<TResponse, TBody = unknown>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string
) {
  const [state, setState] = useState<UseApiState<TResponse>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const mutate = useCallback(
    async (body?: TBody) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const data = await api<TResponse>(method, path, body);
        setState({ data, isLoading: false, error: null });
        return data;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Request failed';
        setState((prev) => ({ ...prev, isLoading: false, error: message }));
        throw err;
      }
    },
    [method, path]
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}
