import { useState } from 'react';
import { X, Download, FileText, FileJson, Copy, Check } from 'lucide-react';
import { ChatMessage } from '../../store/terminalStore';
import { cn } from '../../lib/cn';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  sessionName: string;
}

type ExportFormat = 'markdown' | 'json' | 'text';

export function ExportModal({ isOpen, onClose, messages, sessionName }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const formatMessage = (msg: ChatMessage, fmt: ExportFormat): string => {
    const timestamp = new Date(msg.timestamp).toLocaleString();
    const role = msg.role === 'user' ? 'You' : 'Claude';

    switch (fmt) {
      case 'markdown':
        return `### ${role} (${timestamp})\n\n${msg.content}\n\n---\n`;
      case 'text':
        return `[${timestamp}] ${role}:\n${msg.content}\n\n`;
      case 'json':
        return ''; // Handled separately
    }
  };

  const generateExport = (): string => {
    if (format === 'json') {
      return JSON.stringify(
        {
          session: sessionName,
          exportedAt: new Date().toISOString(),
          messageCount: messages.length,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            attachments: m.attachments?.map((a) => a.originalName),
          })),
        },
        null,
        2
      );
    }

    const header =
      format === 'markdown'
        ? `# Conversation: ${sessionName}\n\nExported: ${new Date().toLocaleString()}\n\n---\n\n`
        : `Conversation: ${sessionName}\nExported: ${new Date().toLocaleString()}\n\n`;

    return header + messages.map((m) => formatMessage(m, format)).join('');
  };

  const handleDownload = () => {
    const content = generateExport();
    const extensions: Record<ExportFormat, string> = {
      markdown: 'md',
      json: 'json',
      text: 'txt',
    };
    const mimeTypes: Record<ExportFormat, string> = {
      markdown: 'text/markdown',
      json: 'application/json',
      text: 'text/plain',
    };

    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    const content = generateExport();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Export Conversation</h2>
            <p className="text-xs text-zinc-500">{messages.length} messages</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('markdown')}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-sm transition-colors',
                  format === 'markdown'
                    ? 'border-transparent bg-accent-dynamic text-white'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                )}
              >
                <FileText className="h-5 w-5" />
                Markdown
              </button>
              <button
                onClick={() => setFormat('json')}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-sm transition-colors',
                  format === 'json'
                    ? 'border-transparent bg-accent-dynamic text-white'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                )}
              >
                <FileJson className="h-5 w-5" />
                JSON
              </button>
              <button
                onClick={() => setFormat('text')}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-3 rounded-lg border text-sm transition-colors',
                  format === 'text'
                    ? 'border-transparent bg-accent-dynamic text-white'
                    : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                )}
              >
                <FileText className="h-5 w-5" />
                Plain Text
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
              Preview
            </label>
            <pre className="h-40 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs text-zinc-600 dark:text-zinc-400 font-mono whitespace-pre-wrap">
              {generateExport().slice(0, 1000)}
              {generateExport().length > 1000 && '\n\n... (truncated)'}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 dark:border-zinc-700 px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white bg-accent-dynamic transition-colors"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
