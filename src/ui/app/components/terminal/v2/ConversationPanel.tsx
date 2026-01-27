import { ReactNode, RefObject } from 'react';
import { Terminal as TerminalIcon, Loader2, Bot } from 'lucide-react';
import { GlassCard, GlassPanelHeader } from '../../ui/GlassCard';

interface ConversationPanelProps {
  children: ReactNode;
  messagesEndRef?: RefObject<HTMLDivElement>;
  isEmpty?: boolean;
  isRunning?: boolean;
  isThinking?: boolean;
  currentActivity?: string;
  onExport?: () => void;
  onBookmark?: () => void;
}

export function ConversationPanel({
  children,
  messagesEndRef,
  isEmpty = false,
  isRunning = false,
  isThinking = false,
  currentActivity,
  onExport,
  onBookmark,
}: ConversationPanelProps) {
  return (
    <GlassCard className="flex flex-col flex-1 min-h-0 w-full" padding="lg">
      <GlassPanelHeader
        title="Conversation"
        right={
          <div className="flex items-center gap-2">
            {onExport && (
              <button
                onClick={onExport}
                className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
              >
                Export
              </button>
            )}
            {onBookmark && (
              <button
                onClick={onBookmark}
                className="rounded-2xl bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
              >
                Bookmark
              </button>
            )}
          </div>
        }
      />

      <div className="mt-4 flex-1 overflow-y-auto overflow-x-hidden space-y-3 scroll-touch">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center text-white/50 py-12 px-4">
            <Bot className="h-16 w-16 sm:h-20 sm:w-20 mb-6 text-blue-400/50" />
            <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">Ready to build something?</h2>
            <p className="text-sm text-white/40 mb-8 text-center max-w-md">
              Start by describing what you'd like to build, or try one of these suggestions
            </p>

            <div className="w-full max-w-2xl space-y-3">
              <button
                onClick={() => {
                  const textarea = document.querySelector('textarea');
                  if (textarea) {
                    textarea.value = "Help me build a simple React todo app with TypeScript";
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.focus();
                  }
                }}
                className="w-full text-left rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🚀</span>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                      Build a React todo app
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      Create a simple todo app with TypeScript and local storage
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  const textarea = document.querySelector('textarea');
                  if (textarea) {
                    textarea.value = "Review my code and suggest improvements for better performance";
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.focus();
                  }
                }}
                className="w-full text-left rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🔍</span>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                      Review and optimize code
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      Get suggestions for performance and code quality improvements
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  const textarea = document.querySelector('textarea');
                  if (textarea) {
                    textarea.value = "Help me debug the error I'm seeing in the console";
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.focus();
                  }
                }}
                className="w-full text-left rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">🐛</span>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                      Debug an issue
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      Get help troubleshooting errors and fixing bugs
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => {
                  const textarea = document.querySelector('textarea');
                  if (textarea) {
                    textarea.value = "Write tests for my current implementation";
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                    textarea.focus();
                  }
                }}
                className="w-full text-left rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">✅</span>
                  <div>
                    <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                      Add test coverage
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      Generate unit and integration tests for your code
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-8 text-xs text-white/40 text-center">
              <p>💡 Tip: Use <span className="text-white/60 font-medium">@</span> to select a specialized agent for specific tasks</p>
            </div>
          </div>
        ) : (
          <>
            {children}

            {/* Thinking Indicator */}
            {isRunning && isThinking && (
              <div className="flex gap-2 sm:gap-3 px-3 sm:px-4 py-3">
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs sm:text-sm font-medium">
                  C
                </div>
                <div className="flex items-center gap-2 text-sm text-white/50">
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400 font-medium">Claude is thinking...</span>
                  </div>
                  {currentActivity && (
                    <span className="text-xs text-white/40 truncate max-w-xs">
                      {currentActivity}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </GlassCard>
  );
}

// Message bubble for the glassmorphism design
interface MessageBubbleProps {
  role: 'user' | 'assistant';
  text: string;
  meta?: string;
  agentId?: string;
  agentName?: string;
  onCopy?: () => void;
  onBookmark?: () => void;
  onRegenerate?: () => void;
}

export function MessageBubble({
  role,
  text,
  meta,
  agentId,
  agentName,
  onCopy,
  onBookmark,
  onRegenerate,
}: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[84%] rounded-3xl px-4 py-3 ring-1 ${
          isUser
            ? 'bg-white text-black ring-white'
            : 'bg-white/5 text-white ring-white/10'
        }`}
      >
        {/* Agent attribution badge for assistant messages */}
        {!isUser && agentId && (
          <div className="mb-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
              <Bot className="h-3 w-3" />
              via {agentName || agentId}
            </span>
          </div>
        )}
        {meta && (
          <div className={`text-xs ${isUser ? 'text-black/60' : 'text-white/55'}`}>{meta}</div>
        )}
        <pre
          className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${
            isUser ? 'text-black' : 'text-white/85'
          }`}
        >
          {text}
        </pre>
        <div
          className={`mt-3 flex items-center gap-2 text-xs ${
            isUser ? 'text-black/60' : 'text-white/55'
          }`}
        >
          {onCopy && (
            <button
              onClick={onCopy}
              className={`rounded-2xl px-2 py-1 ring-1 ${
                isUser
                  ? 'bg-black/5 ring-black/10'
                  : 'bg-white/5 ring-white/10 hover:bg-white/10'
              }`}
            >
              Copy
            </button>
          )}
          {onBookmark && (
            <button
              onClick={onBookmark}
              className={`rounded-2xl px-2 py-1 ring-1 ${
                isUser
                  ? 'bg-black/5 ring-black/10'
                  : 'bg-white/5 ring-white/10 hover:bg-white/10'
              }`}
            >
              Bookmark
            </button>
          )}
          {!isUser && onRegenerate && (
            <button
              onClick={onRegenerate}
              className="rounded-2xl bg-white/5 px-2 py-1 ring-1 ring-white/10 hover:bg-white/10"
            >
              Regenerate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
