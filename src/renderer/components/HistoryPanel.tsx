/**
 * History Panel - Session history viewer, search, and export
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useHistory } from '../hooks/useHistory';
import type {
  HistorySessionEntry,
  HistorySearchResult,
  HistorySettings,
  HistoryStats,
} from '../../shared/types/history-types';
import { ConfirmDialog } from './ui/ConfirmDialog';
import './HistoryPanel.css';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActiveTab = 'search' | 'browse' | 'settings';

export function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [searchResults, setSearchResults] = useState<HistorySearchResult[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionContent, setSessionContent] = useState<string>('');
  const [settings, setSettings] = useState<HistorySettings | null>(null);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const history = useHistory();

  // Load sessions and stats on mount
  useEffect(() => {
    if (isOpen) {
      history.loadSessions();
      loadSettings();
      loadStats();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    const data = await history.getSettings();
    if (data) setSettings(data);
  };

  const loadStats = async () => {
    const data = await history.getStats();
    if (data) setStats(data);
  };

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const results = await history.searchHistory(searchQuery, useRegex);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [searchQuery, useRegex]); // Removed 'history' from deps

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleViewSession = useCallback(
    async (sessionId: string) => {
      setSelectedSession(sessionId);
      const content = await history.getSessionContent(sessionId);
      setSessionContent(content);
    },
    [history]
  );

  const handleCloseSessionView = useCallback(() => {
    setSelectedSession(null);
    setSessionContent('');
  }, []);

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      const success = await history.deleteSession(sessionId);
      if (success) {
        setShowDeleteConfirm(null);
        if (selectedSession === sessionId) {
          handleCloseSessionView();
        }
        await loadStats();
      }
    },
    [history, selectedSession, handleCloseSessionView]
  );

  const handleDeleteAll = useCallback(async () => {
    const success = await history.deleteAllSessions();
    if (success) {
      setShowDeleteAllConfirm(false);
      setSearchResults([]);
      handleCloseSessionView();
      await loadStats();
    }
  }, [history, handleCloseSessionView]);

  const handleExportMarkdown = useCallback(
    async (sessionId: string) => {
      const session = history.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      // Generate default filename
      const sanitizedName = session.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const timestamp = new Date(session.createdAt).toISOString().split('T')[0];
      const defaultPath = `${sanitizedName}_${timestamp}.md`;

      // Use native file picker (this would need to be implemented via IPC)
      // For now, use a fixed path in user's home directory
      const outputPath = defaultPath; // TODO: Add file picker dialog

      const success = await history.exportMarkdown(sessionId, outputPath);
      if (success) {
        alert(`Exported to: ${outputPath}`);
      }
    },
    [history]
  );

  const handleExportJson = useCallback(
    async (sessionId: string) => {
      const session = history.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const sanitizedName = session.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      const timestamp = new Date(session.createdAt).toISOString().split('T')[0];
      const defaultPath = `${sanitizedName}_${timestamp}.json`;

      const success = await history.exportJson(sessionId, defaultPath);
      if (success) {
        alert(`Exported to: ${defaultPath}`);
      }
    },
    [history]
  );

  const handleUpdateSettings = useCallback(
    async (updates: Partial<HistorySettings>) => {
      const success = await history.updateSettings(updates);
      if (success) {
        setSettings((prev) => (prev ? { ...prev, ...updates } : null));
      }
    },
    [history]
  );

  // Format date for display
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Format size for display
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="history-overlay" onClick={handleOverlayClick}>
        <div className="history-dialog" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="history-header">
            <h2>Session History</h2>
            <button className="close-btn" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="history-tabs">
            <button
              className={`history-tab ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Search
            </button>
            <button
              className={`history-tab ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              Browse
            </button>
            <button
              className={`history-tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
              </svg>
              Settings
            </button>
          </div>

          {/* Content */}
          <div className="history-content">
            {activeTab === 'search' && (
              <SearchTab
                query={searchQuery}
                onQueryChange={setSearchQuery}
                useRegex={useRegex}
                onUseRegexChange={setUseRegex}
                results={searchResults}
                isSearching={isSearching}
                onViewSession={handleViewSession}
                onDeleteSession={(id) => setShowDeleteConfirm(id)}
                onExportMarkdown={handleExportMarkdown}
                onExportJson={handleExportJson}
              />
            )}

            {activeTab === 'browse' && (
              <BrowseTab
                sessions={history.sessions}
                isLoading={history.isLoading}
                onViewSession={handleViewSession}
                onDeleteSession={(id) => setShowDeleteConfirm(id)}
                onExportMarkdown={handleExportMarkdown}
                onExportJson={handleExportJson}
                formatDate={formatDate}
                formatSize={formatSize}
              />
            )}

            {activeTab === 'settings' && settings && (
              <SettingsTab
                settings={settings}
                stats={stats}
                onUpdateSettings={handleUpdateSettings}
                onDeleteAll={() => setShowDeleteAllConfirm(true)}
                formatSize={formatSize}
                formatDate={formatDate}
              />
            )}
          </div>

          {/* Footer with stats */}
          {stats && (
            <div className="history-footer">
              <span>{stats.totalSessions} sessions</span>
              <span>{formatSize(stats.totalSizeBytes)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Session viewer modal */}
      {selectedSession && (
        <SessionViewer
          session={history.sessions.find((s) => s.id === selectedSession) || null}
          content={sessionContent}
          onClose={handleCloseSessionView}
          onExportMarkdown={() => handleExportMarkdown(selectedSession)}
          onExportJson={() => handleExportJson(selectedSession)}
          formatDate={formatDate}
          formatSize={formatSize}
        />
      )}

      {/* Delete confirmation dialogs */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Session History?"
          message="This will permanently delete the history for this session. This action cannot be undone."
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => handleDeleteSession(showDeleteConfirm)}
          onCancel={() => setShowDeleteConfirm(null)}
          isDangerous={true}
        />
      )}

      {showDeleteAllConfirm && (
        <ConfirmDialog
          isOpen={true}
          title="Delete All History?"
          message="This will permanently delete all session history. This action cannot be undone."
          confirmLabel="Delete All"
          cancelLabel="Cancel"
          onConfirm={handleDeleteAll}
          onCancel={() => setShowDeleteAllConfirm(false)}
          isDangerous={true}
        />
      )}
    </>
  );
}

// Search Tab Component
interface SearchTabProps {
  query: string;
  onQueryChange: (q: string) => void;
  useRegex: boolean;
  onUseRegexChange: (use: boolean) => void;
  results: HistorySearchResult[];
  isSearching: boolean;
  onViewSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onExportMarkdown: (id: string) => void;
  onExportJson: (id: string) => void;
}

function SearchTab({
  query,
  onQueryChange,
  useRegex,
  onUseRegexChange,
  results,
  isSearching,
  onViewSession,
  onDeleteSession,
  onExportMarkdown,
  onExportJson,
}: SearchTabProps) {
  return (
    <div className="search-tab">
      <div className="search-input-group">
        <input
          type="text"
          className="search-input"
          placeholder="Search session history..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          autoFocus
        />
        <label className="regex-toggle">
          <input type="checkbox" checked={useRegex} onChange={(e) => onUseRegexChange(e.target.checked)} />
          <span>Regex</span>
        </label>
      </div>

      {isSearching && <div className="search-loading">Searching...</div>}

      {!isSearching && query && results.length === 0 && (
        <div className="search-empty">No matches found</div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="search-results">
          {results.map((result) => (
            <SearchResultCard
              key={result.session.id}
              result={result}
              onView={() => onViewSession(result.session.id)}
              onDelete={() => onDeleteSession(result.session.id)}
              onExportMarkdown={() => onExportMarkdown(result.session.id)}
              onExportJson={() => onExportJson(result.session.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Search Result Card
interface SearchResultCardProps {
  result: HistorySearchResult;
  onView: () => void;
  onDelete: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}

function SearchResultCard({
  result,
  onView,
  onDelete,
  onExportMarkdown,
  onExportJson,
}: SearchResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="search-result-card">
      <div className="result-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="result-info">
          <h4>{result.session.name}</h4>
          <span className="result-meta">
            {new Date(result.session.lastUpdatedAt).toLocaleDateString()} •{' '}
            {result.matchCount} {result.matchCount === 1 ? 'match' : 'matches'}
          </span>
        </div>
        <button className="expand-btn">{isExpanded ? '▼' : '▶'}</button>
      </div>

      {isExpanded && (
        <div className="result-body">
          <div className="result-previews">
            {result.previews.map((preview, idx) => (
              <div key={idx} className="preview-snippet">
                <span className="line-number">Line {preview.lineNumber}:</span>
                <div className="snippet-text">
                  <span className="context-before">{preview.before}</span>
                  <mark className="match-highlight">{preview.match}</mark>
                  <span className="context-after">{preview.after}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="result-actions">
            <button onClick={onView} className="btn-secondary">
              View Full Session
            </button>
            <button onClick={onExportMarkdown} className="btn-secondary">
              Export MD
            </button>
            <button onClick={onExportJson} className="btn-secondary">
              Export JSON
            </button>
            <button onClick={onDelete} className="btn-danger">
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Browse Tab Component
interface BrowseTabProps {
  sessions: HistorySessionEntry[];
  isLoading: boolean;
  onViewSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onExportMarkdown: (id: string) => void;
  onExportJson: (id: string) => void;
  formatDate: (ts: number) => string;
  formatSize: (bytes: number) => string;
}

function BrowseTab({
  sessions,
  isLoading,
  onViewSession,
  onDeleteSession,
  onExportMarkdown,
  onExportJson,
  formatDate,
  formatSize,
}: BrowseTabProps) {
  if (isLoading) {
    return <div className="browse-loading">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return <div className="browse-empty">No session history yet</div>;
  }

  return (
    <div className="browse-tab">
      <div className="session-list">
        {sessions.map((session) => (
          <div key={session.id} className="session-card">
            <div className="session-card-header">
              <h4>{session.name || `[${session.id.slice(0, 8)}] ${formatSize(session.sizeBytes)}`}</h4>
              <span className="session-date">{formatDate(session.lastUpdatedAt)}</span>
            </div>
            <div className="session-card-meta">
              <span title={session.workingDirectory}>📁 {session.workingDirectory || '(no directory)'}</span>
              <span>{formatSize(session.sizeBytes)}</span>
            </div>
            <div className="session-card-actions">
              <button onClick={() => onViewSession(session.id)} className="btn-secondary">
                View
              </button>
              <button onClick={() => onExportMarkdown(session.id)} className="btn-secondary">
                MD
              </button>
              <button onClick={() => onExportJson(session.id)} className="btn-secondary">
                JSON
              </button>
              <button onClick={() => onDeleteSession(session.id)} className="btn-danger">
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Settings Tab Component
interface SettingsTabProps {
  settings: HistorySettings;
  stats: HistoryStats | null;
  onUpdateSettings: (updates: Partial<HistorySettings>) => void;
  onDeleteAll: () => void;
  formatSize: (bytes: number) => string;
  formatDate: (ts: number) => string;
}

function SettingsTab({
  settings,
  stats,
  onUpdateSettings,
  onDeleteAll,
  formatSize,
  formatDate,
}: SettingsTabProps) {
  return (
    <div className="settings-tab">
      <div className="settings-section">
        <h3>Retention Policy</h3>

        <div className="setting-row">
          <label>Maximum Age</label>
          <select
            value={settings.maxAgeDays}
            onChange={(e) => onUpdateSettings({ maxAgeDays: parseInt(e.target.value, 10) })}
          >
            <option value={0}>Unlimited</option>
            <option value={7}>7 days</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </div>

        <div className="setting-row">
          <label>Maximum Size</label>
          <select
            value={settings.maxSizeMB}
            onChange={(e) => onUpdateSettings({ maxSizeMB: parseInt(e.target.value, 10) })}
          >
            <option value={0}>Unlimited</option>
            <option value={100}>100 MB</option>
            <option value={250}>250 MB</option>
            <option value={500}>500 MB</option>
            <option value={1000}>1 GB</option>
            <option value={2000}>2 GB</option>
          </select>
        </div>

        <div className="setting-row">
          <label>
            <input
              type="checkbox"
              checked={settings.autoCleanup}
              onChange={(e) => onUpdateSettings({ autoCleanup: e.target.checked })}
            />
            <span>Automatically clean up old sessions on startup</span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Statistics</h3>
        {stats && (
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Sessions</span>
              <span className="stat-value">{stats.totalSessions}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Size</span>
              <span className="stat-value">{formatSize(stats.totalSizeBytes)}</span>
            </div>
            {stats.oldestSessionDate && (
              <div className="stat-item">
                <span className="stat-label">Oldest Session</span>
                <span className="stat-value">{formatDate(stats.oldestSessionDate)}</span>
              </div>
            )}
            {stats.newestSessionDate && (
              <div className="stat-item">
                <span className="stat-label">Newest Session</span>
                <span className="stat-value">{formatDate(stats.newestSessionDate)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="settings-section">
        <h3>Danger Zone</h3>
        <button onClick={onDeleteAll} className="btn-danger-large">
          Clear All History
        </button>
        <p className="danger-warning">This action cannot be undone.</p>
      </div>
    </div>
  );
}

// Session Viewer Modal
interface SessionViewerProps {
  session: HistorySessionEntry | null;
  content: string;
  onClose: () => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
  formatDate: (ts: number) => string;
  formatSize: (bytes: number) => string;
}

function SessionViewer({
  session,
  content,
  onClose,
  onExportMarkdown,
  onExportJson,
  formatDate,
  formatSize,
}: SessionViewerProps) {
  if (!session) return null;

  return (
    <div className="session-viewer-overlay" onClick={onClose}>
      <div className="session-viewer-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="viewer-header">
          <div>
            <h3>{session.name}</h3>
            <p className="viewer-meta">
              {formatDate(session.lastUpdatedAt)} • {formatSize(session.sizeBytes)}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="viewer-content">
          <pre>{content || 'Loading...'}</pre>
        </div>

        <div className="viewer-actions">
          <button onClick={onExportMarkdown} className="btn-secondary">
            Export as Markdown
          </button>
          <button onClick={onExportJson} className="btn-secondary">
            Export as JSON
          </button>
        </div>
      </div>
    </div>
  );
}
