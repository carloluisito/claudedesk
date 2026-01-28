import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Check, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/cn';
import { PredefinedServerTemplate, PrerequisiteCheckResult } from '../../types/mcp-catalog';
import { PrerequisiteWarning } from './PrerequisiteWarning';
import { useMCPCatalog } from '../../hooks/useMCPCatalog';

// Browser-compatible platform detection
function getPlatform(): 'windows' | 'darwin' | 'linux' {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'darwin';
  return 'linux';
}

interface SetupWizardModalProps {
  isOpen: boolean;
  template: PredefinedServerTemplate | null;
  onClose: () => void;
  onComplete: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

export function SetupWizardModal({ isOpen, template, onClose, onComplete }: SetupWizardModalProps) {
  const { checkPrerequisites, createFromTemplate } = useMCPCatalog();

  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [prerequisiteResults, setPrerequisiteResults] = useState<PrerequisiteCheckResult[]>([]);
  const [isCheckingPrereqs, setIsCheckingPrereqs] = useState(false);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [serverName, setServerName] = useState('');
  const [autoConnect, setAutoConnect] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && template) {
      setCurrentStep(1);
      setPrerequisiteResults([]);
      setConfigValues({});
      setServerName(template.name);
      setAutoConnect(true);
      setEnabled(true);
      setError(null);
      setShowSensitive({});

      // Auto-check prerequisites
      handleCheckPrerequisites();
    }
  }, [isOpen, template]);

  const handleCheckPrerequisites = async () => {
    if (!template) return;

    setIsCheckingPrereqs(true);
    setError(null);

    try {
      const results = await checkPrerequisites(template.templateId);
      setPrerequisiteResults(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check prerequisites';
      setError(message);
    } finally {
      setIsCheckingPrereqs(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
      setError(null);
    }
  };

  const handleConfigChange = (key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleShowSensitive = (key: string) => {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async () => {
    if (!template) return;

    // Validate required fields
    for (const field of template.configFields) {
      if (field.required && !configValues[field.key]?.trim()) {
        setError(`${field.name} is required`);
        return;
      }
    }

    if (!serverName.trim()) {
      setError('Server name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createFromTemplate(template.templateId, serverName.trim(), configValues);
      onComplete();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create server';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 1) {
      // Check if all prerequisites are met
      return prerequisiteResults.length > 0 && prerequisiteResults.every((r) => r.installed);
    }
    if (currentStep === 2) {
      // Check if required config fields are filled
      return template?.configFields.every((f) => !f.required || configValues[f.key]?.trim()) ?? false;
    }
    if (currentStep === 3) {
      return serverName.trim().length > 0;
    }
    return true;
  };

  if (!template) return null;

  const platform = getPlatform();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add ${template.name}`} size="large">
      <div className="space-y-6">
        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={cn(
                'h-2 w-2 rounded-full transition-colors',
                step === currentStep
                  ? 'bg-purple-500 w-8'
                  : step < currentStep
                  ? 'bg-emerald-500'
                  : 'bg-white/20'
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {/* Step 1: Prerequisites */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Prerequisites Check</h3>
                <p className="text-sm text-white/60">
                  Verifying that required software is installed on your system.
                </p>
              </div>

              {isCheckingPrereqs ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4" />
                  <p className="text-sm text-white/60">Checking prerequisites...</p>
                </div>
              ) : prerequisiteResults.length > 0 ? (
                <div className="space-y-3">
                  <PrerequisiteWarning
                    results={prerequisiteResults}
                    platform={platform}
                    onCheckAgain={handleCheckPrerequisites}
                  />

                  {/* Success list */}
                  {prerequisiteResults.some((r) => r.installed) && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider">
                        Installed
                      </h4>
                      {prerequisiteResults
                        .filter((r) => r.installed)
                        .map((result, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30"
                          >
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm text-white">{result.prerequisite.name}</span>
                            {result.version && (
                              <span className="text-xs text-white/50 ml-auto">{result.version}</span>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {/* Step 2: Configuration */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Configuration</h3>
                <p className="text-sm text-white/60">
                  {template.configFields.length > 0
                    ? 'Enter the required configuration values.'
                    : 'No configuration required for this server.'}
                </p>
              </div>

              {template.configFields.length > 0 ? (
                <div className="space-y-4">
                  {template.configFields.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">
                        {field.name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </label>
                      <p className="text-xs text-white/50 mb-2">{field.description}</p>

                      {field.type === 'password' ? (
                        <div className="relative">
                          <input
                            type={showSensitive[field.key] ? 'text' : 'password'}
                            value={configValues[field.key] || ''}
                            onChange={(e) => handleConfigChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => toggleShowSensitive(field.key)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            {showSensitive[field.key] ? (
                              <EyeOff className="h-4 w-4 text-white/40" />
                            ) : (
                              <Eye className="h-4 w-4 text-white/40" />
                            )}
                          </button>
                        </div>
                      ) : field.type === 'select' ? (
                        <select
                          value={configValues[field.key] || ''}
                          onChange={(e) => handleConfigChange(field.key, e.target.value)}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                        >
                          <option value="">Select...</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : 'text'}
                          value={configValues[field.key] || ''}
                          onChange={(e) => handleConfigChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none font-mono"
                        />
                      )}

                      {field.helpUrl && (
                        <a
                          href={field.helpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1.5 transition-colors"
                        >
                          How to get this
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-white/40 text-sm">
                  This server doesn't require any configuration.
                </div>
              )}
            </div>
          )}

          {/* Step 3: Server Settings */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Server Settings</h3>
                <p className="text-sm text-white/60">Configure how this server will behave.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  Server Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  placeholder={template.name}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-white/80">Enable server</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConnect}
                    onChange={(e) => setAutoConnect(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
                  />
                  <span className="text-sm text-white/80">Auto-connect on startup</span>
                </label>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Review & Confirm</h3>
                <p className="text-sm text-white/60">
                  Review your configuration before adding the server.
                </p>
              </div>

              <div className="space-y-3">
                <div className="rounded-xl bg-white/5 p-4">
                  <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                    Server Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Name:</span>
                      <span className="text-white font-medium">{serverName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Template:</span>
                      <span className="text-white">{template.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Transport:</span>
                      <span className="text-white">{template.transport.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Status:</span>
                      <span className="text-white">{enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Auto-connect:</span>
                      <span className="text-white">{autoConnect ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>

                {template.configFields.length > 0 && (
                  <div className="rounded-xl bg-white/5 p-4">
                    <h4 className="text-xs font-medium text-white/60 uppercase tracking-wider mb-2">
                      Configuration
                    </h4>
                    <div className="space-y-2 text-sm">
                      {template.configFields.map((field) => (
                        <div key={field.key} className="flex justify-between gap-4">
                          <span className="text-white/60">{field.name}:</span>
                          <span className="text-white font-mono text-xs truncate max-w-[200px]">
                            {field.sensitive && configValues[field.key]
                              ? '••••••••'
                              : configValues[field.key] || '(not set)'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
          )}

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50 disabled:opacity-50"
          >
            Cancel
          </button>

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Adding...' : 'Add Server'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
