import { useState, useEffect } from 'react';
import { Loader2, FolderSearch, Check, AlertCircle, Globe, Wifi, Terminal, Cloud, RotateCcw, Info, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { api } from '../../lib/api';
import type { RepoConfig, ProjectDetection } from '../../types';
import { cn } from '../../lib/cn';

interface DetectedService {
  id: string;
  name: string;
  path: string;
  framework?: string;
  runScript: 'dev' | 'start';
  suggestedPort: number;
}

interface ServiceConfigOverride {
  proof?: {
    mode: 'web' | 'api' | 'cli';
    web?: { url: string; waitForSelector?: string; assertText?: string };
    api?: { healthUrl: string; timeout?: number };
    cli?: { command: string; assertStdout?: string; assertRegex?: string };
  };
  port?: number;
}

interface RepoConfigOverride {
  proof?: {
    mode: 'web' | 'api' | 'cli';
    web?: { url: string; waitForSelector?: string; assertText?: string };
    api?: { healthUrl: string; timeout?: number };
    cli?: { command: string; assertStdout?: string; assertRegex?: string };
  };
  port?: number;
  commands?: { install?: string; build?: string; test?: string; run?: string };
}

interface RepoFormProps {
  repo?: RepoConfig & { workspaceId?: string };
  onSave: () => void;
  onCancel: () => void;
}

export function RepoForm({ repo, onSave, onCancel }: RepoFormProps) {
  const isEditing = !!repo;
  const hasWorkspace = !!repo?.workspaceId;

  // Form state
  const [path, setPath] = useState(repo?.path || '');
  const [id, setId] = useState(repo?.id || '');
  const [commands, setCommands] = useState(repo?.commands || {});
  const [proofMode, setProofMode] = useState<'web' | 'api' | 'cli'>(repo?.proof?.mode || 'web');
  const [proofConfig, setProofConfig] = useState(repo?.proof || { mode: 'web' });
  const [port, setPort] = useState(repo?.port || 3000);
  const [tunnelEnabled, setTunnelEnabled] = useState(repo?.tunnel?.enabled || false);

  // UI state
  const [detecting, setDetecting] = useState(false);
  const [detection, setDetection] = useState<ProjectDetection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasCustomConfig, setHasCustomConfig] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Monorepo services state
  const [services, setServices] = useState<DetectedService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceConfigs, setServiceConfigs] = useState<Record<string, ServiceConfigOverride>>({});
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // Load workspace config override when editing a workspace repo
  useEffect(() => {
    if (isEditing && hasWorkspace && repo?.workspaceId) {
      loadWorkspaceConfig(repo.workspaceId, repo.id);
    }
  }, [isEditing, hasWorkspace, repo?.workspaceId, repo?.id]);

  // Load monorepo services when editing a workspace repo
  useEffect(() => {
    if (isEditing && hasWorkspace && repo?.id && repo?.workspaceId) {
      loadServices(repo.id, repo.workspaceId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadServices = async (repoId: string, workspaceId: string) => {
    setLoadingServices(true);
    try {
      const result = await api<{ isMonorepo: boolean; services: DetectedService[] }>(
        'GET',
        `/apps/repo/${encodeURIComponent(repoId)}/detect-services`
      );
      if (result.isMonorepo && result.services.length > 0) {
        setServices(result.services);
        // Load saved configs for each service
        const configs: Record<string, ServiceConfigOverride> = {};
        for (const service of result.services) {
          try {
            const config = await api<ServiceConfigOverride | null>(
              'GET',
              `/workspaces/${encodeURIComponent(workspaceId)}/repos/${encodeURIComponent(repoId)}/services/${encodeURIComponent(service.id)}/config`
            );
            if (config) {
              configs[service.id] = config;
            }
          } catch {
            // No saved config for this service
          }
        }
        setServiceConfigs(configs);
      }
    } catch (err) {
      console.error('Failed to load services:', err);
    } finally {
      setLoadingServices(false);
    }
  };

  const loadWorkspaceConfig = async (workspaceId: string, repoId: string) => {
    setLoadingConfig(true);
    try {
      const result = await api<RepoConfigOverride | null>('GET', `/workspaces/${workspaceId}/repos/${repoId}/config`);
      if (result) {
        setHasCustomConfig(true);
        // Apply workspace overrides to form
        if (result.proof) {
          setProofMode(result.proof.mode);
          setProofConfig(result.proof);
        }
        if (result.port) {
          setPort(result.port);
        }
        if (result.commands) {
          setCommands(prev => ({ ...prev, ...result.commands }));
        }
      }
    } catch (err) {
      console.error('Failed to load workspace config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Auto-detect when path changes (with debounce)
  useEffect(() => {
    if (!path || isEditing) return;

    const timer = setTimeout(() => {
      detectProject(path);
    }, 500);

    return () => clearTimeout(timer);
  }, [path, isEditing]);

  const detectProject = async (projectPath: string) => {
    setDetecting(true);
    setError(null);

    try {
      const result = await api<ProjectDetection>('POST', '/repos/detect', { path: projectPath });
      setDetection(result);

      if (!result.exists) {
        setError('Path does not exist');
        return;
      }

      if (!result.isDirectory) {
        setError('Path is not a directory');
        return;
      }

      // Apply detected values
      if (result.suggestedId && !id) {
        setId(result.suggestedId);
      }
      if (result.suggestedCommands) {
        setCommands(result.suggestedCommands);
      }
      if (result.suggestedProof) {
        setProofMode(result.suggestedProof.mode);
        setProofConfig(result.suggestedProof);
      }
      if (result.suggestedPort) {
        setPort(result.suggestedPort);
      }
    } catch (err) {
      console.error('Detection failed:', err);
    } finally {
      setDetecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // Build proof config based on mode
    let proof: RepoConfig['proof'] = { mode: proofMode };
    if (proofMode === 'web') {
      proof.web = {
        url: proofConfig.web?.url || `http://localhost:${port}`,
        waitForSelector: proofConfig.web?.waitForSelector || 'body',
        assertText: proofConfig.web?.assertText,
      };
    } else if (proofMode === 'api') {
      proof.api = {
        healthUrl: proofConfig.api?.healthUrl || `http://localhost:{port}`,
        timeout: proofConfig.api?.timeout || 30000,
      };
    } else if (proofMode === 'cli') {
      proof.cli = {
        command: proofConfig.cli?.command || 'echo "OK"',
        assertStdout: proofConfig.cli?.assertStdout,
        assertRegex: proofConfig.cli?.assertRegex,
      };
    }

    try {
      // For workspace repos, save config override to workspace
      if (isEditing && hasWorkspace && repo?.workspaceId) {
        const configOverride: RepoConfigOverride = {
          proof,
          port: port || undefined,
        };
        await api('PUT', `/workspaces/${repo.workspaceId}/repos/${repo.id}/config`, configOverride);

        // Save per-service configs
        for (const [serviceId, config] of Object.entries(serviceConfigs)) {
          if (config.proof || config.port) {
            await api('PUT', `/workspaces/${encodeURIComponent(repo.workspaceId)}/repos/${encodeURIComponent(repo.id)}/services/${encodeURIComponent(serviceId)}/config`, config);
          }
        }
      } else {
        // For manual repos, save to repos API
        const repoData: RepoConfig = {
          id,
          path,
          commands,
          proof,
          port: port || undefined,
          tunnel: tunnelEnabled ? { enabled: true } : undefined,
        };

        if (isEditing) {
          await api('PUT', `/repos/${repo!.id}`, repoData);
        } else {
          await api('POST', '/repos', repoData);
        }
      }
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save repository');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfig = async () => {
    if (!repo?.workspaceId) return;
    setSaving(true);
    try {
      await api('DELETE', `/workspaces/${repo.workspaceId}/repos/${repo.id}/config`);
      setHasCustomConfig(false);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset config');
    } finally {
      setSaving(false);
    }
  };

  const updateProofConfig = (mode: 'web' | 'api' | 'cli', updates: Record<string, unknown>) => {
    setProofConfig(prev => ({
      ...prev,
      mode,
      [mode]: { ...prev[mode], ...updates },
    }));
  };

  const updateServiceConfig = (serviceId: string, updates: Partial<ServiceConfigOverride>) => {
    setServiceConfigs(prev => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        ...updates,
      },
    }));
  };

  const updateServiceProofConfig = (serviceId: string, mode: 'web' | 'api' | 'cli', updates: Record<string, unknown>) => {
    setServiceConfigs(prev => {
      const current = prev[serviceId] || {};
      const currentProof = current.proof || { mode };
      return {
        ...prev,
        [serviceId]: {
          ...current,
          proof: {
            ...currentProof,
            mode,
            [mode]: { ...currentProof[mode], ...updates },
          },
        },
      };
    });
  };

  const setServiceProofMode = (serviceId: string, mode: 'web' | 'api' | 'cli') => {
    setServiceConfigs(prev => {
      const current = prev[serviceId] || {};
      return {
        ...prev,
        [serviceId]: {
          ...current,
          proof: {
            ...current.proof,
            mode,
          },
        },
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Path Input */}
      <div>
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Repository Path
        </label>
        <div className="relative">
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="C:\path\to\your\project"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 pr-10 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
            disabled={isEditing}
            required
          />
          {detecting && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-blue-400" />
          )}
        </div>
        {detection && detection.exists && detection.framework && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-400">
            <Check className="h-3 w-3" />
            Detected: {detection.framework} ({detection.projectType})
          </p>
        )}
      </div>

      {/* ID Input */}
      <div>
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Repository ID
        </label>
        <input
          type="text"
          value={id}
          onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
          placeholder="my-project"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
          disabled={isEditing}
          required
          pattern="[a-z0-9-]+"
        />
        <p className="mt-1 text-[10px] text-zinc-600">
          Lowercase letters, numbers, and dashes only
        </p>
      </div>

      {/* Commands */}
      <div className="space-y-2">
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Commands
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(['install', 'build', 'test', 'run'] as const).map((cmd) => (
            <div key={cmd}>
              <label className="mb-1 block text-[10px] text-zinc-500 capitalize">{cmd}</label>
              <input
                type="text"
                value={commands[cmd] || ''}
                onChange={(e) => setCommands({ ...commands, [cmd]: e.target.value || undefined })}
                placeholder={`npm ${cmd === 'run' ? 'start' : cmd}`}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Monorepo Services Section */}
      {hasWorkspace && services.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40">
          <button
            type="button"
            onClick={() => setServicesExpanded(!servicesExpanded)}
            className="flex w-full items-center justify-between p-3"
          >
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-zinc-200">
                Workspace Services
              </span>
              <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-400">
                {services.length}
              </span>
            </div>
            {servicesExpanded ? (
              <ChevronDown className="h-4 w-4 text-zinc-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            )}
          </button>

          {servicesExpanded && (
            <div className="border-t border-zinc-800 px-3 pb-3">
              <div className="space-y-2 pt-2">
                {services.map((service) => {
                  const config = serviceConfigs[service.id] || {};
                  const serviceProofMode = config.proof?.mode || 'web';
                  const isExpanded = expandedServiceId === service.id;

                  return (
                    <div
                      key={service.id}
                      className="rounded-lg border border-zinc-700/50 bg-zinc-800/30"
                    >
                      {/* Service Header */}
                      <button
                        type="button"
                        onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                        className="flex w-full items-center justify-between p-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-zinc-200">{service.name}</span>
                          {service.framework && (
                            <span className="rounded bg-zinc-700/50 px-1.5 py-0.5 text-[9px] text-zinc-400">
                              {service.framework}
                            </span>
                          )}
                          <span className="text-[10px] text-zinc-500">
                            :{config.port || service.suggestedPort}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {config.proof && (
                            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[9px] text-blue-400">
                              {config.proof.mode}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-zinc-500" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-zinc-500" />
                          )}
                        </div>
                      </button>

                      {/* Service Config (Expanded) */}
                      {isExpanded && (
                        <div className="border-t border-zinc-700/50 p-3 space-y-3">
                          {/* Port */}
                          <div>
                            <label className="mb-1 block text-[10px] text-zinc-500">Port</label>
                            <input
                              type="number"
                              value={config.port || service.suggestedPort}
                              onChange={(e) => updateServiceConfig(service.id, { port: parseInt(e.target.value) })}
                              min={1}
                              max={65535}
                              className="w-24 rounded-lg border border-zinc-700 bg-zinc-800/50 px-2 py-1.5 font-mono text-xs text-zinc-100 focus:border-zinc-600 focus:outline-none"
                            />
                          </div>

                          {/* Proof Mode */}
                          <div>
                            <label className="mb-1 block text-[10px] text-zinc-500">Proof Mode</label>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { value: 'web' as const, label: 'Web', icon: Globe },
                                { value: 'api' as const, label: 'API', icon: Wifi },
                                { value: 'cli' as const, label: 'CLI', icon: Terminal },
                              ].map(({ value, label, icon: Icon }) => (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setServiceProofMode(service.id, value)}
                                  className={cn(
                                    'flex items-center justify-center gap-1 rounded-lg border p-1.5 text-[10px] transition-all',
                                    serviceProofMode === value
                                      ? 'border-blue-500/50 bg-blue-600/20 text-blue-400'
                                      : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/60'
                                  )}
                                >
                                  <Icon className="h-3 w-3" />
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Proof Config Fields */}
                          <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/30 p-2.5 space-y-2">
                            {serviceProofMode === 'web' && (
                              <>
                                <div>
                                  <label className="mb-1 block text-[9px] text-zinc-500">URL</label>
                                  <input
                                    type="text"
                                    value={config.proof?.web?.url || `http://localhost:${config.port || service.suggestedPort}`}
                                    onChange={(e) => updateServiceProofConfig(service.id, 'web', { url: e.target.value })}
                                    className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 font-mono text-[10px] text-zinc-100 focus:border-zinc-600 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[9px] text-zinc-500">Wait Selector</label>
                                  <input
                                    type="text"
                                    value={config.proof?.web?.waitForSelector || ''}
                                    onChange={(e) => updateServiceProofConfig(service.id, 'web', { waitForSelector: e.target.value })}
                                    placeholder="body"
                                    className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 font-mono text-[10px] text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                                  />
                                </div>
                              </>
                            )}

                            {serviceProofMode === 'api' && (
                              <>
                                <div>
                                  <label className="mb-1 block text-[9px] text-zinc-500">Health URL</label>
                                  <input
                                    type="text"
                                    value={config.proof?.api?.healthUrl || `http://localhost:${config.port || service.suggestedPort}`}
                                    onChange={(e) => updateServiceProofConfig(service.id, 'api', { healthUrl: e.target.value })}
                                    className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 font-mono text-[10px] text-zinc-100 focus:border-zinc-600 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[9px] text-zinc-500">Timeout (ms)</label>
                                  <input
                                    type="number"
                                    value={config.proof?.api?.timeout || 30000}
                                    onChange={(e) => updateServiceProofConfig(service.id, 'api', { timeout: parseInt(e.target.value) })}
                                    className="w-24 rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 font-mono text-[10px] text-zinc-100 focus:border-zinc-600 focus:outline-none"
                                  />
                                </div>
                              </>
                            )}

                            {serviceProofMode === 'cli' && (
                              <>
                                <div>
                                  <label className="mb-1 block text-[9px] text-zinc-500">Command</label>
                                  <input
                                    type="text"
                                    value={config.proof?.cli?.command || ''}
                                    onChange={(e) => updateServiceProofConfig(service.id, 'cli', { command: e.target.value })}
                                    placeholder='echo "OK"'
                                    className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 font-mono text-[10px] text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-[9px] text-zinc-500">Assert Stdout</label>
                                  <input
                                    type="text"
                                    value={config.proof?.cli?.assertStdout || ''}
                                    onChange={(e) => updateServiceProofConfig(service.id, 'cli', { assertStdout: e.target.value })}
                                    placeholder="OK"
                                    className="w-full rounded border border-zinc-700 bg-zinc-800/50 px-2 py-1 font-mono text-[10px] text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
                                  />
                                </div>
                              </>
                            )}
                          </div>

                          <p className="text-[9px] text-zinc-600">
                            Path: {service.path}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {loadingServices && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
            </div>
          )}
        </div>
      )}

      {/* Proof Mode Selection */}
      <div>
        <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Proof Mode
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'web' as const, label: 'Web', desc: 'Screenshot', icon: Globe },
            { value: 'api' as const, label: 'API', desc: 'Health check', icon: Wifi },
            { value: 'cli' as const, label: 'CLI', desc: 'Command', icon: Terminal },
          ].map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setProofMode(value)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2.5 transition-all',
                proofMode === value
                  ? 'border-blue-500/50 bg-blue-600/20 text-blue-400'
                  : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:bg-zinc-800/60'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{label}</span>
              <span className="text-[9px] text-zinc-500">{desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Proof Configuration */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
        {proofMode === 'web' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">URL</label>
              <input
                type="text"
                value={proofConfig.web?.url || `http://localhost:${port}`}
                onChange={(e) => updateProofConfig('web', { url: e.target.value })}
                placeholder="http://localhost:3000"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Wait for selector (optional)</label>
              <input
                type="text"
                value={proofConfig.web?.waitForSelector || ''}
                onChange={(e) => updateProofConfig('web', { waitForSelector: e.target.value })}
                placeholder="body, #app, .container"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Assert text (optional)</label>
              <input
                type="text"
                value={proofConfig.web?.assertText || ''}
                onChange={(e) => updateProofConfig('web', { assertText: e.target.value })}
                placeholder="Welcome, Loading..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {proofMode === 'api' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Health URL</label>
              <input
                type="text"
                value={proofConfig.api?.healthUrl || `http://localhost:{port}`}
                onChange={(e) => updateProofConfig('api', { healthUrl: e.target.value })}
                placeholder="http://localhost:{port}/health"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
              <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                <Info className="h-3 w-3" />
                Use <code className="mx-0.5 rounded bg-zinc-800 px-1 font-mono">{'{port}'}</code> for dynamic port assignment
              </p>
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Timeout (ms)</label>
              <input
                type="number"
                value={proofConfig.api?.timeout || 30000}
                onChange={(e) => updateProofConfig('api', { timeout: parseInt(e.target.value) })}
                min={1000}
                max={120000}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        )}

        {proofMode === 'cli' && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Command</label>
              <input
                type="text"
                value={proofConfig.cli?.command || ''}
                onChange={(e) => updateProofConfig('cli', { command: e.target.value })}
                placeholder='echo "OK"'
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-zinc-500">Assert stdout contains (optional)</label>
              <input
                type="text"
                value={proofConfig.cli?.assertStdout || ''}
                onChange={(e) => updateProofConfig('cli', { assertStdout: e.target.value })}
                placeholder="OK, success, passed"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/50 px-2.5 py-2 font-mono text-xs text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Port */}
      {(proofMode === 'web' || proofMode === 'api') && (
        <div>
          <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-zinc-500">
            Server Port
          </label>
          <input
            type="number"
            value={port}
            onChange={(e) => setPort(parseInt(e.target.value))}
            min={1}
            max={65535}
            className="w-32 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:border-zinc-600 focus:outline-none"
          />
        </div>
      )}

      {/* Cloudflare Tunnel */}
      {(proofMode === 'web' || proofMode === 'api') && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-orange-400" />
              <div>
                <p className="text-sm font-medium text-zinc-200">Cloudflare Quick Tunnel</p>
                <p className="text-xs text-zinc-500">Create a public URL for external access</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTunnelEnabled(!tunnelEnabled)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                tunnelEnabled ? 'bg-orange-500' : 'bg-zinc-700'
              )}
            >
              <span
                className={cn(
                  'absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform',
                  tunnelEnabled && 'translate-x-5'
                )}
              />
            </button>
          </div>
          {tunnelEnabled && (
            <p className="mt-2 text-[10px] text-zinc-500">
              Requires cloudflared CLI.{' '}
              <a
                href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                Install guide
              </a>
            </p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        {/* Reset button for workspace repos with custom config */}
        {hasWorkspace && hasCustomConfig && (
          <button
            type="button"
            onClick={handleResetConfig}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/20 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Auto-detected Config
          </button>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || loadingConfig || !path || !id}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : loadingConfig ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>{isEditing ? 'Save Changes' : 'Add Repository'}</>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
