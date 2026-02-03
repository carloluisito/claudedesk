import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/cn';

interface PhaseIndicatorStripProps {
  currentPhase: 'prompt' | 'review' | 'ship';
}

interface Phase {
  id: 'prompt' | 'review' | 'ship';
  label: string;
  color: string;
}

const phases: Phase[] = [
  { id: 'prompt', label: 'Prompt', color: 'text-blue-300' },
  { id: 'review', label: 'Review', color: 'text-emerald-300' },
  { id: 'ship', label: 'Ship', color: 'text-purple-300' },
];

export function PhaseIndicatorStrip({ currentPhase }: PhaseIndicatorStripProps) {
  return (
    <div
      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/[0.02] ring-1 ring-white/[0.06]"
      role="navigation"
      aria-label="Workflow phases"
    >
      {phases.map((phase, index) => {
        const isActive = phase.id === currentPhase;
        const isPast =
          phases.findIndex((p) => p.id === currentPhase) >
          phases.findIndex((p) => p.id === phase.id);

        return (
          <React.Fragment key={phase.id}>
            {/* Phase indicator */}
            <div className="flex items-center gap-2">
              {/* Dot */}
              <div
                className={cn(
                  'h-2 w-2 rounded-full transition-colors duration-200',
                  isActive || isPast
                    ? phase.color.replace('text-', 'bg-')
                    : 'bg-white/20'
                )}
                aria-hidden="true"
              />
              {/* Label */}
              <span
                className={cn(
                  'text-xs font-medium transition-colors duration-200',
                  isActive ? phase.color : 'text-white/40'
                )}
              >
                {phase.label}
              </span>
            </div>

            {/* Separator */}
            {index < phases.length - 1 && (
              <ChevronRight className="h-3 w-3 text-white/20" aria-hidden="true" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
