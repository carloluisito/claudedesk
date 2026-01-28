import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Puzzle, Loader2, Settings } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useMCPServers } from '../../hooks/useMCPServers';

export function MCPStatusIndicator() {
  const navigate = useNavigate();
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { servers, statuses, settings, isLoading } = useMCPServers();

  // Don't show indicator if MCP is globally disabled or no servers configured
  if (!settings?.globalEnabled || servers.length === 0 || isLoading) {
    return null;
  }

  const connectedCount = Array.from(statuses.values()).filter(
    s => s.status === 'connected'
  ).length;
  const connectingCount = Array.from(statuses.values()).filter(
    s => s.status === 'connecting'
  ).length;
  const errorCount = Array.from(statuses.values()).filter(
    s => s.status === 'error'
  ).length;

  const totalCount = servers.length;

  // Determine overall status color
  const getStatusColor = () => {
    if (errorCount === totalCount) {
      // All servers errored
      return 'bg-red-500/20 text-red-400 ring-red-500/30';
    } else if (connectedCount === 0 && connectingCount === 0) {
      // None connected or connecting
      return 'bg-red-500/20 text-red-400 ring-red-500/30';
    } else if (connectingCount > 0) {
      // Some connecting
      return 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30';
    } else if (connectedCount === totalCount) {
      // All connected
      return 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30';
    } else {
      // Some connected
      return 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30';
    }
  };

  const getStatusIndicator = () => {
    if (connectingCount > 0) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    } else if (connectedCount === totalCount && errorCount === 0) {
      // All connected - show pulsing dot
      return (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      );
    } else {
      return <Puzzle className="h-3 w-3" />;
    }
  };

  const handleClick = () => {
    setShowPopover(!showPopover);
  };

  const handleManageClick = () => {
    setShowPopover(false);
    navigate('/settings/integrations');
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        buttonRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition hover:opacity-80',
          getStatusColor()
        )}
        title="MCP Servers Status. Click to view details."
      >
        {getStatusIndicator()}
        <span className="hidden sm:inline">
          {connectedCount}/{totalCount}
        </span>
      </button>

      {/* Popover */}
      {showPopover && (
        <div
          ref={popoverRef}
          className="absolute top-full right-0 mt-2 w-72 rounded-2xl bg-[#0a0d14] ring-1 ring-white/10 shadow-xl backdrop-blur-xl z-50"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Puzzle className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium text-white">MCP Servers</span>
              </div>
              <span className="text-xs text-white/60">
                {connectedCount}/{totalCount} connected
              </span>
            </div>
          </div>

          {/* Server List */}
          <div className="max-h-64 overflow-y-auto p-2">
            {servers.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-white/40">
                No servers configured
              </div>
            ) : (
              <div className="space-y-1">
                {servers.map(server => {
                  const status = statuses.get(server.id);
                  const serverStatus = status?.status || 'disconnected';

                  return (
                    <div
                      key={server.id}
                      className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/[0.03] hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Status dot */}
                        <span
                          className={cn(
                            'flex-shrink-0 h-2 w-2 rounded-full',
                            serverStatus === 'connected' && 'bg-emerald-500',
                            serverStatus === 'connecting' && 'bg-yellow-500 animate-pulse',
                            serverStatus === 'error' && 'bg-red-500',
                            serverStatus === 'disconnected' && 'bg-white/30'
                          )}
                        />

                        {/* Server name */}
                        <span className="text-sm text-white/80 truncate">
                          {server.name}
                        </span>
                      </div>

                      {/* Tool count */}
                      {serverStatus === 'connected' && status?.tools && (
                        <span className="flex-shrink-0 text-xs text-white/40">
                          {status.tools.length} {status.tools.length === 1 ? 'tool' : 'tools'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t border-white/10">
            <button
              onClick={handleManageClick}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage Servers
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
