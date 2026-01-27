import { Bot, ChevronDown } from 'lucide-react';

interface AutoModeIndicatorProps {
  onClick: () => void;
  disabled?: boolean;
}

export function AutoModeIndicator({ onClick, disabled = false }: AutoModeIndicatorProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-2xl bg-white/5 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
      title="Click to select an agent"
    >
      <Bot className="h-3.5 w-3.5" />
      <span>@Agent</span>
      <ChevronDown className="h-3 w-3 text-white/50" />
    </button>
  );
}
