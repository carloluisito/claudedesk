import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Check,
  Copy,
  Eye,
  EyeOff,
  Play,
  Square,
  Loader2,
  QrCode,
  AlertTriangle,
  RefreshCw,
  RotateCw,
  Shield,
  Hash,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useRemoteAccess } from '../../hooks/useRemoteAccess';
import { useToast } from '../../hooks/useToast';
import { MobilePairingSheet } from '../../components/remote-access/MobilePairingSheet';
import { TokenRotationModal } from '../../components/remote-access/TokenRotationModal';
import { PinPairingModal } from '../../components/remote-access/PinPairingModal';

export function RemoteAccess() {
  const {
    status,
    token,
    loading,
    error,
    startTunnel,
    stopTunnel,
    updateSettings,
    rotateToken: rotateTokenApi,
    generateQR,
  } = useRemoteAccess();

  const toast = useToast();

  const [tokenVisible, setTokenVisible] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showPairingSheet, setShowPairingSheet] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleEnableToggle = async () => {
    // Show security warning on first enable
    if (!status?.enabled && !showSecurityWarning) {
      setShowSecurityWarning(true);
      return;
    }

    const newEnabled = !status?.enabled;
    const result = await updateSettings({ enabled: newEnabled });

    if (result.success) {
      toast.success(newEnabled ? 'Remote access enabled' : 'Remote access disabled');
      setShowSecurityWarning(false);
    } else {
      toast.error(result.error || 'Failed to update settings');
    }
  };

  const handleAutoStartToggle = async () => {
    const result = await updateSettings({ autoStart: !status?.autoStart });
    if (!result.success) {
      toast.error(result.error || 'Failed to update settings');
    }
  };

  const handleStart = async () => {
    setStarting(true);
    const result = await startTunnel();
    setStarting(false);

    if (result.success) {
      toast.success('Tunnel started successfully');
    } else {
      toast.error(result.error || 'Failed to start tunnel');
    }
  };

  const handleStop = async () => {
    setStopping(true);
    const result = await stopTunnel();
    setStopping(false);

    if (result.success) {
      toast.success('Tunnel stopped');
    } else {
      toast.error(result.error || 'Failed to stop tunnel');
    }
  };

  const handleRotateToken = async () => {
    const result = await rotateTokenApi();
    setShowRotateModal(false);

    if (result.success) {
      toast.success('Auth token rotated successfully. All active sessions will be invalidated.');
    } else {
      toast.error(result.error || 'Failed to rotate token');
    }
  };

  const handleOpenPairingSheet = async () => {
    setShowPairingSheet(true);
  };

  const maskToken = (token: string): string => {
    if (token.length <= 8) return '*'.repeat(token.length);
    return token.slice(0, 4) + '*'.repeat(token.length - 8) + token.slice(-4);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <div className="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Cloudflared not installed warning */}
      {!status?.cloudflaredInstalled && (
        <div className="rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-400">cloudflared not installed</p>
              <p className="text-xs text-amber-400/70 mt-1">
                Install cloudflared to enable remote access:{' '}
                <a
                  href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-amber-300"
                >
                  Installation Guide
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Warning Modal */}
      {showSecurityWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md mx-4 rounded-3xl bg-zinc-900 p-6 ring-1 ring-white/10 shadow-2xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20">
                <Shield className="h-5 w-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-1">Enable Remote Access?</h3>
                <p className="text-sm text-white/60 mb-3">
                  This will generate a secure auth token and allow you to access ClaudeDesk from any device via a
                  Cloudflare Tunnel.
                </p>
                <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10 space-y-2">
                  <p className="text-xs text-white/70 font-medium">Security Notes:</p>
                  <ul className="text-xs text-white/60 space-y-1 list-disc list-inside">
                    <li>A unique auth token will be generated</li>
                    <li>All remote requests require this token</li>
                    <li>Rate limiting protects against brute force attacks</li>
                    <li>You can rotate the token anytime</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSecurityWarning(false)}
                className="flex-1 rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEnableToggle}
                className="flex-1 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Enable
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white">Enable remote access</p>
          <p className="text-xs text-white/50 mt-1">
            Access ClaudeDesk from any device via Cloudflare Tunnel
          </p>
        </div>
        <button
          onClick={handleEnableToggle}
          disabled={!status?.cloudflaredInstalled}
          role="switch"
          aria-checked={status?.enabled}
          className={cn(
            'relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
            status?.enabled ? 'bg-blue-600' : 'bg-white/20',
            !status?.cloudflaredInstalled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
              status?.enabled ? 'translate-x-5' : 'translate-x-0.5'
            )}
          />
        </button>
      </div>

      {status?.enabled && (
        <>
          {/* Auto-start Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Auto-start on launch</p>
              <p className="text-xs text-white/50 mt-1">Automatically start tunnel when ClaudeDesk starts</p>
            </div>
            <button
              onClick={handleAutoStartToggle}
              role="switch"
              aria-checked={status?.autoStart}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors flex-shrink-0',
                status?.autoStart ? 'bg-blue-600' : 'bg-white/20'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  status?.autoStart ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleStart}
              disabled={starting || stopping || status.status === 'running'}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Start Tunnel
            </button>
            <button
              onClick={handleStop}
              disabled={starting || stopping || status.status === 'stopped'}
              className="flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
            >
              {stopping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
              Stop
            </button>
          </div>

          {/* Status Indicator */}
          {status.status !== 'stopped' && (
            <div
              className={cn(
                'rounded-2xl px-3 py-2 text-sm',
                status.status === 'running' && 'bg-emerald-500/20 text-emerald-400',
                status.status === 'starting' && 'bg-yellow-500/20 text-yellow-400',
                status.status === 'error' && 'bg-red-500/20 text-red-400'
              )}
            >
              Status: {status.status}
            </div>
          )}

          {/* Access URL */}
          {status.status === 'running' && status.url && (
            <div className="space-y-2">
              <label className="text-sm text-white/60">Access URL</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-2xl bg-white/5 px-4 py-2.5 font-mono text-sm text-white ring-1 ring-white/10 truncate">
                  {status.url}
                </code>
                <button
                  onClick={() => copyToClipboard(status.url!, 'url')}
                  className="p-2.5 text-white/40 hover:text-white/70 rounded-2xl hover:bg-white/10 transition flex-shrink-0"
                  title="Copy URL"
                >
                  {copiedField === 'url' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowPinModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  <Hash className="h-4 w-4" />
                  Pairing PIN
                </button>
                <button
                  onClick={handleOpenPairingSheet}
                  className="flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </button>
              </div>
              <p className="text-xs text-white/40">Share this URL to access ClaudeDesk remotely</p>
            </div>
          )}

          {/* Auth Token */}
          {status.tokenConfigured && token?.token && (
            <div className="space-y-2">
              <label className="text-sm text-white/60">Auth Token</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-2xl bg-white/5 px-4 py-2.5 font-mono text-sm text-white ring-1 ring-white/10 truncate">
                  {tokenVisible ? token.token : maskToken(token.token)}
                </code>
                <button
                  onClick={() => setTokenVisible(!tokenVisible)}
                  className="p-2.5 text-white/40 hover:text-white/70 rounded-2xl hover:bg-white/10 transition flex-shrink-0"
                  title={tokenVisible ? 'Hide token' : 'Show token'}
                >
                  {tokenVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(token.token!, 'token')}
                  className="p-2.5 text-white/40 hover:text-white/70 rounded-2xl hover:bg-white/10 transition flex-shrink-0"
                  title="Copy token"
                >
                  {copiedField === 'token' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setShowRotateModal(true)}
                  className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/15 transition"
                >
                  <RotateCw className="h-4 w-4" />
                  Rotate
                </button>
              </div>
              <p className="text-xs text-white/40">
                Use this token to authenticate remote connections
                {token.createdAt && (
                  <span className="ml-1">
                    (Created {new Date(token.createdAt).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-xs text-white/50">
              <strong className="text-white/70">How it works:</strong> Cloudflare Tunnel creates a secure connection
              between your local ClaudeDesk instance and the internet. All traffic is encrypted and authenticated.
              No port forwarding or firewall configuration required.
            </p>
          </div>
        </>
      )}

      {/* PIN Pairing Modal */}
      {showPinModal && (
        <PinPairingModal onClose={() => setShowPinModal(false)} />
      )}

      {/* Pairing Sheet */}
      {showPairingSheet && (
        <MobilePairingSheet
          onClose={() => setShowPairingSheet(false)}
          generateQR={generateQR}
          url={status?.url || null}
          token={token?.token || null}
        />
      )}

      {/* Token Rotation Modal */}
      {showRotateModal && (
        <TokenRotationModal
          onConfirm={handleRotateToken}
          onCancel={() => setShowRotateModal(false)}
        />
      )}
    </div>
  );
}
