/**
 * System Settings Page - Update preferences and Cache management
 */

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '../../lib/api';
import { UpdateSettings } from '../../components/settings/UpdateSettings';
import { CacheManagement } from '../../components/settings/CacheManagement';
import { CICDSettings } from '../../components/settings/CICDSettings';
import { useToast } from '../../hooks/useToast';
import { VStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

export default function System() {
  const prefersReduced = useReducedMotion();
  const toast = useToast();
  const [autoCheck, setAutoCheck] = useState(true);
  const [interval, setInterval] = useState(6);

  // CI/CD settings
  const [cicdAutoMonitor, setCicdAutoMonitor] = useState(true);
  const [cicdPollInterval, setCicdPollInterval] = useState(10000);
  const [cicdMaxDuration, setCicdMaxDuration] = useState(1800000);
  const [cicdNotifications, setCicdNotifications] = useState(true);

  // Load settings on mount
  useState(() => {
    api<any>('GET', '/settings')
      .then((settings) => {
        if (settings?.update) {
          setAutoCheck(settings.update.autoCheck ?? true);
          setInterval(settings.update.checkIntervalHours ?? 6);
        }
        if (settings?.cicd) {
          setCicdAutoMonitor(settings.cicd.autoMonitor ?? true);
          setCicdPollInterval(settings.cicd.pollIntervalMs ?? 10000);
          setCicdMaxDuration(settings.cicd.maxPollDurationMs ?? 1800000);
          setCicdNotifications(settings.cicd.showNotifications ?? true);
        }
      })
      .catch(() => {});
  });

  const handleAutoCheckChange = async (enabled: boolean) => {
    setAutoCheck(enabled);
    try {
      await api('PUT', '/settings', { update: { autoCheck: enabled } });
    } catch {
      toast.error('Failed to save setting');
    }
  };

  const handleIntervalChange = async (hours: number) => {
    setInterval(hours);
    try {
      await api('PUT', '/settings', { update: { checkIntervalHours: hours } });
    } catch {
      toast.error('Failed to save setting');
    }
  };

  // CI/CD handlers
  const handleCicdAutoMonitor = async (enabled: boolean) => {
    setCicdAutoMonitor(enabled);
    try {
      await api('PUT', '/settings', { cicd: { autoMonitor: enabled } });
    } catch {
      toast.error('Failed to save setting');
    }
  };

  const handleCicdPollInterval = async (ms: number) => {
    setCicdPollInterval(ms);
    try {
      await api('PUT', '/settings', { cicd: { pollIntervalMs: ms } });
    } catch {
      toast.error('Failed to save setting');
    }
  };

  const handleCicdMaxDuration = async (ms: number) => {
    setCicdMaxDuration(ms);
    try {
      await api('PUT', '/settings', { cicd: { maxPollDurationMs: ms } });
    } catch {
      toast.error('Failed to save setting');
    }
  };

  const handleCicdNotifications = async (enabled: boolean) => {
    setCicdNotifications(enabled);
    try {
      await api('PUT', '/settings', { cicd: { showNotifications: enabled } });
    } catch {
      toast.error('Failed to save setting');
    }
  };

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.2 }}
    >
      <VStack gap={8}>
        {/* Updates Section */}
        <VStack gap={3}>
          <div>
            <Text variant="bodySm" color="secondary" className="font-semibold uppercase tracking-wider text-[11px]">
              Updates
            </Text>
            <div className="mt-1 h-px bg-white/5" />
          </div>
          <UpdateSettings
            autoCheckEnabled={autoCheck}
            checkIntervalHours={interval}
            onAutoCheckChange={handleAutoCheckChange}
            onIntervalChange={handleIntervalChange}
          />
        </VStack>

        {/* CI/CD Section */}
        <VStack gap={3}>
          <div>
            <Text variant="bodySm" color="secondary" className="font-semibold uppercase tracking-wider text-[11px]">
              CI/CD Pipeline Monitoring
            </Text>
            <div className="mt-1 h-px bg-white/5" />
          </div>
          <CICDSettings
            autoMonitor={cicdAutoMonitor}
            pollIntervalMs={cicdPollInterval}
            maxPollDurationMs={cicdMaxDuration}
            showNotifications={cicdNotifications}
            onAutoMonitorChange={handleCicdAutoMonitor}
            onPollIntervalChange={handleCicdPollInterval}
            onMaxDurationChange={handleCicdMaxDuration}
            onNotificationsChange={handleCicdNotifications}
          />
        </VStack>

        {/* Cache Section */}
        <VStack gap={3}>
          <div>
            <Text variant="bodySm" color="secondary" className="font-semibold uppercase tracking-wider text-[11px]">
              Cache & Storage
            </Text>
            <div className="mt-1 h-px bg-white/5" />
          </div>
          <CacheManagement />
        </VStack>
      </VStack>
    </motion.div>
  );
}
