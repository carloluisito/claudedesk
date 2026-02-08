import { useState, useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { PromptTemplate, TemplateCreateRequest } from '../../shared/types/prompt-templates';
import { extractVariables } from '../utils/variable-resolver';

interface TemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: PromptTemplate) => void;
  editingTemplate?: PromptTemplate | null;
}

const AVAILABLE_ICONS = [
  'MessageCircle',
  'Sparkles',
  'Bug',
  'FileText',
  'TestTube',
  'Code',
  'Shield',
  'Book',
  'GitCommit',
  'Clipboard',
  'AlignLeft',
  'HelpCircle',
  'Zap',
  'Terminal',
  'Database',
  'Settings',
  'Package',
  'Star',
  'Heart',
  'Lightbulb',
];

const VARIABLE_DESCRIPTIONS = {
  clipboard: 'Current clipboard text',
  current_dir: 'Active session working directory',
  selection: 'Selected text in terminal',
  datetime: 'Current date and time (YYYY-MM-DD HH:MM:SS)',
  date: 'Current date (YYYY-MM-DD)',
  session_name: 'Active session name',
};

export function TemplateEditor({
  isOpen,
  onClose,
  onSave,
  editingTemplate,
}: TemplateEditorProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('MessageCircle');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      if (editingTemplate) {
        setName(editingTemplate.name);
        setDescription(editingTemplate.description);
        setPrompt(editingTemplate.prompt);
        setKeywords(editingTemplate.keywords);
        setSelectedIcon(editingTemplate.icon || 'MessageCircle');
      } else {
        resetForm();
      }
      setError(null);
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, editingTemplate]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setPrompt('');
    setKeywords([]);
    setKeywordInput('');
    setSelectedIcon('MessageCircle');
    setError(null);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 150);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleAddKeyword = () => {
    const keyword = keywordInput.trim().toLowerCase();
    if (keyword && !keywords.includes(keyword) && keywords.length < 20) {
      setKeywords([...keywords, keyword]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter((k) => k !== keyword));
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    const trimmedPrompt = prompt.trim();

    if (!trimmedName) {
      setError('Template name is required');
      return;
    }

    if (!trimmedPrompt) {
      setError('Template prompt is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (editingTemplate) {
        // Update existing template
        const updated = await window.electronAPI.updateTemplate({
          id: editingTemplate.id,
          name: trimmedName,
          description: trimmedDescription,
          prompt: trimmedPrompt,
          keywords,
          icon: selectedIcon,
        });
        onSave(updated);
      } else {
        // Create new template
        const request: TemplateCreateRequest = {
          name: trimmedName,
          description: trimmedDescription,
          prompt: trimmedPrompt,
          keywords,
          icon: selectedIcon,
        };
        const created = await window.electronAPI.addTemplate(request);
        onSave(created);
      }
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const usedVariables = extractVariables(prompt);

  if (!isOpen) return null;

  return (
    <div
      className={`template-editor-overlay ${isAnimating ? 'visible' : ''}`}
      onClick={handleOverlayClick}
    >
      <div
        ref={dialogRef}
        className={`template-editor-dialog ${isAnimating ? 'visible' : ''}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="template-editor-header">
          <h2 className="template-editor-title">
            {editingTemplate ? 'Edit Template' : 'New Template'}
          </h2>
          <button className="template-editor-close" onClick={handleClose} aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <form className="template-editor-body" onSubmit={handleSubmit}>
          {/* Name */}
          <div className="template-editor-field">
            <label className="template-editor-label">Name</label>
            <input
              ref={nameInputRef}
              type="text"
              className="template-editor-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Template"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="template-editor-field">
            <label className="template-editor-label">Description</label>
            <input
              type="text"
              className="template-editor-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this template do?"
              maxLength={500}
            />
          </div>

          {/* Icon */}
          <div className="template-editor-field">
            <label className="template-editor-label">Icon</label>
            <div className="template-editor-icon-selector">
              <button
                type="button"
                className="template-editor-icon-button"
                onClick={() => setShowIconPicker(!showIconPicker)}
              >
                <IconComponent name={selectedIcon} />
                <span>{selectedIcon}</span>
                <ChevronIcon />
              </button>
              {showIconPicker && (
                <div className="template-editor-icon-picker">
                  {AVAILABLE_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      className={`template-editor-icon-option ${
                        selectedIcon === iconName ? 'selected' : ''
                      }`}
                      onClick={() => {
                        setSelectedIcon(iconName);
                        setShowIconPicker(false);
                      }}
                      title={iconName}
                    >
                      <IconComponent name={iconName} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prompt */}
          <div className="template-editor-field">
            <label className="template-editor-label">
              Prompt Template
              <span className="template-editor-label-hint">
                Use variables like {'{clipboard}'}, {'{current_dir}'}, {'{selection}'}
              </span>
            </label>
            <textarea
              className="template-editor-textarea"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter your prompt template here...&#10;&#10;You can use variables:&#10;{clipboard} - Clipboard text&#10;{current_dir} - Working directory&#10;{selection} - Selected terminal text&#10;{datetime} - Current date and time&#10;{date} - Current date&#10;{session_name} - Session name"
              maxLength={5000}
              rows={8}
            />
            {usedVariables.length > 0 && (
              <div className="template-editor-variables">
                <span className="template-editor-variables-label">Variables used:</span>
                {usedVariables.map((varName) => (
                  <span key={varName} className="template-editor-variable-tag">
                    {'{' + varName + '}'}
                    {VARIABLE_DESCRIPTIONS[varName as keyof typeof VARIABLE_DESCRIPTIONS] && (
                      <span className="template-editor-variable-tooltip">
                        {VARIABLE_DESCRIPTIONS[varName as keyof typeof VARIABLE_DESCRIPTIONS]}
                      </span>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Keywords */}
          <div className="template-editor-field">
            <label className="template-editor-label">
              Keywords
              <span className="template-editor-label-hint">
                Help find this template in search ({keywords.length}/20)
              </span>
            </label>
            <div className="template-editor-keywords">
              {keywords.map((keyword) => (
                <span key={keyword} className="template-editor-keyword-tag">
                  {keyword}
                  <button
                    type="button"
                    className="template-editor-keyword-remove"
                    onClick={() => handleRemoveKeyword(keyword)}
                    aria-label={`Remove ${keyword}`}
                  >
                    ×
                  </button>
                </span>
              ))}
              {keywords.length < 20 && (
                <input
                  type="text"
                  className="template-editor-keyword-input"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordInputKeyDown}
                  onBlur={handleAddKeyword}
                  placeholder="Add keyword..."
                  maxLength={50}
                />
              )}
            </div>
          </div>

          {error && (
            <div className="template-editor-error">
              <ErrorIcon />
              {error}
            </div>
          )}

          <div className="template-editor-actions">
            <button type="button" className="template-editor-btn-cancel" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="template-editor-btn-save" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>

      <style>{templateEditorStyles}</style>
    </div>
  );
}

// Icon helper component
function IconComponent({ name }: { name: string }) {
  // @ts-ignore
  const Icon = LucideIcons[name] || LucideIcons.MessageCircle;
  return <Icon size={16} />;
}

// Small icons
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4m0 4h.01" strokeLinecap="round" />
    </svg>
  );
}

const templateEditorStyles = `
  .template-editor-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1500;
    transition: background 0.15s ease;
    font-family: 'JetBrains Mono', monospace;
  }

  .template-editor-overlay.visible {
    background: rgba(0, 0, 0, 0.6);
  }

  .template-editor-dialog {
    width: 600px;
    max-width: calc(100vw - 48px);
    max-height: calc(100vh - 48px);
    background: #1a1b26;
    border: 1px solid #292e42;
    border-radius: 12px;
    box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    transform: scale(0.95) translateY(10px);
    opacity: 0;
    transition: all 0.15s ease;
  }

  .template-editor-dialog.visible {
    transform: scale(1) translateY(0);
    opacity: 1;
  }

  .template-editor-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid #292e42;
  }

  .template-editor-title {
    font-size: 15px;
    font-weight: 600;
    color: #c0caf5;
    margin: 0;
  }

  .template-editor-close {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #565f89;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .template-editor-close:hover {
    background: #292e42;
    color: #a9b1d6;
  }

  .template-editor-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .template-editor-body::-webkit-scrollbar {
    width: 8px;
  }

  .template-editor-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .template-editor-body::-webkit-scrollbar-thumb {
    background-color: #3b4261;
    border-radius: 4px;
  }

  .template-editor-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .template-editor-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 500;
    color: #a9b1d6;
  }

  .template-editor-label-hint {
    font-size: 10px;
    color: #565f89;
    font-weight: 400;
  }

  .template-editor-input {
    height: 38px;
    padding: 0 12px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    color: #c0caf5;
    font-size: 13px;
    font-family: inherit;
    transition: border-color 0.15s ease;
  }

  .template-editor-input:focus {
    outline: none;
    border-color: #7aa2f7;
  }

  .template-editor-input::placeholder {
    color: #3b4261;
  }

  .template-editor-textarea {
    min-height: 180px;
    padding: 12px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    color: #c0caf5;
    font-size: 12px;
    font-family: inherit;
    line-height: 1.6;
    resize: vertical;
    transition: border-color 0.15s ease;
  }

  .template-editor-textarea:focus {
    outline: none;
    border-color: #7aa2f7;
  }

  .template-editor-textarea::placeholder {
    color: #3b4261;
  }

  .template-editor-icon-selector {
    position: relative;
  }

  .template-editor-icon-button {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 38px;
    padding: 0 12px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    color: #c0caf5;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .template-editor-icon-button:hover {
    border-color: #3b4261;
  }

  .template-editor-icon-button svg:first-child {
    color: #7aa2f7;
  }

  .template-editor-icon-button span {
    flex: 1;
    text-align: left;
  }

  .template-editor-icon-button svg:last-child {
    color: #565f89;
    margin-left: auto;
  }

  .template-editor-icon-picker {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 4px;
    padding: 8px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 4px;
    z-index: 10;
    max-height: 200px;
    overflow-y: auto;
  }

  .template-editor-icon-option {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 6px;
    color: #7aa2f7;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .template-editor-icon-option:hover {
    background: #1a1b26;
    border-color: #3b4261;
  }

  .template-editor-icon-option.selected {
    background: rgba(122, 162, 247, 0.15);
    border-color: #7aa2f7;
  }

  .template-editor-variables {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    padding: 8px 12px;
    background: rgba(122, 162, 247, 0.05);
    border: 1px solid rgba(122, 162, 247, 0.15);
    border-radius: 6px;
  }

  .template-editor-variables-label {
    font-size: 10px;
    color: #565f89;
    margin-right: 4px;
  }

  .template-editor-variable-tag {
    position: relative;
    display: inline-flex;
    align-items: center;
    height: 20px;
    padding: 0 8px;
    background: rgba(122, 162, 247, 0.15);
    border-radius: 4px;
    font-size: 11px;
    font-family: 'JetBrains Mono', monospace;
    color: #7aa2f7;
    cursor: help;
  }

  .template-editor-variable-tag:hover .template-editor-variable-tooltip {
    opacity: 1;
    visibility: visible;
  }

  .template-editor-variable-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 6px;
    padding: 6px 10px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    font-size: 10px;
    color: #a9b1d6;
    white-space: nowrap;
    opacity: 0;
    visibility: hidden;
    transition: all 0.15s ease;
    z-index: 10;
    pointer-events: none;
  }

  .template-editor-keywords {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 10px;
    background: #16161e;
    border: 1px solid #292e42;
    border-radius: 6px;
    min-height: 44px;
  }

  .template-editor-keyword-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 24px;
    padding: 0 8px;
    background: rgba(158, 206, 106, 0.15);
    border-radius: 4px;
    font-size: 11px;
    color: #9ece6a;
  }

  .template-editor-keyword-remove {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    background: transparent;
    border: none;
    border-radius: 3px;
    color: #9ece6a;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .template-editor-keyword-remove:hover {
    background: rgba(158, 206, 106, 0.2);
  }

  .template-editor-keyword-input {
    flex: 1;
    min-width: 120px;
    height: 24px;
    padding: 0 8px;
    background: transparent;
    border: none;
    outline: none;
    color: #c0caf5;
    font-size: 11px;
    font-family: inherit;
  }

  .template-editor-keyword-input::placeholder {
    color: #3b4261;
  }

  .template-editor-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: rgba(247, 118, 142, 0.1);
    border: 1px solid rgba(247, 118, 142, 0.2);
    border-radius: 6px;
    font-size: 12px;
    color: #f7768e;
  }

  .template-editor-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid #292e42;
  }

  .template-editor-btn-cancel,
  .template-editor-btn-save {
    height: 38px;
    padding: 0 20px;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .template-editor-btn-cancel {
    background: transparent;
    border: 1px solid #292e42;
    color: #a9b1d6;
  }

  .template-editor-btn-cancel:hover {
    background: #1f2335;
    border-color: #3b4261;
  }

  .template-editor-btn-save {
    background: #7aa2f7;
    border: none;
    color: #1a1b26;
  }

  .template-editor-btn-save:hover {
    background: #89b4fa;
  }

  .template-editor-btn-save:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
