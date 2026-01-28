import { X, ExternalLink, Check, Terminal, Globe, CheckCircle2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { cn } from '../../lib/cn';
import { PredefinedServerTemplate } from '../../types/mcp-catalog';

// Browser-compatible platform detection
function getPlatform(): 'windows' | 'darwin' | 'linux' {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'darwin';
  return 'linux';
}

interface ServerDetailsSheetProps {
  template: PredefinedServerTemplate | null;
  isConfigured?: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

const maintainerColors = {
  official: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50',
  verified: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50',
  community: 'bg-zinc-700/50 text-zinc-400 ring-1 ring-zinc-600',
};

const transportIcons = {
  stdio: Terminal,
  sse: Globe,
};

export function ServerDetailsSheet({
  template,
  isConfigured = false,
  onClose,
  onGetStarted,
}: ServerDetailsSheetProps) {
  if (!template) return null;

  const IconComponent = (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[template.iconName] || LucideIcons.Puzzle;
  const TransportIcon = transportIcons[template.transport];
  const platform = getPlatform();

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <IconComponent className="h-10 w-10 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-2">{template.name}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-md text-xs font-medium',
                    maintainerColors[template.maintainer]
                  )}
                >
                  {template.maintainer === 'official' ? 'Official' : template.maintainer === 'verified' ? 'Verified' : 'Community'}
                </span>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-white/70 text-xs font-medium">
                  <TransportIcon className="h-3 w-3" />
                  {template.transport.toUpperCase()}
                </span>
                {isConfigured && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-xs font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Configured
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">About</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              {template.longDescription || template.description}
            </p>
          </div>

          {/* Tags */}
          {template.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {template.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 rounded-lg bg-white/5 text-white/60 text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prerequisites */}
          {template.prerequisites.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Prerequisites</h3>
              <div className="space-y-2">
                {template.prerequisites.map((prereq, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/5"
                  >
                    <span className="text-sm text-white">{prereq.name}</span>
                    {prereq.installUrl[platform] && (
                      <a
                        href={prereq.installUrl[platform]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        Install
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Fields */}
          {template.configFields.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-2">Configuration</h3>
              <div className="space-y-2">
                {template.configFields.map((field) => (
                  <div key={field.key} className="p-3 rounded-xl bg-white/5">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-sm font-medium text-white">
                        {field.name}
                        {field.required && <span className="text-red-400 ml-1">*</span>}
                      </span>
                      {field.sensitive && (
                        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 text-xs">
                          Sensitive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/50">{field.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Platform Support */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Platform Support</h3>
            <div className="flex flex-wrap gap-2">
              {template.platforms.map((plat) => (
                <div
                  key={plat}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
                    plat === platform
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                      : 'bg-white/5 text-white/60'
                  )}
                >
                  {plat === platform && <Check className="h-3 w-3" />}
                  {plat === 'windows' ? 'Windows' : plat === 'darwin' ? 'macOS' : 'Linux'}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-white/10">
          {template.documentationUrl && (
            <a
              href={template.documentationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50"
            >
              Documentation
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={onGetStarted}
            className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500"
          >
            {isConfigured ? 'Reconfigure' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
