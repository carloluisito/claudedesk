/**
 * AgentFormModal - Unified create/edit modal for custom agents
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Plus,
  Save,
  Loader2,
  Pipette,
  Bot,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '../../lib/cn';

export interface AgentFormData {
  name: string;
  description: string;
  model: 'opus' | 'sonnet' | 'haiku' | 'inherit';
  color: string;
  systemPrompt: string;
}

interface AgentFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  agent?: {
    id: string;
    name: string;
    description?: string;
    model: 'opus' | 'sonnet' | 'haiku' | 'inherit';
    color?: string;
    systemPrompt?: string;
  } | null;
  onSave: (data: AgentFormData) => Promise<void>;
  onClose: () => void;
}

const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Amber', value: '#F59E0B' },
];

const MODEL_OPTIONS = [
  { value: 'inherit', label: 'Inherit (use session model)', badge: 'bg-gray-500/20 text-gray-400' },
  { value: 'opus', label: 'Opus (most capable)', badge: 'bg-orange-500/20 text-orange-400' },
  { value: 'sonnet', label: 'Sonnet (balanced)', badge: 'bg-purple-500/20 text-purple-400' },
  { value: 'haiku', label: 'Haiku (fast)', badge: 'bg-cyan-500/20 text-cyan-400' },
] as const;

const MAX_NAME = 50;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function AgentFormModal({ isOpen, mode, agent, onSave, onClose }: AgentFormModalProps) {
  const prefersReduced = useReducedMotion();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState<AgentFormData['model']>('inherit');
  const [color, setColor] = useState('#3B82F6');
  const [systemPrompt, setSystemPrompt] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && agent) {
        setName(agent.name || '');
        setDescription(agent.description || '');
        setModel(agent.model || 'inherit');
        setColor(agent.color || '#3B82F6');
        setSystemPrompt(agent.systemPrompt || '');
      } else {
        setName('');
        setDescription('');
        setModel('inherit');
        setColor('#3B82F6');
        setSystemPrompt('');
      }
      setTouched({});
      setIsDirty(false);
      setSaving(false);
      setApiError(null);
      setShowDiscardDialog(false);

      // Focus name input
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [isOpen, mode, agent]);

  // Track dirty state
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && agent) {
      const changed =
        name !== (agent.name || '') ||
        description !== (agent.description || '') ||
        model !== (agent.model || 'inherit') ||
        color !== (agent.color || '#3B82F6') ||
        systemPrompt !== (agent.systemPrompt || '');
      setIsDirty(changed);
    } else {
      setIsDirty(name !== '' || description !== '' || systemPrompt !== '');
    }
  }, [isOpen, mode, agent, name, description, model, color, systemPrompt]);

  // Validation
  const errors: Record<string, string> = {};
  if (touched.name && !name.trim()) {
    errors.name = 'Name is required';
  } else if (touched.name && name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (touched.name && name.length > MAX_NAME) {
    errors.name = `Name must be under ${MAX_NAME} characters`;
  }
  if (touched.systemPrompt && !systemPrompt.trim()) {
    errors.systemPrompt = 'System prompt is required';
  }

  const isFormValid =
    name.trim().length >= 2 &&
    name.length <= MAX_NAME &&
    systemPrompt.trim().length > 0;

  // Handlers
  const handleClose = useCallback(() => {
    if (isDirty && !saving) {
      setShowDiscardDialog(true);
    } else {
      onClose();
    }
  }, [isDirty, saving, onClose]);

  const handleDiscard = useCallback(() => {
    setShowDiscardDialog(false);
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    // Mark all as touched for validation display
    setTouched({ name: true, systemPrompt: true });

    if (!isFormValid) return;

    setSaving(true);
    setApiError(null);

    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        model,
        color,
        systemPrompt: systemPrompt.trim(),
      });
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to save agent');
    } finally {
      setSaving(false);
    }
  }, [isFormValid, name, description, model, color, systemPrompt, onSave]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardDialog) {
          setShowDiscardDialog(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, showDiscardDialog, handleClose]);

  const derivedId = slugify(name);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReduced ? 0 : 0.2 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="relative z-10 w-full max-w-2xl rounded-t-3xl bg-[#0b0f16] ring-1 ring-white/10 sm:rounded-3xl sm:m-4 max-h-[85vh] flex flex-col"
            initial={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: prefersReduced ? 0 : 100 }}
            transition={{ duration: prefersReduced ? 0 : 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: color + '30' }}
                >
                  <Bot className="h-4.5 w-4.5" style={{ color }} />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-white">
                  {mode === 'create' ? 'Create Agent' : 'Edit Agent'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 transition hover:bg-white/10"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-white/60" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {/* API Error Banner */}
              <AnimatePresence>
                {apiError && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.15 }}
                    className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 p-4 flex items-start gap-3"
                  >
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-400">{apiError}</p>
                    </div>
                    <button
                      onClick={() => setApiError(null)}
                      className="text-red-400/60 hover:text-red-400 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Name Field */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-1.5 block">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, name: true }))}
                  placeholder="e.g., React Expert, Code Reviewer, Documentation Writer"
                  maxLength={MAX_NAME}
                  disabled={saving}
                  className={cn(
                    'w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder-white/35 ring-1 focus:outline-none focus:ring-2 transition-colors disabled:opacity-50',
                    errors.name
                      ? 'ring-red-500/50 focus:ring-red-500/50'
                      : 'ring-white/10 focus:ring-blue-500/50'
                  )}
                />
                {errors.name ? (
                  <p className="text-xs text-red-400 mt-1">{errors.name}</p>
                ) : name.trim() && derivedId ? (
                  <p className="text-xs text-white/30 mt-1">
                    Agent ID: <span className="font-mono text-white/40">{derivedId}</span>
                  </p>
                ) : null}
              </div>

              {/* Description Field */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-1.5 block">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of what this agent does"
                  disabled={saving}
                  className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder-white/35 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors disabled:opacity-50"
                />
                <p className="text-xs text-white/40 mt-1">A brief summary shown in the agent card</p>
              </div>

              {/* Model + Color row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Model Preference */}
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1.5 block">
                    Model Preference
                  </label>
                  <div className="relative">
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value as AgentFormData['model'])}
                      disabled={saving}
                      className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {MODEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                  </div>
                  <p className="text-xs text-white/40 mt-1">Sets the Claude model for this agent</p>
                </div>

                {/* Color Picker */}
                <div>
                  <label className="text-sm font-medium text-white/70 mb-1.5 block">Color</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setColor(preset.value)}
                        disabled={saving}
                        className={cn(
                          'h-9 w-9 rounded-xl transition-all duration-200 disabled:opacity-50',
                          color === preset.value
                            ? 'ring-2 ring-white/40 ring-offset-2 ring-offset-[#0b0f16] scale-110'
                            : 'ring-1 ring-white/10 hover:ring-white/20 hover:scale-105'
                        )}
                        style={{ backgroundColor: preset.value }}
                        aria-label={preset.name}
                      />
                    ))}
                    {/* Custom color */}
                    <button
                      type="button"
                      onClick={() => colorInputRef.current?.click()}
                      disabled={saving}
                      className={cn(
                        'h-9 w-9 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center transition-all duration-200 hover:bg-white/10 hover:scale-105 disabled:opacity-50',
                        !PRESET_COLORS.some((p) => p.value === color) &&
                          'ring-2 ring-white/40 ring-offset-2 ring-offset-[#0b0f16] scale-110'
                      )}
                      aria-label="Custom color"
                    >
                      <Pipette className="h-3.5 w-3.5 text-white/50" />
                    </button>
                    <input
                      ref={colorInputRef}
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="sr-only"
                      tabIndex={-1}
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1">Visual identifier in the UI</p>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <label className="text-sm font-medium text-white/70 mb-1.5 block">
                  System Prompt <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  onBlur={() => setTouched((p) => ({ ...p, systemPrompt: true }))}
                  placeholder={`You are a specialized agent. Describe your role and capabilities here.\n\nYou can use markdown for formatting.`}
                  disabled={saving}
                  rows={8}
                  className={cn(
                    'w-full min-h-[200px] max-h-[400px] rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder-white/35 ring-1 focus:outline-none focus:ring-2 font-mono leading-relaxed resize-y transition-colors disabled:opacity-50',
                    errors.systemPrompt
                      ? 'ring-red-500/50 focus:ring-red-500/50'
                      : 'ring-white/10 focus:ring-blue-500/50'
                  )}
                />
                {errors.systemPrompt ? (
                  <p className="text-xs text-red-400 mt-1">{errors.systemPrompt}</p>
                ) : (
                  <p className="text-xs text-white/40 mt-1">
                    This is the instruction set that defines how the agent behaves
                  </p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 px-5 py-4 border-t border-white/10 shrink-0">
              <button
                onClick={handleClose}
                disabled={saving}
                className="flex-1 rounded-2xl bg-white/5 py-3 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!isFormValid || saving}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === 'create' ? 'Creating...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    {mode === 'create' ? (
                      <Plus className="h-4 w-4" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {mode === 'create' ? 'Create Agent' : 'Save Changes'}
                  </>
                )}
              </button>
            </div>
          </motion.div>

          {/* Discard Changes Dialog */}
          <AnimatePresence>
            {showDiscardDialog && (
              <>
                <motion.div
                  className="fixed inset-0 z-[60] bg-black/40"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: prefersReduced ? 0 : 0.15 }}
                  onClick={() => setShowDiscardDialog(false)}
                />
                <motion.div
                  className="fixed z-[70] w-full max-w-sm rounded-3xl bg-[#0b0f16] p-6 ring-1 ring-white/10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: prefersReduced ? 0 : 0.2 }}
                >
                  <h3 className="text-base font-semibold text-white text-center mb-2">
                    Discard unsaved changes?
                  </h3>
                  <p className="text-sm text-white/50 text-center mb-5">
                    Your changes will be lost if you close this form.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDiscardDialog(false)}
                      className="flex-1 rounded-2xl bg-white/5 py-3 text-sm text-white/70 ring-1 ring-white/10 hover:bg-white/10 transition-colors"
                    >
                      Keep Editing
                    </button>
                    <button
                      onClick={handleDiscard}
                      className="flex-1 rounded-2xl py-3 text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors"
                    >
                      Discard
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      )}
    </AnimatePresence>
  );
}
