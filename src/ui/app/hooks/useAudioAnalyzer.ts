import { useCallback, useEffect, useRef, useState } from 'react';

interface AudioAnalyzerReturn {
  volume: number; // 0-1 normalized RMS volume
  frequencies: number[]; // 32 frequency bands (0-1)
  isAnalyzing: boolean;
  start: (stream: MediaStream) => void;
  stop: () => void;
}

interface AudioAnalyzerOptions {
  fftSize?: number;
  smoothingTimeConstant?: number;
  updateInterval?: number; // ms between updates
}

const DEFAULT_OPTIONS: Required<AudioAnalyzerOptions> = {
  fftSize: 64,
  smoothingTimeConstant: 0.8,
  updateInterval: 33, // ~30fps
};

export function useAudioAnalyzer(options: AudioAnalyzerOptions = {}): AudioAnalyzerReturn {
  const { fftSize, smoothingTimeConstant, updateInterval } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const [volume, setVolume] = useState(0);
  const [frequencies, setFrequencies] = useState<number[]>(() => new Array(32).fill(0));
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const stop = useCallback(() => {
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Disconnect source
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    analyzerRef.current = null;
    setIsAnalyzing(false);
    setVolume(0);
    setFrequencies(new Array(32).fill(0));
  }, []);

  const start = useCallback(
    (stream: MediaStream) => {
      // Clean up any existing analysis
      stop();

      try {
        // Create audio context
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        // Create analyzer node
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = fftSize;
        analyzer.smoothingTimeConstant = smoothingTimeConstant;
        analyzerRef.current = analyzer;

        // Connect stream to analyzer
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyzer);
        sourceRef.current = source;

        // Data arrays
        const dataArray = new Uint8Array(analyzer.frequencyBinCount);

        // Analysis loop
        const analyze = (timestamp: number) => {
          if (!analyzerRef.current) return;

          // Throttle updates
          if (timestamp - lastUpdateRef.current >= updateInterval) {
            lastUpdateRef.current = timestamp;

            // Get frequency data
            analyzerRef.current.getByteFrequencyData(dataArray);

            // Calculate RMS volume
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              const normalized = dataArray[i] / 255;
              sum += normalized * normalized;
            }
            const rms = Math.sqrt(sum / dataArray.length);

            // Normalize to 0-1 with some headroom
            const normalizedVolume = Math.min(1, rms * 2);
            setVolume(normalizedVolume);

            // Extract frequency bands (normalize to 32 bands)
            const bands: number[] = [];
            const bandSize = Math.floor(dataArray.length / 32);
            for (let i = 0; i < 32; i++) {
              let bandSum = 0;
              for (let j = 0; j < bandSize; j++) {
                const index = i * bandSize + j;
                if (index < dataArray.length) {
                  bandSum += dataArray[index] / 255;
                }
              }
              bands.push(bandSum / bandSize);
            }
            setFrequencies(bands);
          }

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        setIsAnalyzing(true);
        animationFrameRef.current = requestAnimationFrame(analyze);
      } catch (error) {
        console.error('Failed to start audio analysis:', error);
        stop();
      }
    },
    [fftSize, smoothingTimeConstant, updateInterval, stop]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return {
    volume,
    frequencies,
    isAnalyzing,
    start,
    stop,
  };
}
