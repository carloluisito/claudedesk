import { GlassCard } from '../ui/GlassCard';

export function ClaudeHintCard() {
  return (
    <GlassCard padding="lg">
      <p className="text-xs text-white/60">
        Tip: Logs and signals are shared with Claude to improve debugging accuracy.
      </p>
    </GlassCard>
  );
}
