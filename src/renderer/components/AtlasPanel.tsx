/**
 * Atlas Panel — Repository Atlas Engine UI
 *
 * Three states: idle (status + generate), scanning (progress timeline), preview (tabbed content + approve)
 */

import React, { useState, useCallback, useEffect } from 'react';
import type {
  AtlasScanProgress,
  AtlasScanResult,
  AtlasGeneratedContent,
  AtlasStatus,
  InlineTag,
  AtlasScanPhase,
} from '../../shared/types/atlas-types';
import { showToast } from '../utils/toast';
import './AtlasPanel.css';

interface AtlasPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectPath: string | null;
  isScanning: boolean;
  scanProgress: AtlasScanProgress | null;
  scanResult: AtlasScanResult | null;
  generatedContent: AtlasGeneratedContent | null;
  atlasStatus: AtlasStatus | null;
  error: string | null;
  onGenerate: () => void;
  onWrite: (claudeMd: string, repoIndex: string, inlineTags: InlineTag[]) => Promise<boolean>;
  onReset: () => void;
}

type PreviewTab = 'claude-md' | 'repo-index' | 'inline-tags';

const PHASE_ORDER: AtlasScanPhase[] = ['enumerating', 'analyzing', 'inferring', 'generating'];
const PHASE_LABELS: Record<AtlasScanPhase, string> = {
  enumerating: 'Discover Files',
  analyzing: 'Analyze Imports',
  inferring: 'Infer Domains',
  generating: 'Generate Content',
};

export function AtlasPanel({
  isOpen,
  onClose,
  projectPath,
  isScanning,
  scanProgress,
  scanResult,
  generatedContent,
  atlasStatus,
  error,
  onGenerate,
  onWrite,
  onReset,
}: AtlasPanelProps) {
  const [previewTab, setPreviewTab] = useState<PreviewTab>('claude-md');
  const [editedClaudeMd, setEditedClaudeMd] = useState('');
  const [editedRepoIndex, setEditedRepoIndex] = useState('');
  const [editedTags, setEditedTags] = useState<InlineTag[]>([]);

  // When generated content changes, initialize editable copies
  useEffect(() => {
    if (generatedContent) {
      setEditedClaudeMd(generatedContent.claudeMd);
      setEditedRepoIndex(generatedContent.repoIndex);
      setEditedTags(generatedContent.inlineTags);
    }
  }, [generatedContent]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  const handleApprove = useCallback(async () => {
    try {
      const success = await onWrite(editedClaudeMd, editedRepoIndex, editedTags);
      if (success) {
        showToast('Atlas files written successfully', 'success');
        onClose();
      } else {
        showToast('Failed to write atlas files', 'error');
      }
    } catch (err) {
      console.error('Failed to write atlas:', err);
      showToast(err instanceof Error ? err.message : 'Failed to write atlas files', 'error');
    }
  }, [editedClaudeMd, editedRepoIndex, editedTags, onWrite, onClose]);

  const handleCancel = useCallback(() => {
    onReset();
  }, [onReset]);

  const handleToggleTag = useCallback((index: number) => {
    setEditedTags(prev => prev.map((tag, i) =>
      i === index ? { ...tag, selected: !tag.selected } : tag
    ));
  }, []);

  if (!isOpen) return null;

  const isPreviewMode = !isScanning && generatedContent !== null;
  const isIdleMode = !isScanning && generatedContent === null;

  return (
    <div className="atlas-overlay" onClick={handleOverlayClick}>
      <div className="atlas-dialog">
        {/* Header */}
        <div className="atlas-header">
          <div className="atlas-header-left">
            <svg className="atlas-header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
              <line x1="8" y1="2" x2="8" y2="18" />
              <line x1="16" y1="6" x2="16" y2="22" />
            </svg>
            <h2>Repository Atlas</h2>
          </div>
          <button className="atlas-close-btn" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="atlas-body">
          {/* Error display */}
          {error && (
            <div className="atlas-error">
              <svg className="atlas-error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <span className="atlas-error-text">{error}</span>
            </div>
          )}

          {/* Idle state */}
          {isIdleMode && (
            <>
              <div className={`atlas-status ${atlasStatus?.hasAtlas ? 'has-atlas' : 'no-atlas'}`}>
                <svg className="atlas-status-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {atlasStatus?.hasAtlas ? (
                    <>
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </>
                  )}
                </svg>
                <div className="atlas-status-text">
                  <h3>{atlasStatus?.hasAtlas ? 'Atlas Found' : 'No Atlas Detected'}</h3>
                  <p>
                    {atlasStatus?.hasAtlas
                      ? `CLAUDE.md and repo-index.md present. ${atlasStatus.inlineTagCount} inline tags.`
                      : 'Generate an atlas to help AI tools navigate this codebase.'}
                  </p>
                  {atlasStatus?.lastGenerated && (
                    <p>Last updated: {new Date(atlasStatus.lastGenerated).toLocaleString()}</p>
                  )}
                </div>
              </div>

              <button
                className="atlas-generate-btn"
                onClick={onGenerate}
                disabled={!projectPath}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                  <line x1="8" y1="2" x2="8" y2="18" />
                  <line x1="16" y1="6" x2="16" y2="22" />
                </svg>
                {atlasStatus?.hasAtlas ? 'Rebuild Atlas' : 'Generate Atlas'}
              </button>
            </>
          )}

          {/* Scanning state */}
          {isScanning && (
            <div className="atlas-scanning">
              <div className="atlas-scan-timeline">
                {PHASE_ORDER.map((phase) => {
                  const isActive = scanProgress?.phase === phase;
                  const phaseIndex = PHASE_ORDER.indexOf(phase);
                  const currentIndex = scanProgress ? PHASE_ORDER.indexOf(scanProgress.phase) : -1;
                  const isCompleted = currentIndex > phaseIndex;

                  return (
                    <div
                      key={phase}
                      className={`atlas-scan-phase ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                    >
                      <div className={`atlas-scan-phase-icon ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}>
                        {isCompleted ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : isActive ? (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                          </svg>
                        ) : (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </div>
                      <div className="atlas-scan-phase-text">
                        <div className="atlas-scan-phase-name">{PHASE_LABELS[phase]}</div>
                        {isActive && scanProgress && (
                          <div className="atlas-scan-phase-msg">{scanProgress.message}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {scanProgress && scanProgress.total > 0 && (
                <div className="atlas-scan-progress-bar">
                  <div
                    className="atlas-scan-progress-fill"
                    style={{ width: `${Math.round((scanProgress.current / scanProgress.total) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Preview state */}
          {isPreviewMode && scanResult && (
            <>
              {/* Scan stats */}
              <div className="atlas-scan-stats">
                <div className="atlas-stat-card">
                  <div className="atlas-stat-value">{scanResult.totalFiles}</div>
                  <div className="atlas-stat-label">Files</div>
                </div>
                <div className="atlas-stat-card">
                  <div className="atlas-stat-value">{scanResult.totalLines.toLocaleString()}</div>
                  <div className="atlas-stat-label">Lines</div>
                </div>
                <div className="atlas-stat-card">
                  <div className="atlas-stat-value">{scanResult.domains.length}</div>
                  <div className="atlas-stat-label">Domains</div>
                </div>
                <div className="atlas-stat-card">
                  <div className="atlas-stat-value">{scanResult.scanDurationMs}ms</div>
                  <div className="atlas-stat-label">Scan Time</div>
                </div>
              </div>

              {/* Preview tabs */}
              <div className="atlas-preview-tabs">
                <button
                  className={`atlas-preview-tab ${previewTab === 'claude-md' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('claude-md')}
                >
                  CLAUDE.md
                </button>
                <button
                  className={`atlas-preview-tab ${previewTab === 'repo-index' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('repo-index')}
                >
                  repo-index.md
                </button>
                <button
                  className={`atlas-preview-tab ${previewTab === 'inline-tags' ? 'active' : ''}`}
                  onClick={() => setPreviewTab('inline-tags')}
                >
                  Inline Tags ({editedTags.filter(t => t.selected).length})
                </button>
              </div>

              {/* Tab content */}
              {previewTab === 'claude-md' && (
                <div className="atlas-preview-content">{editedClaudeMd}</div>
              )}

              {previewTab === 'repo-index' && (
                <div className="atlas-preview-content">{editedRepoIndex}</div>
              )}

              {previewTab === 'inline-tags' && (
                <div className="atlas-tags-list">
                  {editedTags.length === 0 ? (
                    <div className="atlas-preview-content">No inline tags suggested.</div>
                  ) : (
                    editedTags.map((tag, index) => (
                      <div key={tag.relativePath} className="atlas-tag-item">
                        <input
                          type="checkbox"
                          className="atlas-tag-checkbox"
                          checked={tag.selected}
                          onChange={() => handleToggleTag(index)}
                        />
                        <div className="atlas-tag-info">
                          <div className="atlas-tag-path">{tag.relativePath}</div>
                          <div className="atlas-tag-reason">{tag.reason}</div>
                          {tag.currentTag && (
                            <div className="atlas-tag-current">Current: {tag.currentTag}</div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {isPreviewMode && (
          <div className="atlas-footer">
            <button className="atlas-btn atlas-btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button className="atlas-btn atlas-btn-primary" onClick={handleApprove}>
              Write Atlas Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
