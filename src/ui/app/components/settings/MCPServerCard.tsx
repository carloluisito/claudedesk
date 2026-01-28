import { useState } from 'react';
import { MoreVertical, Terminal, Globe, Edit2, Trash2, Power, RotateCw, Wrench } from 'lucide-react';
import { cn } from '../../lib/cn';
import { MCPServerConfig, MCPServerStatus } from '../../types/mcp';

interface MCPServerCardProps {
  server: MCPServerConfig;
  status?: MCPServerStatus;
  onEdit: () => void;
  onDelete: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export function MCPServerCard({
  server,
  status,
  onEdit,
  onDelete,
  onConnect,
  onDisconnect,
}: MCPServerCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const connectionStatus = status?.status || 'disconnected';
  const toolCount = status?.tools?.length || 0;

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-emerald-500';
      case 'connecting':
        return 'bg-yellow-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-white/50';
    }
  };

  const getStatusLabel = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      default:
        return 'Disconnected';
    }
  };

  const handleToggleConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (connectionStatus === 'connected') {
      await onDisconnect();
    } else if (connectionStatus !== 'connecting') {
      await onConnect();
    }
  };

  return (
    <div className="relative rounded-2xl bg-white/5 ring-1 ring-white/10 p-3 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-start gap-3">
        {/* Status Indicator */}
        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 flex-shrink-0">
          {server.transport === 'stdio' ? (
            <Terminal className="h-5 w-5 text-purple-400" />
          ) : (
            <Globe className="h-5 w-5 text-blue-400" />
          )}
        </div>

        {/* Server Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-white truncate">{server.name}</h3>
            <div className={cn('h-2 w-2 rounded-full', getStatusColor())} />
          </div>

          <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
            <span className="capitalize">{server.transport}</span>
            <span>•</span>
            <span>{getStatusLabel()}</span>
            {toolCount > 0 && (
              <>
                <span>•</span>
                <span>{toolCount} tool{toolCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>

          {/* Endpoint/Command */}
          <div className="mt-1.5 text-xs text-white/40 font-mono truncate">
            {server.transport === 'stdio' ? server.command : server.url}
          </div>

          {/* Error Message */}
          {status?.error && (
            <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
              {status.error}
            </div>
          )}
        </div>

        {/* Actions Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center justify-center h-8 w-8 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreVertical className="h-4 w-4 text-white/60" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-zinc-900 ring-1 ring-white/10 shadow-lg z-20 overflow-hidden">
                {connectionStatus === 'disconnected' && (
                  <button
                    onClick={(e) => {
                      handleToggleConnection(e);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                  >
                    <Power className="h-4 w-4" />
                    Connect
                  </button>
                )}

                {connectionStatus === 'connected' && (
                  <button
                    onClick={(e) => {
                      handleToggleConnection(e);
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                  >
                    <Power className="h-4 w-4" />
                    Disconnect
                  </button>
                )}

                {(connectionStatus === 'error' || connectionStatus === 'connected') && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (connectionStatus === 'connected') {
                        await onDisconnect();
                      }
                      await onConnect();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                  >
                    <RotateCw className="h-4 w-4" />
                    Restart
                  </button>
                )}

                {status?.tools && status.tools.length > 0 && (
                  <button
                    onClick={() => {
                      // TODO: Show tools modal
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                  >
                    <Wrench className="h-4 w-4" />
                    View Tools ({status.tools.length})
                  </button>
                )}

                <div className="border-t border-white/10" />

                <button
                  onClick={() => {
                    onEdit();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </button>

                <button
                  onClick={() => {
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
