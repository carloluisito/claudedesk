/**
 * DeleteConfirmationModal - Confirmation dialog for deleting a custom agent
 */

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  agentName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmationModal({
  isOpen,
  agentName,
  onConfirm,
  onCancel,
}: DeleteConfirmationModalProps) {
  const prefersReduced = useReducedMotion();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      setDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={!deleting ? onCancel : undefined}
          />

          {/* Dialog */}
          <motion.div
            className="relative z-10 w-full max-w-md rounded-3xl bg-[#0b0f16] p-6 ring-1 ring-white/10 mx-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: prefersReduced ? 0 : 0.2, ease: 'easeOut' }}
          >
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-2xl bg-red-500/10 ring-1 ring-red-500/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white text-center mb-2">
              Delete &ldquo;{agentName}&rdquo;?
            </h3>

            {/* Description */}
            <p className="text-sm text-white/50 text-center mb-6">
              This agent will be permanently removed from your system. This action cannot be undone.
            </p>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 p-3 mb-4 flex items-start gap-2"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-400 flex-1">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={deleting}
                className="flex-1 rounded-2xl bg-white/5 py-3 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete Agent
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
