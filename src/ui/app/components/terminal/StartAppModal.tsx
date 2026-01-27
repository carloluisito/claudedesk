import { useState, useEffect } from 'react';
import {
  X,
  Play,
  Loader2,
  Cloud,
  AlertCircle,
  Layers,
  Info,
  Settings,
  Box,
  ChevronDown,
  Plus,
  Trash2,
  Server,
} from 'lucide-react';
import { useRunStore, type MonorepoInfo } from '../../store/runStore';
import { cn } from '../../lib/cn';
import type { RunConfig, DockerConfig, DockerInfo, EnvVar } from '../../types';

interface StartAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoId: string;
  onStarted?: () => void;
}

export function StartAppModal({
  isOpen,
  onClose,
  repoId,
  onStarted,
}: StartAppModalProps) {
  const { startApp, loadMonorepoInfo, loadDockerInfo, dockerStatus, loadDockerStatus } = useRunStore();

  // Basic config
  const [port, setPort] = useState(3000);
  const [command, setCommand] = useState('');
  const [tunnelEnabled, setTunnelEnabled] = useState(false);

  // Monorepo detection
  const [monorepoInfo, setMonorepoInfo] = useState<MonorepoInfo | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Environment Variables
  const [showEnvVars, setShowEnvVars] = useState(false);
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);

  // Docker Options
  const [showDockerOptions, setShowDockerOptions] = useState(false);
  const [dockerEnabled, setDockerEnabled] = useState(false);
  const [dockerImageName, setDockerImageName] = useState('');
  const [dockerMemoryLimit, setDockerMemoryLimit] = useState('');
  const [dockerCpuLimit, setDockerCpuLimit] = useState('');
  const [dockerInfo, setDockerInfo] = useState<DockerInfo | null>(null);

  // UI state
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load monorepo info and Docker info on open
  useEffect(() => {
    if (isOpen && repoId) {
      detectServices();
      loadDockerStatus();
    }
  }, [isOpen, repoId]);

  const detectServices = async () => {
    setIsDetecting(true);
    try {
      const info = await loadMonorepoInfo(repoId);
      setMonorepoInfo(info);
      // Use detected port from primary service if available
      if (info.services.length > 0) {
        const primary = info.services.find((s) => s.id === info.primaryServiceId) || info.services[0];
        setPort(primary.suggestedPort);
      }
      // Load Docker info
      const dInfo = await loadDockerInfo(repoId);
      setDockerInfo(dInfo);
    } catch (err) {
      console.error('Failed to detect services:', err);
      setMonorepoInfo(null);
    } finally {
      setIsDetecting(false);
    }
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);

    try {
      const docker: DockerConfig | undefined = dockerEnabled
        ? {
            enabled: true,
            imageName: dockerImageName || undefined,
            memoryLimit: dockerMemoryLimit || undefined,
            cpuLimit: dockerCpuLimit ? parseFloat(dockerCpuLimit) : undefined,
          }
        : undefined;

      const env = envVars.reduce((acc, { key, value }) => {
        if (key.trim()) {
          acc[key.trim()] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      const config: RunConfig = {
        port,
        command: command || undefined,
        env: Object.keys(env).length > 0 ? env : undefined,
        docker,
        tunnel: tunnelEnabled ? { enabled: true } : undefined,
      };

      await startApp(repoId, config);
      onStarted?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start app');
    } finally {
      setIsStarting(false);
    }
  };

  if (!isOpen) return null;

  const isMonorepo = monorepoInfo?.isMonorepo && monorepoInfo.services.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Run Application
            </h2>
            <p className="text-sm text-zinc-500">{repoId}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isStarting}
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Loading state */}
          {isDetecting ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
              <span className="text-sm text-zinc-500">Detecting services...</span>
            </div>
          ) : isMonorepo ? (
            /* Monorepo Services Panel */
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5">
              <div className="flex items-center gap-2 border-b border-purple-500/20 px-3 py-2.5">
                <Layers className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">Detected Services</span>
                <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">
                  Monorepo
                </span>
              </div>
              <div className="p-3 space-y-2">
                {monorepoInfo!.services.map((service) => {
                  const isPrimary = service.id === monorepoInfo!.primaryServiceId;
                  return (
                    <div
                      key={service.id}
                      className="flex items-center justify-between rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {service.name}
                            </span>
                            {isPrimary && (
                              <span className="rounded bg-blue-500/20 px-1 py-0.5 text-[8px] font-medium text-blue-400">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            {service.framework && (
                              <span className="rounded bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 text-[10px]">
                                {service.framework}
                              </span>
                            )}
                            <span>{service.path}/</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
                  <Info className="h-3 w-3" />
                  <span>Ports will be assigned automatically when started</span>
                </div>
              </div>
            </div>
          ) : (
            /* Standard Port & Command inputs */
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Port
                </label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(parseInt(e.target.value) || 3000)}
                  min={1}
                  max={65535}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isStarting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Run Command <span className="text-zinc-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="npm run dev"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={isStarting}
                />
              </div>
            </>
          )}

          {/* Environment Variables (collapsible) */}
          <div>
            <button
              onClick={() => setShowEnvVars(!showEnvVars)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Environment Variables</span>
                {envVars.length > 0 && (
                  <span className="rounded-md bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-700 dark:text-zinc-300">
                    {envVars.length}
                  </span>
                )}
              </div>
              <ChevronDown
                className={cn('h-4 w-4 text-zinc-400 transition-transform', showEnvVars && 'rotate-180')}
              />
            </button>

            {showEnvVars && (
              <div className="mt-2 space-y-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3">
                {envVars.map((envVar, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={envVar.key}
                      onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                      placeholder="KEY"
                      className="w-1/3 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-zinc-600">=</span>
                    <input
                      type="text"
                      value={envVar.value}
                      onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    />
                    <button onClick={() => removeEnvVar(index)} className="p-1 text-zinc-500 hover:text-red-400">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addEnvVar}
                  className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add variable
                </button>
              </div>
            )}
          </div>

          {/* Docker Options (collapsible) */}
          <div>
            <button
              onClick={() => setShowDockerOptions(!showDockerOptions)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2.5"
            >
              <div className="flex items-center gap-2">
                <Box className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Docker Options</span>
                {dockerEnabled && (
                  <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-xs text-blue-400">Enabled</span>
                )}
              </div>
              <ChevronDown
                className={cn('h-4 w-4 text-zinc-400 transition-transform', showDockerOptions && 'rotate-180')}
              />
            </button>

            {showDockerOptions && (
              <div className="mt-2 space-y-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3">
                {/* Docker status warning */}
                {dockerStatus && !dockerStatus.available && (
                  <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-2.5 py-2 text-xs text-yellow-400">
                    Docker is not available. {dockerStatus.message}
                  </div>
                )}

                {/* Docker info for repo */}
                {dockerInfo && (
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <Server className="h-3.5 w-3.5" />
                    {dockerInfo.hasDockerfile ? (
                      <span>
                        Dockerfile found
                        {dockerInfo.needsRebuild && (
                          <span className="ml-1 text-yellow-400">(rebuild needed)</span>
                        )}
                      </span>
                    ) : (
                      <span>No Dockerfile - will be auto-generated</span>
                    )}
                  </div>
                )}

                {/* Enable toggle */}
                <label className="flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">Enable Docker</span>
                  <button
                    onClick={() => setDockerEnabled(!dockerEnabled)}
                    disabled={!dockerStatus?.available}
                    className={cn(
                      'relative h-6 w-11 rounded-full transition-colors',
                      dockerEnabled ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700',
                      !dockerStatus?.available && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                        dockerEnabled && 'translate-x-5'
                      )}
                    />
                  </button>
                </label>

                {dockerEnabled && (
                  <>
                    <div>
                      <label className="mb-1 block text-xs text-zinc-500">Image Name (optional)</label>
                      <input
                        type="text"
                        value={dockerImageName}
                        onChange={(e) => setDockerImageName(e.target.value)}
                        placeholder={`claudedesk-${repoId}`}
                        className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">Memory Limit</label>
                        <input
                          type="text"
                          value={dockerMemoryLimit}
                          onChange={(e) => setDockerMemoryLimit(e.target.value)}
                          placeholder="512m"
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-zinc-500">CPU Limit</label>
                        <input
                          type="text"
                          value={dockerCpuLimit}
                          onChange={(e) => setDockerCpuLimit(e.target.value)}
                          placeholder="1.0"
                          className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Cloudflare Tunnel Toggle */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 p-3">
            <label className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud className={cn('h-4 w-4', tunnelEnabled ? 'text-orange-500' : 'text-zinc-400')} />
                <div>
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Cloudflare Tunnel</span>
                  <p className="text-xs text-zinc-500">
                    {isMonorepo
                      ? 'Public URL for the primary service'
                      : 'Get a public URL to access from anywhere'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTunnelEnabled(!tunnelEnabled)}
                disabled={isStarting}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  tunnelEnabled ? 'bg-orange-500' : 'bg-zinc-200 dark:bg-zinc-700'
                )}
              >
                <span
                  className={cn(
                    'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                    tunnelEnabled && 'translate-x-5'
                  )}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 sticky bottom-0 bg-white dark:bg-zinc-900">
          <button
            onClick={handleStart}
            disabled={isStarting || isDetecting}
            className={cn(
              'flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white',
              isStarting || isDetecting
                ? 'bg-zinc-300 dark:bg-zinc-700 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500'
            )}
          >
            {isStarting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Application
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
