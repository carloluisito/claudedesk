/**
 * CICDSettings - CI/CD Pipeline Monitoring settings panel
 *
 * Controls for:
 * - Auto Monitor toggle
 * - Poll Interval slider (5s-60s)
 * - Max Duration slider (5min-60min)
 * - Notifications toggle
 */

import { useState, useEffect } from 'react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

interface CICDSettingsProps {
  autoMonitor: boolean;
  pollIntervalMs: number;
  maxPollDurationMs: number;
  showNotifications: boolean;
  onAutoMonitorChange: (enabled: boolean) => void;
  onPollIntervalChange: (ms: number) => void;
  onMaxDurationChange: (ms: number) => void;
  onNotificationsChange: (enabled: boolean) => void;
}

function formatInterval(ms: number): string {
  const seconds = Math.round(ms / 1000);
  return `${seconds}s`;
}

function formatDuration(ms: number): string {
  const minutes = Math.round(ms / 60000);
  return `${minutes}min`;
}

export function CICDSettings({
  autoMonitor,
  pollIntervalMs,
  maxPollDurationMs,
  showNotifications,
  onAutoMonitorChange,
  onPollIntervalChange,
  onMaxDurationChange,
  onNotificationsChange,
}: CICDSettingsProps) {
  const [localPollInterval, setLocalPollInterval] = useState(pollIntervalMs);
  const [localMaxDuration, setLocalMaxDuration] = useState(maxPollDurationMs);

  useEffect(() => {
    setLocalPollInterval(pollIntervalMs);
  }, [pollIntervalMs]);

  useEffect(() => {
    setLocalMaxDuration(maxPollDurationMs);
  }, [maxPollDurationMs]);

  const handlePollIntervalCommit = () => {
    const clamped = Math.max(5000, Math.min(60000, localPollInterval));
    setLocalPollInterval(clamped);
    onPollIntervalChange(clamped);
  };

  const handleMaxDurationCommit = () => {
    const clamped = Math.max(300000, Math.min(3600000, localMaxDuration));
    setLocalMaxDuration(clamped);
    onMaxDurationChange(clamped);
  };

  return (
    <VStack gap={4}>
      {/* Auto Monitor toggle */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
        <div>
          <Text variant="bodySm" color="primary">
            Auto Monitor after Ship
          </Text>
          <Text variant="bodyXs" color="muted" className="mt-0.5">
            Automatically start CI/CD monitoring after pushing code
          </Text>
        </div>
        <button
          role="switch"
          aria-checked={autoMonitor}
          aria-label="Auto monitor after ship"
          onClick={() => onAutoMonitorChange(!autoMonitor)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
            autoMonitor ? 'bg-blue-600' : 'bg-white/10'
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
              autoMonitor ? 'translate-x-[22px]' : 'translate-x-[2px]',
              'mt-[2px]'
            )}
          />
        </button>
      </div>

      {/* Poll Interval */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
        <div>
          <Text variant="bodySm" color="primary">
            Poll Interval
          </Text>
          <Text variant="bodyXs" color="muted" className="mt-0.5">
            How often to check pipeline status (5s-60s)
          </Text>
        </div>
        <HStack gap={2} align="center">
          <input
            type="range"
            min={5000}
            max={60000}
            step={1000}
            value={localPollInterval}
            onChange={(e) => setLocalPollInterval(Number(e.target.value))}
            onMouseUp={handlePollIntervalCommit}
            onTouchEnd={handlePollIntervalCommit}
            className="w-24 h-1 appearance-none rounded-full bg-white/10 accent-blue-500 cursor-pointer"
            aria-label="Poll interval"
          />
          <span className="w-10 text-right text-xs text-white/60 font-mono">
            {formatInterval(localPollInterval)}
          </span>
        </HStack>
      </div>

      {/* Max Duration */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
        <div>
          <Text variant="bodySm" color="primary">
            Max Monitor Duration
          </Text>
          <Text variant="bodyXs" color="muted" className="mt-0.5">
            Stop monitoring after this duration (5-60min)
          </Text>
        </div>
        <HStack gap={2} align="center">
          <input
            type="range"
            min={300000}
            max={3600000}
            step={60000}
            value={localMaxDuration}
            onChange={(e) => setLocalMaxDuration(Number(e.target.value))}
            onMouseUp={handleMaxDurationCommit}
            onTouchEnd={handleMaxDurationCommit}
            className="w-24 h-1 appearance-none rounded-full bg-white/10 accent-blue-500 cursor-pointer"
            aria-label="Max monitor duration"
          />
          <span className="w-14 text-right text-xs text-white/60 font-mono">
            {formatDuration(localMaxDuration)}
          </span>
        </HStack>
      </div>

      {/* Notifications toggle */}
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
        <div>
          <Text variant="bodySm" color="primary">
            Pipeline Notifications
          </Text>
          <Text variant="bodyXs" color="muted" className="mt-0.5">
            Show notifications for pipeline completion and failures
          </Text>
        </div>
        <button
          role="switch"
          aria-checked={showNotifications}
          aria-label="Pipeline notifications"
          onClick={() => onNotificationsChange(!showNotifications)}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
            showNotifications ? 'bg-blue-600' : 'bg-white/10'
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
              showNotifications ? 'translate-x-[22px]' : 'translate-x-[2px]',
              'mt-[2px]'
            )}
          />
        </button>
      </div>

      {/* Info note */}
      <div className="px-1">
        <Text variant="bodyXs" color="muted">
          CI/CD monitoring supports GitHub Actions and GitLab CI. Pipeline status is automatically tracked after shipping code.
        </Text>
      </div>
    </VStack>
  );
}
