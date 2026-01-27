import { AlertTriangle } from 'lucide-react';

interface PreShipWarningsProps {
  warnings: string[];
}

export function PreShipWarnings({ warnings }: PreShipWarningsProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-sm font-semibold text-yellow-400">
        <AlertTriangle className="h-4 w-4" />
        Warnings
      </div>

      <div className="mt-3 space-y-2 text-xs">
        {warnings.map((warning, index) => (
          <div key={index} className="flex items-center gap-2 text-white/70">
            <AlertTriangle className="h-3 w-3 text-yellow-400 flex-shrink-0" />
            {warning}
          </div>
        ))}
      </div>
    </div>
  );
}
