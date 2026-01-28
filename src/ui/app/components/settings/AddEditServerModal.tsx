import { useState, useEffect } from 'react';
import { X, Terminal, Globe, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { cn } from '../../lib/cn';
import { useMCPServers } from '../../hooks/useMCPServers';
import { MCPServerConfig, MCPTransport } from '../../types/mcp';

interface AddEditServerModalProps {
  isOpen: boolean;
  server: MCPServerConfig | null;
  onClose: () => void;
}

interface EnvVar {
  key: string;
  value: string;
}

export function AddEditServerModal({ isOpen, server, onClose }: AddEditServerModalProps) {
  const { createServer, updateServer } = useMCPServers();

  const [name, setName] = useState('');
  const [transport, setTransport] = useState<MCPTransport>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [cwd, setCwd] = useState('');
  const [url, setUrl] = useState('');
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [autoConnect, setAutoConnect] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or server changes
  useEffect(() => {
    if (isOpen) {
      if (server) {
        // Edit mode
        setName(server.name);
        setTransport(server.transport);
        setCommand(server.command || '');
        setArgs(server.args?.join(' ') || '');
        setCwd(server.cwd || '');
        setUrl(server.url || '');
        setEnvVars(
          server.env
            ? Object.entries(server.env).map(([key, value]) => ({ key, value }))
            : []
        );
        setAutoConnect(server.autoConnect);
        setEnabled(server.enabled);
      } else {
        // Add mode - reset
        setName('');
        setTransport('stdio');
        setCommand('');
        setArgs('');
        setCwd('');
        setUrl('');
        setEnvVars([]);
        setAutoConnect(true);
        setEnabled(true);
      }
      setError(null);
    }
  }, [isOpen, server]);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleUpdateEnvVar = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...envVars];
    updated[index][field] = value;
    setEnvVars(updated);
  };

  const handleSave = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Server name is required');
      return;
    }

    if (transport === 'stdio' && !command.trim()) {
      setError('Command is required for stdio transport');
      return;
    }

    if (transport === 'sse' && !url.trim()) {
      setError('URL is required for SSE transport');
      return;
    }

    // Build env object
    const env: Record<string, string> = {};
    for (const { key, value } of envVars) {
      if (key.trim()) {
        env[key.trim()] = value;
      }
    }

    const config: Partial<MCPServerConfig> = {
      name: name.trim(),
      transport,
      enabled,
      autoConnect,
    };

    if (transport === 'stdio') {
      config.command = command.trim();
      config.args = args.trim() ? args.trim().split(/\s+/) : [];
      config.cwd = cwd.trim() || undefined;
    } else {
      config.url = url.trim();
    }

    if (Object.keys(env).length > 0) {
      config.env = env;
    }

    try {
      setIsSaving(true);

      if (server) {
        // Update existing
        await updateServer(server.id, config);
      } else {
        // Create new
        await createServer(config as Omit<MCPServerConfig, 'id' | 'createdAt'>);
      }

      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save server';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={server ? 'Edit MCP Server' : 'Add MCP Server'}
      size="large"
    >
      <div className="space-y-4">
        {/* Server Name */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">
            Server Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My MCP Server"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none"
          />
        </div>

        {/* Transport Type */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">
            Transport Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setTransport('stdio')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                transport === 'stdio'
                  ? 'bg-purple-500/20 text-purple-400 ring-1 ring-purple-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              <Terminal className="h-4 w-4" />
              Stdio (Command)
            </button>
            <button
              onClick={() => setTransport('sse')}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                transport === 'sse'
                  ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              )}
            >
              <Globe className="h-4 w-4" />
              SSE (HTTP)
            </button>
          </div>
        </div>

        {/* Stdio Configuration */}
        {transport === 'stdio' && (
          <>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Command <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="node"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Arguments
              </label>
              <input
                type="text"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder="/path/to/server.js --option value"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none font-mono"
              />
              <p className="mt-1 text-xs text-white/40">
                Space-separated arguments
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Working Directory
              </label>
              <input
                type="text"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                placeholder="/path/to/directory"
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none font-mono"
              />
            </div>
          </>
        )}

        {/* SSE Configuration */}
        {transport === 'sse' && (
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Server URL <span className="text-red-400">*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:3000/mcp"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none font-mono"
            />
          </div>
        )}

        {/* Environment Variables */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-white/80">
              Environment Variables
            </label>
            <button
              onClick={handleAddEnvVar}
              className="flex items-center gap-1 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Plus className="h-3 w-3" />
              Add
            </button>
          </div>

          {envVars.length > 0 ? (
            <div className="space-y-2">
              {envVars.map((envVar, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={envVar.key}
                    onChange={(e) => handleUpdateEnvVar(index, 'key', e.target.value)}
                    placeholder="KEY"
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none font-mono"
                  />
                  <input
                    type="text"
                    value={envVar.value}
                    onChange={(e) => handleUpdateEnvVar(index, 'value', e.target.value)}
                    placeholder="value"
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-purple-500 focus:outline-none font-mono"
                  />
                  <button
                    onClick={() => handleRemoveEnvVar(index)}
                    className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/40 py-2">
              No environment variables configured
            </p>
          )}
        </div>

        {/* Options */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-white/80">Enable server</span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={autoConnect}
              onChange={(e) => setAutoConnect(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0"
            />
            <span className="text-sm text-white/80">Auto-connect on startup</span>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700/50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-xl bg-purple-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : server ? 'Save Changes' : 'Add Server'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
