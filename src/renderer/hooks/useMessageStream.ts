import { useState, useEffect, useRef, useCallback } from 'react';
import { parseMessages, resetParser, type ParsedMessage } from '../../shared/message-parser';

const MAX_MESSAGES = 1000;
const DEBOUNCE_MS = 100;

export function useMessageStream(sessionIds: string[]) {
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const bufferRef = useRef<Map<string, string>>(new Map());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const processBuffer = useCallback(() => {
    const newMessages: ParsedMessage[] = [];
    for (const [sessionId, buffer] of bufferRef.current) {
      const parsed = parseMessages(buffer, sessionId);
      newMessages.push(...parsed);
    }
    bufferRef.current.clear();

    if (newMessages.length > 0) {
      setMessages(prev => {
        const combined = [...prev, ...newMessages];
        return combined.length > MAX_MESSAGES
          ? combined.slice(combined.length - MAX_MESSAGES)
          : combined;
      });
    }
  }, []);

  useEffect(() => {
    if (sessionIds.length === 0) return;

    const unsubscribers = sessionIds.map(sessionId => {
      return window.electronAPI.onSessionOutput((output) => {
        if (output.sessionId !== sessionId) return;

        const existing = bufferRef.current.get(sessionId) || '';
        bufferRef.current.set(sessionId, existing + output.data);

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(processBuffer, DEBOUNCE_MS);
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sessionIds, processBuffer]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    resetParser();
  }, []);

  return { messages, clearMessages };
}
