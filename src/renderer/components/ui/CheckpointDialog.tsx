/**
 * CheckpointDialog - Modal dialog for creating checkpoints
 */

import React, { useState, useEffect, useRef } from 'react';

interface CheckpointDialogProps {
  isOpen: boolean;
  sessionId: string | null;
  sessionName?: string;
  onConfirm: (name: string, description?: string, tags?: string[]) => void;
  onCancel: () => void;
}

export function CheckpointDialog({
  isOpen,
  sessionId,
  sessionName,
  onConfirm,
  onCancel,
}: CheckpointDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [conversationPreview, setConversationPreview] = useState<string>('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Load conversation preview when dialog opens
  useEffect(() => {
    if (isOpen && sessionId) {
      loadConversationPreview();
      // Auto-focus name input
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    } else {
      // Reset form when closed
      setName('');
      setDescription('');
      setTagsInput('');
      setConversationPreview('');
    }
  }, [isOpen, sessionId]);

  // Load last 5 lines of conversation
  const loadConversationPreview = async () => {
    if (!sessionId) return;

    setIsLoadingPreview(true);
    try {
      const fullHistory = await window.electronAPI.getHistory(sessionId);
      const lines = fullHistory.split('\n').filter(line => line.trim().length > 0);
      const recentLines = lines.slice(-5);
      setConversationPreview(recentLines.join('\n'));
    } catch (err) {
      console.error('Failed to load conversation preview:', err);
      setConversationPreview('[Preview unavailable]');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Checkpoint name is required');
      return;
    }

    // Parse tags (comma-separated)
    const tags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    onConfirm(
      name.trim(),
      description.trim() || undefined,
      tags.length > 0 ? tags : undefined
    );
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const isNameValid = name.trim().length > 0;
  const nameCharsRemaining = 50 - name.length;
  const descCharsRemaining = 500 - description.length;

  return (
    <div className="fixed inset-0 bg-black/50 z-[2000] flex items-center justify-center p-4">
      <div
        className="bg-[#1a1b26] rounded-lg shadow-2xl w-full max-w-md border border-[#292e42] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#292e42]">
          <h2 className="text-lg font-semibold text-[#a9b1d6]">Create Checkpoint</h2>
          {sessionName && (
            <div className="text-xs text-[#565f89] mt-1">
              Session: {sessionName}
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="checkpoint-name" className="text-sm font-medium text-[#a9b1d6]">
                Name <span className="text-[#f7768e]">*</span>
              </label>
              <span
                className={`text-xs ${
                  nameCharsRemaining < 0
                    ? 'text-[#f7768e]'
                    : nameCharsRemaining < 10
                    ? 'text-[#e0af68]'
                    : 'text-[#565f89]'
                }`}
              >
                {name.length}/50
              </span>
            </div>
            <input
              ref={nameInputRef}
              id="checkpoint-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.substring(0, 50))}
              maxLength={50}
              placeholder="e.g., Before API refactor"
              className="w-full px-3 py-2 bg-[#292e42] border border-[#3b4261] rounded text-[#a9b1d6] placeholder-[#565f89] focus:outline-none focus:border-[#7aa2f7] transition-colors"
              autoComplete="off"
            />
          </div>

          {/* Description field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="checkpoint-description" className="text-sm font-medium text-[#a9b1d6]">
                Description <span className="text-xs text-[#565f89]">(optional)</span>
              </label>
              <span
                className={`text-xs ${
                  descCharsRemaining < 0
                    ? 'text-[#f7768e]'
                    : descCharsRemaining < 50
                    ? 'text-[#e0af68]'
                    : 'text-[#565f89]'
                }`}
              >
                {description.length}/500
              </span>
            </div>
            <textarea
              id="checkpoint-description"
              value={description}
              onChange={(e) => setDescription(e.target.value.substring(0, 500))}
              maxLength={500}
              placeholder="Add notes about this checkpoint..."
              rows={3}
              className="w-full px-3 py-2 bg-[#292e42] border border-[#3b4261] rounded text-[#a9b1d6] placeholder-[#565f89] focus:outline-none focus:border-[#7aa2f7] transition-colors resize-none"
            />
          </div>

          {/* Tags field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="checkpoint-tags" className="text-sm font-medium text-[#a9b1d6]">
                Tags <span className="text-xs text-[#565f89]">(optional)</span>
              </label>
              <span className="text-xs text-[#565f89]">Comma-separated</span>
            </div>
            <input
              id="checkpoint-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="experiment, bug-fix, working"
              className="w-full px-3 py-2 bg-[#292e42] border border-[#3b4261] rounded text-[#a9b1d6] placeholder-[#565f89] focus:outline-none focus:border-[#7aa2f7] transition-colors"
              autoComplete="off"
            />
            {tagsInput.trim() && (
              <div className="flex flex-wrap gap-1 pt-1">
                {tagsInput.split(',').map((tag, i) => {
                  const trimmedTag = tag.trim();
                  if (!trimmedTag) return null;
                  return (
                    <span
                      key={i}
                      className="inline-block px-2 py-0.5 bg-[#7aa2f7]/10 text-[#7aa2f7] rounded text-xs"
                    >
                      {trimmedTag}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Conversation preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#a9b1d6]">Recent Conversation</label>
            <div className="bg-[#292e42] border border-[#3b4261] rounded p-3 max-h-32 overflow-y-auto">
              {isLoadingPreview ? (
                <div className="text-xs text-[#565f89] text-center py-2">Loading preview...</div>
              ) : conversationPreview ? (
                <pre className="text-xs text-[#565f89] font-mono whitespace-pre-wrap break-words">
                  {conversationPreview}
                </pre>
              ) : (
                <div className="text-xs text-[#3b4261] text-center py-2">No preview available</div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 bg-[#292e42] hover:bg-[#343b58] text-[#a9b1d6] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isNameValid || nameCharsRemaining < 0 || descCharsRemaining < 0}
              className="flex-1 px-4 py-2 bg-[#7aa2f7] hover:bg-[#7aa2f7]/90 text-[#1a1b26] font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Checkpoint
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
