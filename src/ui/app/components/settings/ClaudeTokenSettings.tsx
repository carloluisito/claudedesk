import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Eye, EyeOff, Loader2, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { cn } from '../../lib/cn';
import { api } from '../../lib/api';

interface TokenStatus {
  source: 'auto' | 'manual' | 'none';
  isValid: boolean;
  lastValidated: string | null;
  tokenPreview: string | null;
}

export function ClaudeTokenSettings() {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    error?: string;
    message?: string;
  } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [helpExpanded, setHelpExpanded] = useState(false);

  // Load status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  // Auto-expand help when no token detected
  useEffect(() => {
    if (status && status.source === 'none') {
      setHelpExpanded(true);
    }
  }, [status]);

  async function loadStatus() {
    setLoading(true);
    try {
      const result = await api<TokenStatus>('GET', '/settings/claude/token/status');
      setStatus(result);
    } catch (error) {
      console.error('Failed to load token status:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleTestToken() {
    if (!token.trim()) return;

    setValidating(true);
    setValidationResult(null);
    setSaveSuccess(false);

    try {
      const result = await api<{ valid: boolean; error?: string; message?: string }>(
        'POST',
        '/settings/claude/token/validate',
        { token: token.trim() }
      );
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        error: 'network_error',
        message: 'Failed to validate token',
      });
    } finally {
      setValidating(false);
    }
  }

  async function handleSaveToken() {
    if (!token.trim() || !validationResult?.valid) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      await api('PUT', '/settings/claude/token', { token: token.trim() });
      setSaveSuccess(true);
      setToken('');
      setValidationResult(null);
      await loadStatus();

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save token:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleClearToken() {
    if (!confirm('Are you sure you want to remove the manual token configuration?')) {
      return;
    }

    setDeleting(true);

    try {
      await api('DELETE', '/settings/claude/token');
      await loadStatus();
    } catch (error) {
      console.error('Failed to delete token:', error);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-white/60" />
            <span className="text-sm text-white/60">Loading token status...</span>
          </div>
        </div>
      </div>
    );
  }

  // Fix: explicitly check for valid sources, not just !== 'none'
  const isConnected = status?.source === 'auto' || status?.source === 'manual';
  const isManual = status?.source === 'manual';
  const isAuto = status?.source === 'auto';
  const isNone = !isConnected;

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-medium text-white">Connection Status</h3>
            <p className="mt-1 text-sm text-white/60">
              Claude API token configuration
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" />
                Connected
              </Badge>
            ) : (
              <Badge variant="error">
                <XCircle className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-white/60">Source:</span>
            <span className="font-medium text-white">
              {isAuto && 'Auto-detected'}
              {isManual && 'Manual Configuration'}
              {isNone && 'Not configured'}
            </span>
          </div>

          {status?.tokenPreview && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">Token:</span>
              <code className="rounded bg-white/5 px-2 py-1 font-mono text-xs text-white">
                {status.tokenPreview}
              </code>
            </div>
          )}

          {status?.lastValidated && (
            <div className="flex items-center justify-between">
              <span className="text-white/60">Last Validated:</span>
              <span className="text-white">
                {new Date(status.lastValidated).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Token Configuration Section */}
      {(!isConnected || isManual) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-base font-medium text-white">
            {isManual ? 'Update Token' : 'Manual Token Configuration'}
          </h3>
          <p className="mt-1 text-sm text-white/60">
            {isManual
              ? 'Update or remove your manually configured token'
              : 'Enter your Claude API token to enable usage tracking'}
          </p>

          <div className="mt-4 space-y-4">
            {/* Token Input */}
            <div>
              <label className="block text-sm font-medium text-white/80">
                API Token
              </label>
              <div className="relative mt-2">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setValidationResult(null);
                    setSaveSuccess(false);
                  }}
                  placeholder="Paste your token here..."
                  className={cn(
                    'w-full rounded-xl border bg-white/5 px-4 py-2.5 pr-10 font-mono text-sm text-white',
                    'placeholder:text-white/40',
                    'focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/10',
                    validationResult?.valid
                      ? 'border-green-500/50'
                      : validationResult?.valid === false
                      ? 'border-red-500/50'
                      : 'border-white/10'
                  )}
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition-colors hover:text-white/60"
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Validation Result */}
            {validationResult && (
              <div
                className={cn(
                  'flex items-start gap-2 rounded-xl border p-3 text-sm',
                  validationResult.valid
                    ? 'border-green-500/30 bg-green-500/10 text-green-200'
                    : 'border-red-500/30 bg-red-500/10 text-red-200'
                )}
              >
                {validationResult.valid ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>
                  {validationResult.valid
                    ? 'Token is valid and ready to save'
                    : validationResult.message || 'Token validation failed'}
                </span>
              </div>
            )}

            {/* Save Success */}
            {saveSuccess && (
              <div className="flex items-start gap-2 rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Token saved successfully</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestToken}
                disabled={!token.trim() || validating}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  'border border-white/20 bg-white/10 text-white',
                  'hover:bg-white/15',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test Token'
                )}
              </button>

              <button
                onClick={handleSaveToken}
                disabled={!validationResult?.valid || saving}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  'bg-white text-black',
                  'hover:bg-white/90',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Token'
                )}
              </button>

              {isManual && (
                <button
                  onClick={handleClearToken}
                  disabled={deleting}
                  className={cn(
                    'ml-auto flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                    'border border-red-500/30 bg-red-500/10 text-red-200',
                    'hover:bg-red-500/20',
                    'disabled:cursor-not-allowed disabled:opacity-50'
                  )}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Clear Token
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="rounded-2xl border border-white/10 bg-white/5">
        <button
          onClick={() => setHelpExpanded(!helpExpanded)}
          className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-white/5"
        >
          <div>
            <h3 className="text-base font-medium text-white">
              How to Get Your Claude API Token
            </h3>
            <p className="mt-1 text-sm text-white/60">
              Instructions for macOS Keychain and other platforms
            </p>
          </div>
          {helpExpanded ? (
            <ChevronUp className="h-5 w-5 text-white/60" />
          ) : (
            <ChevronDown className="h-5 w-5 text-white/60" />
          )}
        </button>

        {helpExpanded && (
          <div className="border-t border-white/10 p-6 space-y-4 text-sm text-white/80">
            <div>
              <h4 className="font-medium text-white mb-2">macOS (Keychain)</h4>
              <ol className="list-decimal list-inside space-y-2 pl-2">
                <li>Open Keychain Access app (search in Spotlight)</li>
                <li>Search for "anthropic" or "claude"</li>
                <li>Double-click the "claudeai_oauth_access_token" entry</li>
                <li>Check "Show password" and enter your Mac password</li>
                <li>Copy the token and paste it above</li>
              </ol>
            </div>

            <div>
              <h4 className="font-medium text-white mb-2">Linux / Windows</h4>
              <p>The token is stored in one of these locations:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 pl-2">
                <li>
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
                    ~/.claude/.credentials.json
                  </code>{' '}
                  (standard)
                </li>
                <li>
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
                    ~/.claude/.credentials
                  </code>{' '}
                  (Windows, no extension)
                </li>
                <li>
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">
                    ~/.claude/credentials.json
                  </code>{' '}
                  (legacy)
                </li>
              </ul>
              <p className="mt-3">
                Look for the <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">accessToken</code>{' '}
                field under <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs">claudeAiOauth</code>,
                or at the root level (legacy format)
              </p>
            </div>

            <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-blue-200">
              <p className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  This token is stored encrypted on your machine. Never share it with anyone.
                </span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
