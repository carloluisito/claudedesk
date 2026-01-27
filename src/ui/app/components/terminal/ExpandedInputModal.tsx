import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { X, Send, Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ExpandedInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (content: string) => void;
  initialValue: string;
  placeholder?: string;
  isRunning?: boolean;
}

export function ExpandedInputModal({
  isOpen,
  onClose,
  onSend,
  initialValue,
  placeholder = 'Type your message...',
  isRunning = false,
}: ExpandedInputModalProps) {
  const [content, setContent] = useState(initialValue);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setContent(initialValue);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
    // Escape to close
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSend = () => {
    if (content.trim()) {
      onSend(content);
      onClose();
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
          <div className="flex items-center gap-3">
            <Maximize2 className="h-5 w-5 text-zinc-400" />
            <span className="font-medium text-zinc-900 dark:text-zinc-100">Expanded Editor</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                showPreview
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              )}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Editor */}
          <div className={cn("flex-1 flex flex-col", showPreview && "border-r border-zinc-200 dark:border-zinc-700")}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
            />
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="flex-1 overflow-y-auto p-4 bg-zinc-50 dark:bg-zinc-800/50">
              <div className="text-xs font-medium text-zinc-400 mb-2">Preview</div>
              {content.trim() ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 bg-transparent p-0 m-0">{content}</pre>
                </div>
              ) : (
                <p className="text-sm text-zinc-400 italic">Start typing to see preview...</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-700 px-4 py-3">
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>{charCount} characters</span>
            <span>{wordCount} words</span>
            <span className="hidden sm:inline">
              <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">⌘↵</kbd> to send
              <span className="mx-2">•</span>
              <kbd className="rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5">Esc</kbd> to close
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!content.trim()}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                isRunning ? "bg-orange-500 hover:bg-orange-600" : "bg-blue-600 hover:bg-blue-700"
              )}
            >
              <Send className="h-4 w-4" />
              {isRunning ? 'Queue' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
