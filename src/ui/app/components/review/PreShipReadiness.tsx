import { ShieldCheck, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ReadinessItem {
  label: string;
  status: 'pass' | 'fail' | 'pending' | 'not_run';
  detail?: string;
}

interface PreShipReadinessProps {
  filesApproved: number;
  totalFiles: number;
  items?: ReadinessItem[];
}

export function PreShipReadiness({
  filesApproved,
  totalFiles,
  items = [],
}: PreShipReadinessProps) {
  const allFilesApproved = filesApproved === totalFiles && totalFiles > 0;

  return (
    <div className="rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
      <div className="flex items-center gap-2 text-sm font-semibold text-white">
        <ShieldCheck className="h-4 w-4" />
        Readiness
      </div>

      <div className="mt-3 space-y-2 text-sm">
        {/* Files approved row */}
        <div className="flex items-center justify-between">
          <span className="text-white/60">Files approved</span>
          <span
            className={cn(
              'flex items-center gap-1',
              allFilesApproved ? 'text-emerald-400' : 'text-yellow-400'
            )}
          >
            {allFilesApproved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {filesApproved} / {totalFiles}
          </span>
        </div>

        {/* Additional readiness items */}
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-white/60">{item.label}</span>
            <span
              className={cn(
                'flex items-center gap-1',
                item.status === 'pass' && 'text-emerald-400',
                item.status === 'fail' && 'text-red-400',
                item.status === 'pending' && 'text-yellow-400',
                item.status === 'not_run' && 'text-white/40'
              )}
            >
              {item.status === 'pass' && <CheckCircle2 className="h-4 w-4" />}
              {item.status === 'fail' && <XCircle className="h-4 w-4" />}
              {item.status === 'pending' && <Loader2 className="h-4 w-4 animate-spin" />}
              {item.detail || (item.status === 'not_run' ? 'Not run' : item.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
