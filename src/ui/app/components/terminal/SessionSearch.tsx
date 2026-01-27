import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, User, MessageSquare, BookmarkCheck } from 'lucide-react';
import { useTerminalStore, SearchResult } from '../../store/terminalStore';
import { cn } from '../../lib/cn';

interface SessionSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (sessionId: string, messageId: string) => void;
}

export function SessionSearch({ isOpen, onClose, onSelectResult }: SessionSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    searchResults,
    isSearching,
    searchSessions,
    clearSearchResults,
  } = useTerminalStore();

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      clearSearchResults();
      return;
    }

    const timer = setTimeout(() => {
      searchSessions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchSessions, clearSearchResults]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      clearSearchResults();
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, clearSearchResults]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, searchResults.length - 1));
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
      return;
    }

    if (e.key === 'Enter' && searchResults.length > 0) {
      e.preventDefault();
      const result = searchResults[selectedIndex];
      if (result) {
        onSelectResult(result.sessionId, result.messageId);
        onClose();
      }
    }
  }, [searchResults, selectedIndex, onSelectResult, onClose]);

  // Handle click outside
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-zinc-900 rounded-lg border border-zinc-700 shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="h-5 w-5 text-zinc-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all sessions..."
            className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-500 outline-none text-lg"
          />
          {isSearching && <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {!query.trim() ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Type to search across all session messages</p>
              <p className="text-sm mt-1 text-zinc-600">Press Esc to close</p>
            </div>
          ) : searchResults.length === 0 && !isSearching ? (
            <div className="px-4 py-8 text-center text-zinc-500">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <button
                  key={`${result.sessionId}-${result.messageId}`}
                  onClick={() => {
                    onSelectResult(result.sessionId, result.messageId);
                    onClose();
                  }}
                  className={cn(
                    'w-full px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors',
                    index === selectedIndex && 'bg-zinc-800'
                  )}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
                    {result.role === 'user' ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5" />
                    )}
                    <span className="capitalize">{result.role}</span>
                    <span className="text-zinc-600">in</span>
                    <span className="text-zinc-300">{result.sessionName || result.repoIds[0]}</span>
                    {result.isBookmarked && (
                      <BookmarkCheck className="h-3.5 w-3.5 text-yellow-500" />
                    )}
                    <span className="text-zinc-600 ml-auto">
                      {new Date(result.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Content snippet */}
                  <div className="text-sm text-zinc-300 line-clamp-2">
                    {highlightMatch(result.content, query)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-800 text-xs text-zinc-500 flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Enter</kbd> to select</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd> to navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}

// Helper to highlight matching text
function highlightMatch(content: string, query: string): React.ReactNode {
  if (!query.trim()) return content;

  const lowerContent = content.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const matchIndex = lowerContent.indexOf(lowerQuery);

  if (matchIndex === -1) return content;

  const before = content.slice(0, matchIndex);
  const match = content.slice(matchIndex, matchIndex + query.length);
  const after = content.slice(matchIndex + query.length);

  return (
    <>
      {before}
      <span className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">{match}</span>
      {after}
    </>
  );
}
