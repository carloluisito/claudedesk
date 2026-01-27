import { useNavigate } from 'react-router-dom';
import { Globe, Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useRemoteAccess } from '../../hooks/useRemoteAccess';

export function TunnelStatusIndicator() {
  const navigate = useNavigate();
  const { status } = useRemoteAccess();

  // Don't show indicator if tunnel is disabled or stopped
  if (!status || !status.enabled || status.status === 'stopped') {
    return null;
  }

  const handleClick = () => {
    navigate('/settings/integrations');
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'running':
        return 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30';
      case 'starting':
        return 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 ring-red-500/30';
      default:
        return 'bg-white/10 text-white/60 ring-white/10';
    }
  };

  const getStatusLabel = () => {
    switch (status.status) {
      case 'running':
        return 'Remote';
      case 'starting':
        return 'Starting...';
      case 'error':
        return 'Error';
      default:
        return 'Remote';
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition hover:opacity-80',
        getStatusColor()
      )}
      title={`Remote access ${status.status}. Click to manage.`}
    >
      {status.status === 'starting' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : status.status === 'running' ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      ) : (
        <Globe className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">{getStatusLabel()}</span>
    </button>
  );
}
