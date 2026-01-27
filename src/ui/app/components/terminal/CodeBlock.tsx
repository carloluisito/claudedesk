import { memo, useMemo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language: string;
}

// Collapsible wrapper for long code blocks
function CollapsibleCodeWrapper({
  title,
  children,
  defaultOpen = false
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl my-2 overflow-hidden ring-1 ring-white/10 bg-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 bg-white/5 hover:bg-white/10 text-left text-sm text-white/70 transition-colors"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        <span className="font-mono">{title}</span>
      </button>
      {isOpen && (
        <div className="p-3 bg-black/20">
          {children}
        </div>
      )}
    </div>
  );
}

export const CodeBlock = memo(function CodeBlock({ code, language }: CodeBlockProps) {
  // Memoize the highlighted output based on code and language
  const highlightedCode = useMemo(() => (
    <SyntaxHighlighter
      style={oneDark as Record<string, React.CSSProperties>}
      language={language}
      PreTag="div"
      customStyle={{ margin: 0, borderRadius: '0.75rem', fontSize: '0.8rem' }}
    >
      {code}
    </SyntaxHighlighter>
  ), [code, language]);

  const lineCount = code.split('\n').length;
  const isLong = lineCount > 20;

  if (isLong) {
    return (
      <CollapsibleCodeWrapper title={`${language} (${lineCount} lines)`}>
        {highlightedCode}
      </CollapsibleCodeWrapper>
    );
  }

  return highlightedCode;
});

// Inline code component (for non-language-tagged code)
export const InlineCode = memo(function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-white/10 px-1.5 py-0.5 rounded-lg text-sm text-white/90 ring-1 ring-white/10">
      {children}
    </code>
  );
});
