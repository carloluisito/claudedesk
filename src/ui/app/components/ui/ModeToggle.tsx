import { Shield, Wand2 } from 'lucide-react';

interface ModeToggleProps {
  mode: 'plan' | 'direct';
  onToggle: () => void;
  showShortcut?: boolean;
}

export function ModeToggle({ mode, onToggle, showShortcut = true }: ModeToggleProps) {
  const isPlan = mode === 'plan';

  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm text-white ring-1 ring-white/10 hover:bg-white/10"
    >
      {isPlan ? <Shield className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
      <span className="font-medium">{isPlan ? 'Plan' : 'Direct'} Mode</span>
      {showShortcut && (
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/60 ring-1 ring-white/10">
          Ctrl Shift P
        </span>
      )}
    </button>
  );
}
