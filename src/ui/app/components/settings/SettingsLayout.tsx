/**
 * SettingsLayout - Tabbed navigation for settings pages
 *
 * Replaces collapsible sections with dedicated tabs:
 * [Source Control] [Services] [Remote] [MCP] [Claude]
 */

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Github, Container, Globe, Puzzle, Bot, ShieldCheck, Settings, ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/cn';
import { HStack, VStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

type SettingsTab = 'source-control' | 'services' | 'remote' | 'mcp' | 'claude';

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: ReactNode;
  description: string;
}

const tabs: TabConfig[] = [
  {
    id: 'source-control',
    label: 'Source Control',
    icon: <Github className="h-4 w-4" />,
    description: 'GitHub and GitLab integration',
  },
  {
    id: 'services',
    label: 'Services',
    icon: <Container className="h-4 w-4" />,
    description: 'Docker and database services',
  },
  {
    id: 'remote',
    label: 'Remote Access',
    icon: <Globe className="h-4 w-4" />,
    description: 'Connect from other devices',
  },
  {
    id: 'mcp',
    label: 'MCP Servers',
    icon: <Puzzle className="h-4 w-4" />,
    description: 'Model Context Protocol',
  },
  {
    id: 'claude',
    label: 'Claude',
    icon: <Bot className="h-4 w-4" />,
    description: 'AI behavior and permissions',
  },
];

interface SettingsLayoutProps {
  /** Current active tab */
  activeTab: SettingsTab;
  /** Callback when tab changes */
  onTabChange: (tab: SettingsTab) => void;
  /** Content for each tab */
  children: ReactNode;
  /** Callback to go back */
  onBack?: () => void;
  /** Whether settings are being loaded */
  isLoading?: boolean;
  /** Whether settings were just saved (for toast) */
  showSaved?: boolean;
  /** Custom class names */
  className?: string;
}

export function SettingsLayout({
  activeTab,
  onTabChange,
  children,
  onBack,
  isLoading = false,
  showSaved = false,
  className,
}: SettingsLayoutProps) {
  const activeTabConfig = tabs.find((t) => t.id === activeTab);

  return (
    <div className={cn('flex h-full', className)}>
      {/* Sidebar navigation */}
      <div className="w-64 flex-shrink-0 border-r border-white/10 bg-white/2 p-4">
        <VStack gap={4}>
          {/* Header */}
          <HStack gap={2} align="center">
            {onBack && (
              <button
                onClick={onBack}
                className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <HStack gap={2} align="center">
              <Settings className="h-5 w-5 text-white/70" />
              <Text variant="h4" color="primary">
                Settings
              </Text>
            </HStack>
          </HStack>

          {/* Tabs */}
          <VStack gap={1} className="mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                  activeTab === tab.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                )}
              >
                <span className={cn(activeTab === tab.id ? 'text-blue-400' : 'text-white/40')}>
                  {tab.icon}
                </span>
                <VStack gap={0}>
                  <Text
                    variant="bodySm"
                    color={activeTab === tab.id ? 'primary' : 'secondary'}
                  >
                    {tab.label}
                  </Text>
                  <Text variant="bodyXs" color="muted" className="hidden lg:block">
                    {tab.description}
                  </Text>
                </VStack>
              </button>
            ))}
          </VStack>
        </VStack>
      </div>

      {/* Content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Content header */}
        <div className="flex-shrink-0 border-b border-white/10 px-6 py-4">
          <HStack justify="between" align="center">
            <VStack gap={0}>
              <HStack gap={2} align="center">
                <span className="text-blue-400">{activeTabConfig?.icon}</span>
                <Text variant="h3" color="primary">
                  {activeTabConfig?.label}
                </Text>
              </HStack>
              <Text variant="bodySm" color="tertiary">
                {activeTabConfig?.description}
              </Text>
            </VStack>

            {/* Save indicator */}
            {showSaved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 ring-1 ring-emerald-500/20"
              >
                Saved
              </motion.div>
            )}
          </HStack>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-white/50" />
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}

// Tab content wrapper with animation
interface TabContentProps {
  children: ReactNode;
}

export function TabContent({ children }: TabContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

export type { SettingsLayoutProps, SettingsTab, TabConfig };
