import { memo, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { Loader2, Paperclip, Copy, Check, RefreshCw, ChevronDown, ChevronUp, Bookmark, BookmarkCheck, Bot } from 'lucide-react';
import { cn } from '../../lib/cn';
import { ChatMessage, ToolActivity, FileChange } from '../../store/terminalStore';
import { ActivityTimeline } from './ActivityTimeline';
import { CodeBlock, InlineCode } from './CodeBlock';
import { CodeChangesSummary } from './CodeChangesSummary';
import { MultiFileDiffModal } from './MultiFileDiffModal';
import { sanitizeSensitiveData } from '../../lib/sanitize';

// Threshold for collapsing long messages (in characters)
const COLLAPSE_THRESHOLD = 2000;

// Pre-process markdown to fix common formatting issues
function preprocessMarkdown(content: string): string {
  // Split by code blocks to avoid processing inside existing code blocks
  const codeBlockRegex = /(```[\s\S]*?```)/g;
  const parts = content.split(codeBlockRegex);

  return parts.map((part, index) => {
    // Skip code blocks (odd indices after split with capture group)
    if (index % 2 === 1) return part;

    let result = part;

    // Fix 1: Ensure markdown headers have newlines before them
    // Match text immediately followed by ## without a newline
    result = result.replace(/([^\n])(\n?)(#{1,6}\s)/g, (match, before, newline, header) => {
      // If there's already a newline, add one more; if not, add two
      return newline ? `${before}\n\n${header}` : `${before}\n\n${header}`;
    });

    // Fix 2: Handle multi-line flow diagrams that still have newlines
    const flowDiagramRegex = /(?:^|\n\n)((?:[^\n]*[↓→←↑][^\n]*\n){2,}[^\n]*[↓→←↑][^\n]*)(?:\n\n|$)/g;
    result = result.replace(flowDiagramRegex, (match, diagram) => {
      const arrowCount = (diagram.match(/[↓→←↑]/g) || []).length;
      if (arrowCount >= 3) {
        return `\n\n\`\`\`\n${diagram.trim()}\n\`\`\`\n\n`;
      }
      return match;
    });

    // Fix 3: Handle flow diagrams where newlines have been collapsed into single line
    // Look for text that contains many ↓ arrows (suggests vertical flow diagram)
    const lines = result.split('\n');
    result = lines.map(line => {
      const arrowCount = (line.match(/↓/g) || []).length;
      // If a single line has 4+ down arrows, it's likely a collapsed flow diagram
      if (arrowCount >= 4) {
        // Split on ↓ and rejoin with newlines to create vertical flow
        const formattedDiagram = line
          .split(/\s*↓\s*/)
          .filter((s: string) => s.trim())
          .join('\n    ↓\n');
        return `\n\`\`\`\n${formattedDiagram}\n\`\`\`\n`;
      }
      return line;
    }).join('\n');

    return result;
  }).join('');
}

interface MessageItemProps {
  message: ChatMessage;
  isLastAssistantMessage: boolean;
  toolActivities: ToolActivity[];
  currentActivity?: string;
  onRetry?: (content: string) => void;
  onRegenerate?: () => void;
  onToggleBookmark?: (messageId: string) => void;
  isSessionRunning?: boolean;
  sessionId?: string;
}

// Custom comparison function for memo - only re-render when message content actually changes
function arePropsEqual(prevProps: MessageItemProps, nextProps: MessageItemProps): boolean {
  // Always re-render if it's a streaming message (content is changing)
  if (prevProps.message.isStreaming || nextProps.message.isStreaming) {
    return false;
  }

  // Check basic message properties
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.message.isBookmarked !== nextProps.message.isBookmarked) return false;
  if (prevProps.isLastAssistantMessage !== nextProps.isLastAssistantMessage) return false;
  if (prevProps.isSessionRunning !== nextProps.isSessionRunning) return false;
  if (prevProps.sessionId !== nextProps.sessionId) return false;

  // Check file changes
  const prevFileChanges = prevProps.message.fileChanges || [];
  const nextFileChanges = nextProps.message.fileChanges || [];
  if (prevFileChanges.length !== nextFileChanges.length) return false;

  // For the last assistant message, check tool activities
  if (nextProps.isLastAssistantMessage) {
    if (prevProps.toolActivities.length !== nextProps.toolActivities.length) return false;
    if (prevProps.currentActivity !== nextProps.currentActivity) return false;

    // Check if any activity status changed
    for (let i = 0; i < nextProps.toolActivities.length; i++) {
      if (prevProps.toolActivities[i]?.status !== nextProps.toolActivities[i]?.status) {
        return false;
      }
    }
  }

  return true;
}

export const MessageItem = memo(function MessageItem({
  message,
  isLastAssistantMessage,
  toolActivities,
  currentActivity,
  onRetry,
  onRegenerate,
  onToggleBookmark,
  isSessionRunning = false,
  sessionId,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [selectedDiffFile, setSelectedDiffFile] = useState<string | undefined>();

  // Handle file click in CodeChangesSummary
  const handleFileClick = (filePath: string) => {
    setSelectedDiffFile(filePath);
    setShowDiffModal(true);
  };

  // Handle "View All Changes" button
  const handleViewAllChanges = () => {
    setSelectedDiffFile(undefined);
    setShowDiffModal(true);
  };

  // Determine if message should be collapsed
  const isLongMessage = (message.content?.length || 0) > COLLAPSE_THRESHOLD;
  const shouldCollapse = isLongMessage && !isExpanded;

  // Copy message content to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Memoize markdown components to prevent recreation on each render
  const markdownComponents = useMemo(() => ({
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');

      // Check if this is a code block (has newlines) - only way to reliably detect
      const isBlock = codeString.includes('\n');

      if (match) {
        return <CodeBlock code={codeString} language={match[1]} />;
      }

      // Render unlabeled code blocks (like flow diagrams) with pre styling
      if (isBlock) {
        return (
          <pre className="whitespace-pre font-mono text-sm bg-white/10 p-3 rounded-xl my-2 overflow-x-auto ring-1 ring-white/10">
            <code className="text-white/85">{children}</code>
          </pre>
        );
      }

      return <InlineCode {...props}>{children}</InlineCode>;
    },
    pre({ children }: { children?: React.ReactNode }) {
      return <>{children}</>;
    },
    a({ href, children, ...props }: { href?: string; children?: React.ReactNode }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
          {...props}
        >
          {children}
        </a>
      );
    },
    // Table components for GFM tables
    table({ children }: { children?: React.ReactNode }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="w-full border-collapse text-sm">
            {children}
          </table>
        </div>
      );
    },
    thead({ children }: { children?: React.ReactNode }) {
      return <thead className="bg-white/10 border-b border-white/20">{children}</thead>;
    },
    tbody({ children }: { children?: React.ReactNode }) {
      return <tbody className="divide-y divide-white/10">{children}</tbody>;
    },
    tr({ children }: { children?: React.ReactNode }) {
      return <tr className="hover:bg-white/5">{children}</tr>;
    },
    th({ children }: { children?: React.ReactNode }) {
      return <th className="px-3 py-2 text-left font-semibold text-white">{children}</th>;
    },
    td({ children }: { children?: React.ReactNode }) {
      return <td className="px-3 py-2 text-white/80">{children}</td>;
    },
    // Header components with proper spacing and styling
    h1({ children }: { children?: React.ReactNode }) {
      return <h1 className="text-xl font-bold mt-6 mb-3 text-white border-b border-white/20 pb-2">{children}</h1>;
    },
    h2({ children }: { children?: React.ReactNode }) {
      return <h2 className="text-lg font-bold mt-5 mb-2 text-white">{children}</h2>;
    },
    h3({ children }: { children?: React.ReactNode }) {
      return <h3 className="text-base font-semibold mt-4 mb-2 text-white/90">{children}</h3>;
    },
    // Paragraph styling
    p({ children }: { children?: React.ReactNode }) {
      return <p className="mb-2 text-white/85">{children}</p>;
    },
    // Blockquote styling
    blockquote({ children }: { children?: React.ReactNode }) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 my-3 text-white/60 italic">
          {children}
        </blockquote>
      );
    },
    // List styling
    ul({ children }: { children?: React.ReactNode }) {
      return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>;
    },
    ol({ children }: { children?: React.ReactNode }) {
      return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>;
    },
    li({ children }: { children?: React.ReactNode }) {
      return <li className="text-white/80">{children}</li>;
    },
  }), []);

  // User-specific markdown components (for white background)
  const userMarkdownComponents = useMemo(() => ({
    ...markdownComponents,
    code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
      const match = /language-(\w+)/.exec(className || '');
      const codeString = String(children).replace(/\n$/, '');
      const isBlock = codeString.includes('\n');

      if (match) {
        return <CodeBlock code={codeString} language={match[1]} />;
      }

      if (isBlock) {
        return (
          <pre className="whitespace-pre font-mono text-sm bg-black/5 p-3 rounded-xl my-2 overflow-x-auto ring-1 ring-black/10">
            <code className="text-black/85">{children}</code>
          </pre>
        );
      }

      return <InlineCode {...props}>{children}</InlineCode>;
    },
    thead({ children }: { children?: React.ReactNode }) {
      return <thead className="bg-black/5 border-b border-black/10">{children}</thead>;
    },
    tbody({ children }: { children?: React.ReactNode }) {
      return <tbody className="divide-y divide-black/10">{children}</tbody>;
    },
    tr({ children }: { children?: React.ReactNode }) {
      return <tr className="hover:bg-black/5">{children}</tr>;
    },
    th({ children }: { children?: React.ReactNode }) {
      return <th className="px-3 py-2 text-left font-semibold text-black">{children}</th>;
    },
    td({ children }: { children?: React.ReactNode }) {
      return <td className="px-3 py-2 text-black/80">{children}</td>;
    },
    h1({ children }: { children?: React.ReactNode }) {
      return <h1 className="text-xl font-bold mt-6 mb-3 text-black border-b border-black/10 pb-2">{children}</h1>;
    },
    h2({ children }: { children?: React.ReactNode }) {
      return <h2 className="text-lg font-bold mt-5 mb-2 text-black">{children}</h2>;
    },
    h3({ children }: { children?: React.ReactNode }) {
      return <h3 className="text-base font-semibold mt-4 mb-2 text-black/90">{children}</h3>;
    },
    p({ children }: { children?: React.ReactNode }) {
      return <p className="mb-2 text-black">{children}</p>;
    },
    blockquote({ children }: { children?: React.ReactNode }) {
      return (
        <blockquote className="border-l-4 border-blue-500 pl-4 my-3 text-black/60 italic">
          {children}
        </blockquote>
      );
    },
    li({ children }: { children?: React.ReactNode }) {
      return <li className="text-black/80">{children}</li>;
    },
  }), [markdownComponents]);

  return (
    <>
      {/* Message bubble container - chat-style alignment */}
      <div
        id={`message-${message.id}`}
        className={cn('flex px-3 py-2', isUser ? 'justify-end' : 'justify-start')}
      >
        {/* Bubble wrapper */}
        <div
          className={cn(
            'max-w-[84%] rounded-3xl px-4 py-3 ring-1',
            isUser
              ? 'bg-white text-black ring-white'
              : 'bg-white/5 text-white ring-white/10'
          )}
        >
          {/* Header: role + timestamp + streaming indicator */}
          <div className={cn('flex items-center gap-2 text-xs', isUser ? 'text-black/60' : 'text-white/55')}>
            <span className="font-medium">{isUser ? 'You' : 'Claude'}</span>
            <span>•</span>
            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
            {/* Agent attribution badge */}
            {!isUser && message.agentId && (
              <>
                <span>•</span>
                {message.autoDetected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-blue-400">
                    <Bot className="h-3 w-3" />
                    auto: {message.agentName || message.agentId}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-400">
                    <span>@{message.agentName || message.agentId}</span>
                  </span>
                )}
              </>
            )}
            {message.isStreaming && (
              <span className="flex items-center gap-1 text-emerald-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                {currentActivity ? (
                  <span className="truncate max-w-[150px]" title={currentActivity}>
                    {currentActivity.length > 30
                      ? currentActivity.slice(0, 30) + '...'
                      : currentActivity}
                  </span>
                ) : (
                  <span>Working...</span>
                )}
              </span>
            )}
          </div>

          {/* Activity Timeline - shows tool invocations for the last assistant message */}
          {isLastAssistantMessage && toolActivities.length > 0 && (
            <div className="mt-3">
              <ActivityTimeline
                activities={toolActivities}
                isStreaming={message.isStreaming || false}
              />
            </div>
          )}

          {/* Code Changes Summary - shows file changes for assistant messages */}
          {!isUser && message.fileChanges && message.fileChanges.length > 0 && !message.isStreaming && (
            <div className="mt-3">
              <CodeChangesSummary
                fileChanges={message.fileChanges}
                onFileClick={handleFileClick}
                onViewAllChanges={handleViewAllChanges}
              />
            </div>
          )}

          {/* Message content */}
          <div className={cn('mt-2 text-sm', shouldCollapse && 'relative')}>
            {isUser ? (
              <>
                <pre
                  className={cn(
                    'whitespace-pre-wrap font-sans text-black',
                    shouldCollapse && 'max-h-48 overflow-hidden'
                  )}
                >
                  {message.content}
                </pre>
                {/* Show attachments if any */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {message.attachments.map((att) => (
                      <span
                        key={att.id}
                        className="inline-flex items-center gap-1.5 text-xs bg-black/5 text-black/70 px-2.5 py-1 rounded-xl ring-1 ring-black/10"
                      >
                        <Paperclip className="h-3 w-3" />
                        {att.originalName}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div
                className={cn(
                  'prose prose-sm max-w-none prose-pre:p-0 prose-pre:bg-transparent',
                  shouldCollapse && 'max-h-48 overflow-hidden'
                )}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkBreaks, remarkGfm]}
                  components={markdownComponents}
                >
                  {preprocessMarkdown(sanitizeSensitiveData(message.content) || (message.isStreaming ? '...' : ''))}
                </ReactMarkdown>
              </div>
            )}

            {/* Collapse/Expand gradient and button */}
            {isLongMessage && (
              <>
                {shouldCollapse && (
                  <div
                    className={cn(
                      'absolute bottom-0 left-0 right-0 h-16 pointer-events-none',
                      isUser
                        ? 'bg-gradient-to-t from-white to-transparent'
                        : 'bg-gradient-to-t from-[#0d1117] to-transparent'
                    )}
                  />
                )}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    'flex items-center gap-1 mt-2 text-xs font-medium',
                    isUser ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'
                  )}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3" />
                      Show more ({Math.round((message.content?.length || 0) / 1000)}k characters)
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Action buttons - visible at bottom of bubble */}
          <div
            className={cn(
              'mt-3 flex items-center gap-2 text-xs',
              isUser ? 'text-black/60' : 'text-white/55'
            )}
          >
            <button
              onClick={handleCopy}
              className={cn(
                'rounded-2xl px-2.5 py-1 ring-1 transition-colors',
                isUser
                  ? 'bg-black/5 ring-black/10 hover:bg-black/10'
                  : 'bg-white/5 ring-white/10 hover:bg-white/10'
              )}
              title="Copy message"
            >
              {copied ? (
                <span className="flex items-center gap-1">
                  <Check className="h-3 w-3 text-emerald-500" />
                  Copied
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="h-3 w-3" />
                  Copy
                </span>
              )}
            </button>

            {onToggleBookmark && (
              <button
                onClick={() => onToggleBookmark(message.id)}
                className={cn(
                  'rounded-2xl px-2.5 py-1 ring-1 transition-colors',
                  message.isBookmarked
                    ? 'bg-yellow-500/20 ring-yellow-500/30 text-yellow-500'
                    : isUser
                    ? 'bg-black/5 ring-black/10 hover:bg-black/10'
                    : 'bg-white/5 ring-white/10 hover:bg-white/10'
                )}
                title={message.isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
              >
                <span className="flex items-center gap-1">
                  {message.isBookmarked ? (
                    <BookmarkCheck className="h-3 w-3" />
                  ) : (
                    <Bookmark className="h-3 w-3" />
                  )}
                  {message.isBookmarked ? 'Bookmarked' : 'Bookmark'}
                </span>
              </button>
            )}

            {isUser && onRetry && !isSessionRunning && (
              <button
                onClick={() => onRetry(message.content || '')}
                className={cn(
                  'rounded-2xl px-2.5 py-1 ring-1 transition-colors',
                  'bg-black/5 ring-black/10 hover:bg-black/10'
                )}
                title="Retry this message"
              >
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Retry
                </span>
              </button>
            )}

            {!isUser && isLastAssistantMessage && onRegenerate && !isSessionRunning && !message.isStreaming && (
              <button
                onClick={onRegenerate}
                className="rounded-2xl px-2.5 py-1 ring-1 bg-white/5 ring-white/10 hover:bg-white/10 transition-colors"
                title="Regenerate response"
              >
                <span className="flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Regenerate
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Multi-file Diff Modal - rendered outside the bubble */}
      {!isUser && message.fileChanges && message.fileChanges.length > 0 && sessionId && (
        <MultiFileDiffModal
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          fileChanges={message.fileChanges}
          sessionId={sessionId}
          initialFile={selectedDiffFile}
        />
      )}
    </>
  );
}, arePropsEqual);
