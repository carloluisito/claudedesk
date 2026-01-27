import { useState, useEffect } from 'react';
import { Folder, ChevronRight, Home, HardDrive, ArrowLeft, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { api } from '../../lib/api';
import { cn } from '../../lib/cn';

interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface BrowseDirectoriesResponse {
  currentPath: string | null;
  parentPath: string | null;
  entries: DirectoryEntry[];
}

interface DirectoryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function DirectoryPicker({ isOpen, onClose, onSelect, initialPath }: DirectoryPickerProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualPath, setManualPath] = useState('');
  const [isWindows, setIsWindows] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialPath) {
        loadDirectory(initialPath);
      } else {
        loadDirectory(null);
      }
    }
  }, [isOpen, initialPath]);

  const loadDirectory = async (path: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const response = await api<BrowseDirectoriesResponse>(
        'GET',
        `/settings/browse-directories${params}`
      );

      setCurrentPath(response.currentPath);
      setParentPath(response.parentPath);
      setEntries(response.entries);

      // Detect platform based on starting points (drive letters = Windows)
      if (!response.currentPath && response.entries.length > 0) {
        const hasWindowsDrives = response.entries.some(e => /^[A-Z]:$/.test(e.name));
        setIsWindows(hasWindowsDrives);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDirectory = (entry: DirectoryEntry) => {
    loadDirectory(entry.path);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
    }
  };

  const handleGoToStartingPoints = () => {
    loadDirectory(null);
  };

  const handleConfirmSelection = () => {
    if (currentPath) {
      onSelect(currentPath);
      onClose();
    }
  };

  const handleManualPathSubmit = () => {
    if (manualPath.trim()) {
      loadDirectory(manualPath.trim());
      setManualPath('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Browse for Folder">
      <div className="space-y-4">
        {/* Manual path input */}
        <div className="space-y-2">
          <label className="text-xs text-white/60">Or enter path manually:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualPath}
              onChange={(e) => setManualPath(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualPathSubmit()}
              placeholder={isWindows ? "e.g., C:\\Users\\username\\repos" : "e.g., /home/username/repos"}
              className="flex-1 rounded-xl bg-white/5 px-3 py-2 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:ring-white/20 focus:outline-none"
            />
            <button
              onClick={handleManualPathSubmit}
              className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white/90"
            >
              Go
            </button>
          </div>
        </div>

        {/* Current path display */}
        {currentPath && (
          <div className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
            <div className="text-xs text-white/40">Current location:</div>
            <div className="text-sm text-white/80 font-mono break-all">{currentPath}</div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-2">
          {parentPath && (
            <button
              onClick={handleGoUp}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white/90 disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Up
            </button>
          )}
          {currentPath && (
            <button
              onClick={handleGoToStartingPoints}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white/90 disabled:opacity-50"
            >
              <Home className="h-4 w-4" />
              Start
            </button>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-400 ring-1 ring-red-500/20">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Directory list */}
        <div className="space-y-2">
          <label className="text-xs text-white/60">
            {currentPath ? 'Folders in this location:' : 'Select a starting location:'}
          </label>
          <div className="max-h-96 overflow-y-auto rounded-xl bg-white/5 ring-1 ring-white/10">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              </div>
            ) : entries.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-white/40">
                No folders found
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {entries.map((entry) => (
                  <button
                    key={entry.path}
                    onClick={() => handleSelectDirectory(entry)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    {currentPath ? (
                      <Folder className="h-4 w-4 flex-shrink-0 text-white/40" />
                    ) : (
                      <HardDrive className="h-4 w-4 flex-shrink-0 text-white/40" />
                    )}
                    <span className="flex-1 truncate text-sm text-white/80">
                      {entry.name}
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/30" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-white/5 py-2.5 text-sm font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmSelection}
            disabled={!currentPath}
            className={cn(
              "flex-1 rounded-2xl py-2.5 text-sm font-semibold transition",
              currentPath
                ? "bg-white text-black hover:opacity-90"
                : "bg-white/20 text-white/40 cursor-not-allowed"
            )}
          >
            Select This Folder
          </button>
        </div>
      </div>
    </Modal>
  );
}
