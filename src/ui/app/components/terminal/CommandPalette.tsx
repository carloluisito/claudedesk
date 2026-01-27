import { useState, useEffect, useRef, useMemo } from 'react';
import { Command } from 'lucide-react';
import { cn } from '../../lib/cn';
import { PALETTE_COMMANDS } from '../../hooks/useTerminal';

// Icon map for dynamic icon rendering
import {
  RefreshCw,
  HelpCircle,
  Trash2,
  Eye,
  MessageSquare,
  FileText,
  Sparkles,
  Code,
  Zap,
  MoreVertical,
  FileDown,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  RefreshCw,
  HelpCircle,
  Trash2,
  Eye,
  MessageSquare,
  FileText,
  Sparkles,
  Code,
  Zap,
  MoreVertical,
  FileDown,
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (command: string) => void;
  setMode: (mode: 'plan' | 'direct') => void;
}

export function CommandPalette({ isOpen, onClose, onSelect, setMode }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCommands = useMemo(() => {
    if (!search) return PALETTE_COMMANDS;
    const lower = search.toLowerCase();
    return PALETTE_COMMANDS.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lower) || cmd.desc.toLowerCase().includes(lower)
    );
  }, [search]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands.length]);

  const handleSelect = (cmd: (typeof PALETTE_COMMANDS)[number]) => {
    if (cmd.id === 'plan') {
      setMode('plan');
      onClose();
    } else if (cmd.id === 'direct') {
      setMode('direct');
      onClose();
    } else {
      onSelect(cmd.label);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-700 px-4 py-3">
          <Command className="h-5 w-5 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
              }
              if (e.key === 'Enter' && filteredCommands.length > 0) {
                handleSelect(filteredCommands[selectedIndex]);
              }
            }}
          />
          <kbd className="px-2 py-1 text-xs bg-zinc-800 rounded text-zinc-400">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredCommands.map((cmd, index) => {
            const IconComponent = iconMap[cmd.icon];
            return (
              <button
                key={cmd.id}
                onClick={() => handleSelect(cmd)}
                className={cn(
                  'flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left',
                  index === selectedIndex ? 'bg-zinc-700' : 'hover:bg-zinc-800'
                )}
              >
                {IconComponent && <IconComponent className="h-4 w-4 text-zinc-400" />}
                <div className="flex-1">
                  <p className="text-sm text-zinc-100 font-medium">{cmd.label}</p>
                  <p className="text-xs text-zinc-500">{cmd.desc}</p>
                </div>
              </button>
            );
          })}
          {filteredCommands.length === 0 && (
            <p className="text-center text-zinc-500 text-sm py-4">No commands found</p>
          )}
        </div>
      </div>
    </div>
  );
}
