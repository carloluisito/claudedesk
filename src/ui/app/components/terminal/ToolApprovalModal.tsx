import { useState } from 'react';
import { Puzzle, Check, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ToolApprovalModalProps {
  isOpen: boolean;
  toolName: string;
  serverName: string;
  description?: string;
  inputParameters: Record<string, unknown>;
  onApprove: (autoApproveSession: boolean) => void;
  onDeny: () => void;
  isLoading?: boolean;
}

export function ToolApprovalModal({
  isOpen,
  toolName,
  serverName,
  description,
  inputParameters,
  onApprove,
  onDeny,
  isLoading = false,
}: ToolApprovalModalProps) {
  const [autoApproveSession, setAutoApproveSession] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onDeny}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-2xl bg-[#0a0d14] ring-1 ring-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/20 ring-1 ring-purple-500/30">
              <Puzzle className="h-5 w-5 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white">MCP Tool Approval Required</h3>
              <p className="text-sm text-white/60">
                Claude wants to use an MCP tool
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Tool Info */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-white/60">Tool:</span>
              <span className="text-base font-semibold text-white">{toolName}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium text-white/60">Server:</span>
              <span className="text-base text-purple-400">{serverName}</span>
            </div>
            {description && (
              <div className="mt-2 text-sm text-white/70 italic">
                {description}
              </div>
            )}
          </div>

          {/* Input Parameters */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Input Parameters:</span>
              <span className="text-xs text-white/40">
                {Object.keys(inputParameters).length} parameter{Object.keys(inputParameters).length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="rounded-xl bg-black/30 ring-1 ring-white/10 p-4 overflow-auto max-h-64">
              <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap break-words">
                {JSON.stringify(inputParameters, null, 2)}
              </pre>
            </div>
          </div>

          {/* Auto-approve checkbox */}
          <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <input
              type="checkbox"
              id="auto-approve"
              checked={autoApproveSession}
              onChange={(e) => setAutoApproveSession(e.target.checked)}
              disabled={isLoading}
              className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50"
            />
            <label htmlFor="auto-approve" className="flex-1 cursor-pointer">
              <div className="text-sm font-medium text-white/90">
                Auto-approve tools for this session
              </div>
              <div className="text-xs text-white/60 mt-0.5">
                All MCP tool calls in this session will be automatically approved without showing this dialog.
              </div>
            </label>
          </div>

          {/* Warning */}
          <div className="rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 p-3">
            <p className="text-xs text-amber-200/90">
              <strong>Security Note:</strong> Only approve tools from MCP servers you trust. Tools can perform actions on your system or access your data.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex gap-3">
          <button
            onClick={onDeny}
            disabled={isLoading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
              'bg-white/5 text-white/80 ring-1 ring-white/10',
              'hover:bg-white/10 hover:text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <X className="h-4 w-4" />
            Deny
          </button>
          <button
            onClick={() => onApprove(autoApproveSession)}
            disabled={isLoading}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
              'bg-blue-600 text-white',
              'hover:bg-blue-500',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Approve
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
