import { useRef, useCallback, useEffect } from 'react';
import { useVoiceStore } from '../store/voiceStore';
import { useAppStore } from '../store/appStore';
import type { VoiceCommandResponse, ParsedIntent } from '../types';

export function useVoice() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const { status, transcript, intent, error, setStatus, setTranscript, setIntent, setError, reset } =
    useVoiceStore();
  const { token, repos } = useAppStore();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      reset();
      setStatus('listening');

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
    } catch (err) {
      setError('Could not access microphone');
      console.error('Microphone access error:', err);
    }
  }, [reset, setStatus, setError]);

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    setStatus('processing');

    return new Promise<void>((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });

        try {
          setStatus('thinking');

          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await fetch('/api/voice/command', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const result = await response.json();

          if (!response.ok) {
            throw new Error(result.error || 'Voice command failed');
          }

          const data = result.data as VoiceCommandResponse;
          setTranscript(data.transcript);
          setIntent(data.intent);
          setStatus('idle');
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Voice command failed');
        }

        resolve();
      };

      mediaRecorder.stop();
    });
  }, [token, setStatus, setTranscript, setIntent, setError]);

  const processText = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setTranscript(text);
      setStatus('thinking');

      try {
        const response = await fetch('/api/voice/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to parse command');
        }

        const intent = result.data as ParsedIntent;
        setIntent(intent);
        setStatus('idle');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse command');
      }
    },
    [token, setTranscript, setStatus, setIntent, setError]
  );

  // Find matching repo from intent
  const getMatchedEntities = useCallback(() => {
    if (!intent) return { repo: null };

    const repo = intent.repoId ? repos.find((r) => r.id === intent.repoId) : null;

    return { repo };
  }, [intent, repos]);

  return {
    status,
    transcript,
    intent,
    error,
    startRecording,
    stopRecording,
    processText,
    getMatchedEntities,
    reset,
  };
}
