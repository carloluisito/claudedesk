/**
 * PRPreview - Live pull request preview before creation
 *
 * Features:
 * - Title and description preview
 * - AI-generated content suggestions
 * - Markdown rendering
 * - Character/line counts
 */

import { useState, useMemo } from 'react';
import { Eye, Edit3, Sparkles, Loader2, RefreshCw, Copy, Check, FileText, GitPullRequest } from 'lucide-react';
import { cn } from '../../lib/cn';
import { VStack, HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';
import { Surface } from '../../design-system/primitives/Surface';

interface PRPreviewProps {
  title: string;
  onTitleChange: (title: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  /** Commit messages to include in PR */
  commits?: Array<{ hash: string; message: string }>;
  /** Files changed */
  filesChanged?: number;
  /** Whether AI generation is available */
  canGenerate?: boolean;
  /** Whether AI is generating */
  isGenerating?: boolean;
  /** Callback to generate AI content */
  onGenerate?: () => void;
  className?: string;
}

export function PRPreview({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  commits = [],
  filesChanged = 0,
  canGenerate = false,
  isGenerating = false,
  onGenerate,
  className,
}: PRPreviewProps) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [copied, setCopied] = useState(false);

  // Stats
  const stats = useMemo(() => ({
    titleLength: title.length,
    descriptionLines: description.split('\n').length,
    descriptionChars: description.length,
  }), [title, description]);

  const copyAll = async () => {
    const content = `# ${title}\n\n${description}`;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  return (
    <Surface variant="default" padding="none" className={className}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <HStack gap={2} align="center">
          <GitPullRequest className="h-4 w-4 text-purple-400" />
          <Text variant="label" color="primary">
            Pull Request Preview
          </Text>
        </HStack>
        <HStack gap={2}>
          {/* AI Generate button */}
          {canGenerate && (
            <button
              onClick={onGenerate}
              disabled={isGenerating}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium',
                'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
                'hover:bg-purple-500/15 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Generate
                </>
              )}
            </button>
          )}

          {/* Mode toggle */}
          <div className="flex rounded-lg bg-white/5 p-0.5 ring-1 ring-white/10">
            <button
              onClick={() => setMode('edit')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                mode === 'edit'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={() => setMode('preview')}
              className={cn(
                'flex items-center gap-1 rounded-md px-2 py-1 text-xs',
                mode === 'preview'
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white/70'
              )}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          </div>

          {/* Copy button */}
          <button
            onClick={copyAll}
            className="rounded-lg p-1.5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
            title="Copy all"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </HStack>
      </div>

      {/* Content */}
      <div className="p-4">
        {mode === 'edit' ? (
          <VStack gap={4}>
            {/* Title input */}
            <VStack gap={1}>
              <HStack justify="between" align="center">
                <Text variant="labelSm" color="tertiary">
                  Title
                </Text>
                <Text variant="bodyXs" color="muted">
                  {stats.titleLength}/100
                </Text>
              </HStack>
              <input
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                placeholder="Add a descriptive title..."
                maxLength={100}
                className={cn(
                  'w-full rounded-xl bg-white/5 px-4 py-3 text-sm',
                  'text-white placeholder-white/30',
                  'ring-1 ring-white/10 focus:ring-white/20 focus:outline-none'
                )}
              />
            </VStack>

            {/* Description input */}
            <VStack gap={1}>
              <HStack justify="between" align="center">
                <Text variant="labelSm" color="tertiary">
                  Description
                </Text>
                <Text variant="bodyXs" color="muted">
                  {stats.descriptionLines} lines, {stats.descriptionChars} chars
                </Text>
              </HStack>
              <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                placeholder="Describe the changes in this PR..."
                rows={10}
                className={cn(
                  'w-full rounded-xl bg-white/5 px-4 py-3 text-sm resize-none',
                  'text-white placeholder-white/30 font-mono',
                  'ring-1 ring-white/10 focus:ring-white/20 focus:outline-none'
                )}
              />
            </VStack>
          </VStack>
        ) : (
          <VStack gap={4}>
            {/* Preview title */}
            <div className="border-b border-white/10 pb-3">
              <Text variant="h3" color="primary">
                {title || 'Untitled Pull Request'}
              </Text>
            </div>

            {/* Preview body */}
            <div className="prose prose-invert prose-sm max-w-none">
              {description ? (
                <pre className="whitespace-pre-wrap text-sm text-white/70 font-sans">
                  {description}
                </pre>
              ) : (
                <Text variant="bodySm" color="muted">
                  No description provided
                </Text>
              )}
            </div>
          </VStack>
        )}
      </div>

      {/* Footer with stats */}
      <div className="border-t border-white/10 px-4 py-3">
        <HStack justify="between" align="center">
          <HStack gap={4}>
            <HStack gap={1} align="center">
              <FileText className="h-3.5 w-3.5 text-white/40" />
              <Text variant="bodyXs" color="tertiary">
                {filesChanged} files changed
              </Text>
            </HStack>
            <HStack gap={1} align="center">
              <GitPullRequest className="h-3.5 w-3.5 text-white/40" />
              <Text variant="bodyXs" color="tertiary">
                {commits.length} commits
              </Text>
            </HStack>
          </HStack>

          {commits.length > 0 && commits.length <= 3 && (
            <div className="flex -space-x-1">
              {commits.slice(0, 3).map((commit, i) => (
                <div
                  key={commit.hash}
                  className="h-6 w-6 rounded-full bg-white/10 ring-2 ring-[#0d1117] flex items-center justify-center text-[10px] font-mono text-white/50"
                  title={commit.message}
                >
                  {commit.hash.slice(0, 2)}
                </div>
              ))}
            </div>
          )}
        </HStack>
      </div>
    </Surface>
  );
}

export type { PRPreviewProps };
