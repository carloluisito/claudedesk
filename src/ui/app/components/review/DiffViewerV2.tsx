/**
 * DiffViewerV2 - Enhanced diff viewer with Shiki syntax highlighting
 *
 * Features:
 * - Shiki-powered syntax highlighting
 * - Unified and side-by-side view modes
 * - Line numbers with click-to-copy
 * - Language detection based on file extension
 */

import { useState, useMemo, useEffect } from 'react';
import { codeToHtml, type BundledLanguage } from 'shiki';
import { Copy, Check, Columns, List, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { HStack } from '../../design-system/primitives/Stack';
import { Text } from '../../design-system/primitives/Text';

export interface DiffLine {
  type: 'added' | 'removed' | 'context';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffViewerV2Props {
  /** File path for display and language detection */
  filePath: string;
  /** Language override (optional - detected from filePath if not provided) */
  language?: string;
  /** Pre-parsed diff lines */
  lines: DiffLine[];
  /** View mode */
  viewMode?: 'unified' | 'split';
  /** Callback when view mode changes */
  onViewModeChange?: (mode: 'unified' | 'split') => void;
  /** Max height before scrolling */
  maxHeight?: number;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Whether diff is loading */
  isLoading?: boolean;
  /** Custom class names */
  className?: string;
}

// Language detection from file extension
const extensionToLanguage: Record<string, BundledLanguage> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  mdx: 'mdx',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  fish: 'fish',
  ps1: 'powershell',
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  vue: 'vue',
  svelte: 'svelte',
  astro: 'astro',
  toml: 'toml',
  ini: 'ini',
  env: 'dotenv',
};

function getLanguageFromPath(filePath: string): BundledLanguage {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const filename = filePath.split('/').pop()?.toLowerCase() || '';

  // Special filenames
  if (filename === 'dockerfile') return 'dockerfile';
  if (filename === '.env' || filename.startsWith('.env.')) return 'dotenv';

  return extensionToLanguage[ext] || 'plaintext';
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function DiffViewerV2({
  filePath,
  language,
  lines,
  viewMode = 'unified',
  onViewModeChange,
  maxHeight = 600,
  showLineNumbers = true,
  isLoading = false,
  className,
}: DiffViewerV2Props) {
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const [highlightedHtml, setHighlightedHtml] = useState<Map<number, string>>(new Map());

  const detectedLanguage = useMemo(() => {
    if (language && extensionToLanguage[language]) {
      return extensionToLanguage[language];
    }
    return getLanguageFromPath(filePath);
  }, [filePath, language]);

  // Highlight all code lines
  useEffect(() => {
    if (lines.length === 0) {
      setHighlightedHtml(new Map());
      return;
    }

    const highlightAll = async () => {
      const newHtml = new Map<number, string>();

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.content) {
          try {
            const html = await codeToHtml(line.content || ' ', {
              lang: detectedLanguage,
              theme: 'github-dark-dimmed',
            });
            // Extract just the code content from Shiki's output
            const match = html.match(/<code[^>]*>([\s\S]*?)<\/code>/);
            newHtml.set(i, match ? match[1] : escapeHtml(line.content));
          } catch {
            newHtml.set(i, escapeHtml(line.content));
          }
        }
      }

      setHighlightedHtml(newHtml);
    };

    highlightAll();
  }, [lines, detectedLanguage]);

  const copyLine = async (lineIndex: number, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedLine(lineIndex);
      setTimeout(() => setCopiedLine(null), 2000);
    } catch (e) {
      console.error('Failed to copy:', e);
    }
  };

  if (isLoading) {
    return (
      <div className={cn('rounded-xl bg-[#22272e] ring-1 ring-white/10 overflow-hidden', className)}>
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <Text variant="codeSm" color="secondary" className="truncate">
            {filePath}
          </Text>
        </div>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className={cn('rounded-xl bg-[#22272e] ring-1 ring-white/10 overflow-hidden', className)}>
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <Text variant="codeSm" color="secondary" className="truncate">
            {filePath}
          </Text>
        </div>
        <div className="flex items-center justify-center h-32 text-white/40 text-sm">
          No changes in this file
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl bg-[#22272e] ring-1 ring-white/10 overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <Text variant="codeSm" color="secondary" className="truncate flex-1">
          {filePath}
        </Text>
        <HStack gap={1}>
          <button
            onClick={() => onViewModeChange?.('unified')}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              viewMode === 'unified'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            )}
            title="Unified view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange?.('split')}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              viewMode === 'split'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70'
            )}
            title="Side-by-side view"
          >
            <Columns className="h-4 w-4" />
          </button>
        </HStack>
      </div>

      {/* Diff content */}
      <div
        className="overflow-auto font-mono text-sm"
        style={{ maxHeight }}
      >
        {viewMode === 'unified' ? (
          <UnifiedView
            lines={lines}
            highlightedHtml={highlightedHtml}
            showLineNumbers={showLineNumbers}
            onCopyLine={copyLine}
            copiedLine={copiedLine}
          />
        ) : (
          <SplitView
            lines={lines}
            highlightedHtml={highlightedHtml}
            showLineNumbers={showLineNumbers}
            onCopyLine={copyLine}
            copiedLine={copiedLine}
          />
        )}
      </div>
    </div>
  );
}

// Unified diff view
interface ViewProps {
  lines: DiffLine[];
  highlightedHtml: Map<number, string>;
  showLineNumbers: boolean;
  onCopyLine: (index: number, content: string) => void;
  copiedLine: number | null;
}

function UnifiedView({ lines, highlightedHtml, showLineNumbers, onCopyLine, copiedLine }: ViewProps) {
  return (
    <table className="w-full border-collapse">
      <tbody>
        {lines.map((line, index) => (
          <tr
            key={index}
            className={cn(
              'group',
              line.type === 'added' && 'bg-emerald-500/10',
              line.type === 'removed' && 'bg-red-500/10'
            )}
          >
            {showLineNumbers && (
              <>
                <td className="w-10 select-none px-2 py-0.5 text-right text-white/30 text-xs">
                  {line.oldLineNumber ?? ''}
                </td>
                <td className="w-10 select-none px-2 py-0.5 text-right text-white/30 text-xs">
                  {line.newLineNumber ?? ''}
                </td>
              </>
            )}
            <td className="w-5 select-none px-1 py-0.5 text-center">
              <span
                className={cn(
                  'text-xs font-bold',
                  line.type === 'added' && 'text-emerald-400',
                  line.type === 'removed' && 'text-red-400'
                )}
              >
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ''}
              </span>
            </td>
            <td className="relative px-2 py-0.5">
              <span
                className={cn(
                  line.type === 'added' && 'text-emerald-300',
                  line.type === 'removed' && 'text-red-300',
                  line.type === 'context' && 'text-white/70'
                )}
                dangerouslySetInnerHTML={{
                  __html: highlightedHtml.get(index) || escapeHtml(line.content),
                }}
              />
              {/* Copy button */}
              <button
                onClick={() => onCopyLine(index, line.content)}
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-white/10"
              >
                {copiedLine === index ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3 text-white/40" />
                )}
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Side-by-side diff view
function SplitView({ lines, highlightedHtml, showLineNumbers, onCopyLine, copiedLine }: ViewProps) {
  // Group lines into pairs for side-by-side display
  const pairs: Array<{ left?: { line: DiffLine; index: number }; right?: { line: DiffLine; index: number } }> = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.type === 'context') {
      pairs.push({ left: { line, index: i }, right: { line, index: i } });
      i++;
    } else if (line.type === 'removed') {
      // Collect consecutive removes
      const removes: Array<{ line: DiffLine; index: number }> = [];
      while (i < lines.length && lines[i].type === 'removed') {
        removes.push({ line: lines[i], index: i });
        i++;
      }
      // Collect consecutive adds
      const adds: Array<{ line: DiffLine; index: number }> = [];
      while (i < lines.length && lines[i].type === 'added') {
        adds.push({ line: lines[i], index: i });
        i++;
      }
      // Pair them up
      const maxLen = Math.max(removes.length, adds.length);
      for (let j = 0; j < maxLen; j++) {
        pairs.push({
          left: removes[j],
          right: adds[j],
        });
      }
    } else if (line.type === 'added') {
      pairs.push({ right: { line, index: i } });
      i++;
    } else {
      i++;
    }
  }

  return (
    <div className="grid grid-cols-2 divide-x divide-white/10">
      {/* Left (old) */}
      <div>
        <table className="w-full border-collapse">
          <tbody>
            {pairs.map((pair, pairIndex) => (
              <SplitRow
                key={`l-${pairIndex}`}
                lineData={pair.left}
                side="left"
                highlightedHtml={highlightedHtml}
                showLineNumbers={showLineNumbers}
                onCopyLine={onCopyLine}
                copiedLine={copiedLine}
              />
            ))}
          </tbody>
        </table>
      </div>
      {/* Right (new) */}
      <div>
        <table className="w-full border-collapse">
          <tbody>
            {pairs.map((pair, pairIndex) => (
              <SplitRow
                key={`r-${pairIndex}`}
                lineData={pair.right}
                side="right"
                highlightedHtml={highlightedHtml}
                showLineNumbers={showLineNumbers}
                onCopyLine={onCopyLine}
                copiedLine={copiedLine}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SplitRow({
  lineData,
  side,
  highlightedHtml,
  showLineNumbers,
}: {
  lineData?: { line: DiffLine; index: number };
  side: 'left' | 'right';
  highlightedHtml: Map<number, string>;
  showLineNumbers: boolean;
  onCopyLine: (index: number, content: string) => void;
  copiedLine: number | null;
}) {
  if (!lineData) {
    return (
      <tr className="h-[24px]">
        {showLineNumbers && <td className="w-10 bg-white/5" />}
        <td className="bg-white/5" />
      </tr>
    );
  }

  const { line, index } = lineData;
  const lineNum = side === 'left' ? line.oldLineNumber : line.newLineNumber;

  return (
    <tr
      className={cn(
        'group',
        line.type === 'added' && 'bg-emerald-500/10',
        line.type === 'removed' && 'bg-red-500/10'
      )}
    >
      {showLineNumbers && (
        <td className="w-10 select-none px-2 py-0.5 text-right text-white/30 text-xs">
          {lineNum ?? ''}
        </td>
      )}
      <td className="relative px-2 py-0.5">
        <span
          className={cn(
            line.type === 'added' && 'text-emerald-300',
            line.type === 'removed' && 'text-red-300',
            line.type === 'context' && 'text-white/70'
          )}
          dangerouslySetInnerHTML={{
            __html: highlightedHtml.get(index) || escapeHtml(line.content),
          }}
        />
      </td>
    </tr>
  );
}

export type { DiffViewerV2Props };
