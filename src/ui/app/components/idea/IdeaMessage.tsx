/**
 * IdeaMessage - Enhanced message display with editorial typography
 *
 * Features:
 * - Larger refined avatars with gradient backgrounds
 * - Hover state reveals timestamp with smooth animation
 * - Custom markdown components for beautiful rendering
 * - Streaming indicator with pulsing dot on avatar
 * - Accessibility features (ARIA labels, semantic HTML)
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/cn';
import type { IdeaChatMessage } from '../../../../types';

interface IdeaMessageProps {
  message: IdeaChatMessage;
}

export function IdeaMessage({ message }: IdeaMessageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const isUser = message.role === 'user';

  // Format timestamp
  const timestamp = message.timestamp
    ? new Date(message.timestamp).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    : '';

  return (
    <div
      className={cn('flex gap-3.5 py-4', isUser ? 'justify-end' : '')}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Claude Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-600/20 ring-2 ring-purple-500/30 flex items-center justify-center">
            <Lightbulb className="h-4.5 w-4.5 text-purple-400" />
            {message.isStreaming && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse ring-2 ring-[#0a0d14]" />
            )}
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className="flex flex-col gap-1.5 max-w-[90%] sm:max-w-[85%]">
        {/* Timestamp (appears on hover) */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : -4 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'text-[10px] text-white/30 px-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {timestamp}
        </motion.div>

        {/* Message card */}
        <div
          className={cn(
            'group relative rounded-2xl px-5 py-3.5 transition-all duration-200',
            'ring-1',
            isUser
              ? 'bg-gradient-to-br from-purple-500/15 via-purple-500/10 to-purple-600/15 text-white/90 ring-purple-500/20 hover:ring-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10'
              : 'bg-gradient-to-br from-white/[0.04] via-white/[0.03] to-white/[0.02] text-white/80 ring-white/[0.06] hover:ring-white/[0.09] hover:shadow-lg hover:shadow-black/20'
          )}
          aria-busy={message.isStreaming}
          aria-label={`${isUser ? 'You' : 'Claude'} said: ${message.content}${timestamp ? ` at ${timestamp}` : ''}`}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 text-purple-300/70">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs">Thinking...</span>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-[15px] lg:text-[15.5px] leading-[1.7]">
              <ReactMarkdown
                remarkPlugins={[remarkBreaks, remarkGfm]}
                components={{
                  // Headings with proper hierarchy
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold text-white mt-6 mb-4 first:mt-0">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-bold text-white mt-5 mb-3 first:mt-0">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-semibold text-white/90 mt-4 mb-2 first:mt-0">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-base font-semibold text-white/90 mt-3 mb-2 first:mt-0">{children}</h4>
                  ),

                  // Code blocks with language badge
                  code: ({ inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';

                    if (inline) {
                      return (
                        <code
                          className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-200 ring-1 ring-purple-500/20 font-mono text-[13.5px]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }

                    return (
                      <div className="relative my-4 first:mt-0 last:mb-0">
                        {language && (
                          <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-white/5 text-white/40 text-[10px] font-mono uppercase tracking-wide">
                            {language}
                          </div>
                        )}
                        <pre className="bg-[#0d1117] rounded-xl p-4 overflow-x-auto ring-1 ring-white/10">
                          <code className="text-[13.5px] font-mono text-white/90" {...props}>
                            {children}
                          </code>
                        </pre>
                      </div>
                    );
                  },

                  // Links that open in new tab
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-300/50 transition-colors"
                    >
                      {children}
                    </a>
                  ),

                  // Blockquotes with purple accent
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-purple-500/50 pl-4 py-1 my-4 italic text-white/70 first:mt-0 last:mb-0">
                      {children}
                    </blockquote>
                  ),

                  // Lists with proper spacing
                  ul: ({ children }) => (
                    <ul className="space-y-2 my-4 pl-6 list-disc marker:text-purple-400/50 first:mt-0 last:mb-0">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="space-y-2 my-4 pl-6 list-decimal marker:text-purple-400/50 first:mt-0 last:mb-0">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-white/80 pl-1">{children}</li>
                  ),

                  // Tables with rounded corners
                  table: ({ children }) => (
                    <div className="my-4 overflow-x-auto first:mt-0 last:mb-0">
                      <table className="min-w-full border-collapse rounded-lg overflow-hidden ring-1 ring-white/10">
                        {children}
                      </table>
                    </div>
                  ),
                  thead: ({ children }) => (
                    <thead className="bg-white/5">
                      {children}
                    </thead>
                  ),
                  th: ({ children }) => (
                    <th className="px-4 py-2 text-left text-sm font-semibold text-white/90 border-b border-white/10">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="px-4 py-2 text-sm text-white/80 border-b border-white/5">
                      {children}
                    </td>
                  ),

                  // Paragraphs with spacing
                  p: ({ children }) => (
                    <p className="my-3 first:mt-0 last:mb-0 text-white/80">
                      {children}
                    </p>
                  ),

                  // Strong and emphasis
                  strong: ({ children }) => (
                    <strong className="font-semibold text-white/95">{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em className="italic text-white/85">{children}</em>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>

              {/* Streaming cursor */}
              {message.isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-purple-400/70 ml-0.5 align-middle rounded-sm animate-pulse" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-white/15 to-white/10 ring-1 ring-white/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white/70" />
          </div>
        </div>
      )}
    </div>
  );
}
