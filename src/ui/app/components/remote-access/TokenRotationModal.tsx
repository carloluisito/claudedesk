import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface TokenRotationModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function TokenRotationModal({ onConfirm, onCancel }: TokenRotationModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md mx-4 rounded-3xl bg-zinc-900 p-6 ring-1 ring-white/10 shadow-2xl"
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">Rotate Auth Token?</h3>
            <p className="text-sm text-white/60">
              This will generate a new authentication token and invalidate all active remote sessions.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 mb-4">
          <p className="text-xs text-white/60">
            <strong className="text-white/80">What happens:</strong>
          </p>
          <ul className="text-xs text-white/60 mt-2 space-y-1 list-disc list-inside">
            <li>A new random token will be generated</li>
            <li>All remote users will need the new token to access ClaudeDesk</li>
            <li>You'll need to share the new QR code or token with remote devices</li>
            <li>Local access is not affected</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-2xl bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 transition-colors"
          >
            Rotate Token
          </button>
        </div>
      </motion.div>
    </div>
  );
}
