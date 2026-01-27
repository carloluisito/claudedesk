import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown, ChevronUp, Loader2, Copy, Check, Smartphone, Share } from 'lucide-react';
import type { QRCodeData } from '../../hooks/useRemoteAccess';

interface MobilePairingSheetProps {
  onClose: () => void;
  generateQR: () => Promise<{ success: boolean; data?: QRCodeData; error?: string }>;
  url: string | null;
  token: string | null;
}

export function MobilePairingSheet({ onClose, generateQR, url, token }: MobilePairingSheetProps) {
  const [qrData, setQrData] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const loadQR = async () => {
      setLoading(true);
      const result = await generateQR();

      if (result.success && result.data) {
        setQrData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to generate QR code');
      }

      setLoading(false);
    };

    loadQR();
  }, [generateQR]);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isMobile = window.innerWidth < 768;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <AnimatePresence>
        <motion.div
          initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
          animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1 }}
          exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full md:max-w-md md:mx-4 rounded-t-3xl md:rounded-3xl bg-zinc-900 shadow-2xl ring-1 ring-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-lg font-semibold text-white">Mobile Pairing</h3>
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/70 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-white/40 mb-3" />
                <p className="text-sm text-white/60">Generating QR code...</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-red-500/10 p-4 ring-1 ring-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            ) : qrData ? (
              <>
                {/* QR Code */}
                <div className="flex flex-col items-center space-y-3">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-white/20">
                    <img
                      src={qrData.qrDataUrl}
                      alt="Pairing QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <p className="text-sm text-white/60 text-center">
                    Scan this QR code with your mobile device to access ClaudeDesk
                  </p>
                </div>

                {/* Manual Access Section */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowManual(!showManual)}
                    className="w-full flex items-center justify-between text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <span>Manual access</span>
                    {showManual ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <AnimatePresence>
                    {showManual && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-3"
                      >
                        {/* URL */}
                        {url && (
                          <div className="space-y-1">
                            <label className="text-xs text-white/50">URL</label>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 rounded-xl bg-white/5 px-3 py-2 font-mono text-xs text-white ring-1 ring-white/10 truncate">
                                {url}
                              </code>
                              <button
                                onClick={() => copyToClipboard(url, 'manual-url')}
                                className="p-2 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/10 transition flex-shrink-0"
                                title="Copy URL"
                              >
                                {copiedField === 'manual-url' ? (
                                  <Check className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Token */}
                        {token && (
                          <div className="space-y-1">
                            <label className="text-xs text-white/50">Token</label>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 rounded-xl bg-white/5 px-3 py-2 font-mono text-xs text-white ring-1 ring-white/10 truncate">
                                {token}
                              </code>
                              <button
                                onClick={() => copyToClipboard(token, 'manual-token')}
                                className="p-2 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/10 transition flex-shrink-0"
                                title="Copy token"
                              >
                                {copiedField === 'manual-token' ? (
                                  <Check className="h-4 w-4 text-emerald-400" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                          <p className="text-xs text-white/50">
                            Manually enter the URL and token in your mobile browser's address bar to access ClaudeDesk.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Instructions */}
                <div className="rounded-2xl bg-blue-500/10 p-4 ring-1 ring-blue-500/20">
                  <p className="text-xs text-blue-400 font-medium mb-2">Quick Start:</p>
                  <ol className="text-xs text-blue-400/80 space-y-1 list-decimal list-inside">
                    <li>Open your mobile device's camera app</li>
                    <li>Point it at the QR code above</li>
                    <li>Tap the notification to open ClaudeDesk</li>
                    <li>Your session will be automatically authenticated</li>
                  </ol>
                </div>

                {/* Add to Home Screen Section */}
                {url && token && (
                  <div className="rounded-2xl bg-amber-500/10 p-4 ring-1 ring-amber-500/20 space-y-3">
                    <div className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-amber-400 font-medium">Add to Home Screen (iOS/Android)</p>
                        <p className="text-xs text-amber-400/70 mt-1">
                          To install ClaudeDesk as an app, use this special link that includes your authentication:
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-xl bg-white/5 px-3 py-2 font-mono text-[10px] text-white/80 ring-1 ring-white/10 break-all">
                        {`${url}?token=${token}`}
                      </code>
                      <button
                        onClick={() => copyToClipboard(`${url}?token=${token}`, 'pwa-url')}
                        className="p-2 text-amber-400 hover:text-amber-300 rounded-lg hover:bg-white/10 transition flex-shrink-0"
                        title="Copy install URL"
                      >
                        {copiedField === 'pwa-url' ? (
                          <Check className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    <div className="text-[10px] text-amber-400/60 space-y-1">
                      <p className="font-medium text-amber-400/80">How to install:</p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        <li>Copy the link above</li>
                        <li>Open it in Safari (iOS) or Chrome (Android)</li>
                        <li>Tap <Share className="inline h-3 w-3" /> Share → "Add to Home Screen"</li>
                        <li>The app will stay logged in</li>
                      </ol>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <button
              onClick={onClose}
              className="w-full rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
