import { useState } from 'react';
import { ExternalLink, Copy, Check, Cloud } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface Port {
  port: number;
  localUrl?: string;
  tunnelUrl?: string;
}

interface ExposedPortsCardProps {
  ports: Port[];
}

export function ExposedPortsCard({ ports }: ExposedPortsCardProps) {
  const [copiedPort, setCopiedPort] = useState<number | null>(null);

  const handleCopy = async (port: Port) => {
    const url = port.tunnelUrl || port.localUrl || `http://localhost:${port.port}`;
    await navigator.clipboard.writeText(url);
    setCopiedPort(port.port);
    setTimeout(() => setCopiedPort(null), 2000);
  };

  const handleOpen = (port: Port) => {
    const url = port.tunnelUrl || port.localUrl || `http://localhost:${port.port}`;
    window.open(url, '_blank');
  };

  return (
    <GlassCard padding="lg">
      <div className="text-sm font-semibold text-white">Exposed Ports</div>

      <div className="mt-3 space-y-2 text-sm">
        {ports.length > 0 ? (
          ports.map((port) => (
            <div
              key={port.port}
              className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2 ring-1 ring-white/10"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-white">{port.port}</span>
                {port.tunnelUrl && (
                  <Cloud className="h-3 w-3 text-orange-400 flex-shrink-0" title="Tunnel active" />
                )}
                {port.tunnelUrl && (
                  <span className="text-xs text-white/40 truncate max-w-[120px]" title={port.tunnelUrl}>
                    {new URL(port.tunnelUrl).hostname}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCopy(port)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white transition"
                  title="Copy URL"
                >
                  {copiedPort === port.port ? (
                    <Check className="h-3 w-3 text-green-400" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                <button
                  onClick={() => handleOpen(port)}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white transition"
                  title="Open in browser"
                >
                  Open
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-black/30 px-3 py-3 ring-1 ring-white/10 text-center text-white/40">
            No ports exposed
          </div>
        )}
      </div>
    </GlassCard>
  );
}
