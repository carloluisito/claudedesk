import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Puzzle, Plus, ChevronDown, Info, Zap, Library } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useMCPServers } from '../../hooks/useMCPServers';
import { MCPServerCard } from './MCPServerCard';
import { AddEditServerModal } from './AddEditServerModal';
import { CatalogBrowserModal } from './CatalogBrowserModal';
import { MCPServerConfig } from '../../types/mcp';

interface MCPServersPanelProps {
  defaultOpen?: boolean;
}

export function MCPServersPanel({ defaultOpen = false }: MCPServersPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editingServer, setEditingServer] = useState<MCPServerConfig | null>(null);
  const prefersReduced = useReducedMotion();

  const {
    servers,
    statuses,
    settings,
    isLoading,
    connectServer,
    disconnectServer,
    deleteServer,
    updateSettings,
  } = useMCPServers();

  const connectedCount = Array.from(statuses.values()).filter(
    s => s.status === 'connected'
  ).length;

  const handleToggleGlobal = async () => {
    if (!settings) return;
    try {
      await updateSettings({ globalEnabled: !settings.globalEnabled });
    } catch (err) {
      console.error('Failed to toggle MCP global enabled:', err);
    }
  };

  const handleToggleApprovalMode = async () => {
    if (!settings) return;
    try {
      const newMode = settings.toolApprovalMode === 'auto' ? 'ask' : 'auto';
      await updateSettings({ toolApprovalMode: newMode });
    } catch (err) {
      console.error('Failed to toggle approval mode:', err);
    }
  };

  const handleEdit = (server: MCPServerConfig) => {
    setEditingServer(server);
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('Are you sure you want to delete this MCP server?')) return;
    try {
      await deleteServer(serverId);
    } catch (err) {
      console.error('Failed to delete server:', err);
    }
  };

  const handleConnect = async (serverId: string) => {
    try {
      await connectServer(serverId);
    } catch (err) {
      console.error('Failed to connect:', err);
    }
  };

  const handleDisconnect = async (serverId: string) => {
    try {
      await disconnectServer(serverId);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  return (
    <>
      <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Puzzle className="h-4 w-4 text-purple-400" />
              MCP Servers
            </div>
            <div className="flex items-center gap-2">
              {connectedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                  {connectedCount}/{servers.length}
                </span>
              )}
              <ChevronDown
                className={cn(
                  'h-5 w-5 text-white/40 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={prefersReduced ? {} : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={prefersReduced ? {} : { height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-0 space-y-4">
                {/* Info Banner */}
                <div className="flex gap-3 rounded-2xl bg-purple-500/10 p-3 ring-1 ring-purple-500/20">
                  <Info className="h-4 w-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-white/70 leading-relaxed">
                    MCP servers extend Claude with custom tools. Configure stdio (local commands) or SSE (HTTP endpoints) servers to add capabilities like database access, API integrations, or file operations.
                  </div>
                </div>

                {/* Global Settings */}
                {settings && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/80">Enable MCP Integration</span>
                      <button
                        onClick={handleToggleGlobal}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors',
                          settings.globalEnabled ? 'bg-emerald-500' : 'bg-white/10'
                        )}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white"
                          animate={{ x: settings.globalEnabled ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-white/40" />
                        <span className="text-sm text-white/80">Auto-approve tool calls</span>
                      </div>
                      <button
                        onClick={handleToggleApprovalMode}
                        disabled={!settings.globalEnabled}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors',
                          !settings.globalEnabled && 'opacity-50 cursor-not-allowed',
                          settings.toolApprovalMode === 'auto' ? 'bg-blue-500' : 'bg-white/10'
                        )}
                      >
                        <motion.div
                          className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white"
                          animate={{ x: settings.toolApprovalMode === 'auto' ? 20 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Server List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-white/60">Configured Servers</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowCatalogModal(true)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      >
                        <Library className="h-3.5 w-3.5" />
                        Browse Catalog
                      </button>
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Server
                      </button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-8 text-white/40 text-sm">
                      Loading servers...
                    </div>
                  ) : servers.length === 0 ? (
                    <div className="text-center py-8 text-white/40 text-sm">
                      No MCP servers configured. Add your first server to get started.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {servers.map(server => (
                        <MCPServerCard
                          key={server.id}
                          server={server}
                          status={statuses.get(server.id)}
                          onEdit={() => handleEdit(server)}
                          onDelete={() => handleDelete(server.id)}
                          onConnect={() => handleConnect(server.id)}
                          onDisconnect={() => handleDisconnect(server.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add/Edit Modal */}
      <AddEditServerModal
        isOpen={showAddModal || editingServer !== null}
        server={editingServer}
        onClose={() => {
          setShowAddModal(false);
          setEditingServer(null);
        }}
      />

      {/* Catalog Browser Modal */}
      <CatalogBrowserModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
      />
    </>
  );
}
