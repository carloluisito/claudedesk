import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  Check,
  FolderPlus,
  Github,
  Terminal,
  Mic,
  Sparkles,
  Loader2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { api } from '../lib/api';
import { requestCache, CACHE_KEYS } from '../lib/request-cache';
import { cn } from '../lib/cn';

interface HealthStatus {
  cloudflared: { installed: boolean };
  claude: { installed: boolean; authenticated: boolean };
  git: { installed: boolean };
  docker: { installed: boolean; running: boolean };
  whisper: { installed: boolean };
  github: { connected: boolean };
  repos: { count: number };
  setup: { completed: boolean };
}

interface SetupWizardProps {
  onComplete: () => void;
}

type WizardStep = 'security' | 'welcome' | 'repo' | 'github' | 'claude' | 'voice' | 'done';

const STEPS: WizardStep[] = ['security', 'welcome', 'repo', 'github', 'claude', 'voice', 'done'];

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('security');
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [repoPath, setRepoPath] = useState('');
  const [addingRepo, setAddingRepo] = useState(false);
  const [repoError, setRepoError] = useState('');
  const [securityAccepted, setSecurityAccepted] = useState(false);
  const prefersReduced = useReducedMotion();
  const { loadData } = useAppStore();

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async (forceRefresh = false) => {
    try {
      // Use cached health status to avoid duplicate calls
      const data = await requestCache.fetch(
        CACHE_KEYS.HEALTH_STATUS,
        () => api<HealthStatus>('GET', '/health/status'),
        { staleTime: 60000, forceRefresh }
      );
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentIndex = STEPS.indexOf(currentStep);

  const goNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const goBack = () => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const handleSecurityAccept = async () => {
    try {
      // Save security acknowledgment to settings
      await api('PUT', '/settings', {
        securityAcknowledged: true,
        acknowledgedAt: new Date().toISOString(),
      });
      goNext();
    } catch (error) {
      console.error('Failed to save security acknowledgment:', error);
    }
  };

  const handleComplete = async () => {
    try {
      await api('POST', '/setup/complete');
      await loadData();
      onComplete();
    } catch (error) {
      console.error('Failed to complete setup:', error);
    }
  };

  const addRepository = async () => {
    if (!repoPath.trim()) {
      setRepoError('Please enter a repository path');
      return;
    }

    setAddingRepo(true);
    setRepoError('');

    try {
      // Detect project type
      const detection = await api<{
        type: string;
        name: string;
        commands: { install?: string; build?: string; dev?: string; test?: string };
        port: number;
      }>('POST', '/repos/detect', { path: repoPath.trim() });

      // Add the repo
      await api('POST', '/repos', {
        id: detection.name,
        path: repoPath.trim(),
        commands: detection.commands,
        port: detection.port,
      });

      await loadData({ forceRefresh: true });
      await loadStatus(true); // Force refresh to get updated repo count
      setRepoPath('');
      goNext();
    } catch (error) {
      setRepoError(error instanceof Error ? error.message : 'Failed to add repository');
    } finally {
      setAddingRepo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const stepContent = {
    security: (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600">
          <ShieldAlert className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          Important Security Information
        </h2>
        <div className="max-w-lg mx-auto text-left space-y-4">
          <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-4">
            <p className="text-sm text-amber-200 mb-3 font-medium">
              ClaudeDesk grants Claude Code autonomous access to your local file system and command execution.
            </p>
            <p className="text-sm text-amber-300/80 mb-2">By default, Claude can:</p>
            <ul className="text-sm text-amber-300/70 space-y-1 ml-4 list-disc">
              <li>Read, edit, and delete files in configured workspaces</li>
              <li>Execute arbitrary shell commands on your machine</li>
              <li>Install packages and modify system configuration</li>
              <li>Access network resources and external APIs</li>
            </ul>
          </div>

          <div className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs text-white/70 mb-2 font-medium">Before using ClaudeDesk:</p>
            <ul className="text-xs text-white/60 space-y-1 ml-4 list-disc">
              <li>Only configure trusted repositories in workspaces</li>
              <li>Review all changes before committing or deploying</li>
              <li>Use read-only permission mode when exploring unfamiliar codebases</li>
              <li>Never configure system directories or sensitive paths</li>
            </ul>
          </div>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative flex-shrink-0">
              <input
                type="checkbox"
                checked={securityAccepted}
                onChange={(e) => setSecurityAccepted(e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-5 w-5 rounded border-2 border-amber-600 bg-transparent ring-2 ring-amber-800 peer-checked:bg-amber-600 peer-checked:border-amber-500 transition-all flex items-center justify-center">
                {securityAccepted && <Check className="h-3 w-3 text-white" />}
              </div>
            </div>
            <span className="text-sm text-white/80 group-hover:text-white transition-colors">
              I understand and accept these risks
            </span>
          </label>

          <button
            onClick={handleSecurityAccept}
            disabled={!securityAccepted}
            className="w-full mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Continue
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    ),

    welcome: (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600">
          <Sparkles className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          Welcome to ClaudeDesk
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
          Let's get you set up with AI-powered development. This wizard will help you
          add repositories and connect your tools.
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left">
          <StatusItem icon={<Terminal className="h-4 w-4" />} label="Git" ok={status?.git.installed} />
          <StatusItem icon={<Terminal className="h-4 w-4" />} label="Claude CLI" ok={status?.claude.installed} />
          <StatusItem icon={<Terminal className="h-4 w-4" />} label="Cloudflared" ok={status?.cloudflared.installed} />
          <StatusItem icon={<Terminal className="h-4 w-4" />} label="Docker" ok={status?.docker.installed} />
        </div>
      </div>
    ),

    repo: (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
          <FolderPlus className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Add a Repository
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Point to a local repository to start working with Claude.
        </p>

        {(status?.repos.count || 0) > 0 ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4 mb-4">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span>{status?.repos.count} repository(s) already added</span>
            </div>
          </div>
        ) : null}

        <div className="max-w-md mx-auto">
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="C:\Users\you\projects\my-app"
            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
          />
          {repoError && (
            <p className="mt-2 text-sm text-red-500">{repoError}</p>
          )}
          <button
            onClick={addRepository}
            disabled={addingRepo}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-white font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {addingRepo ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <FolderPlus className="h-4 w-4" />
                Add Repository
              </>
            )}
          </button>
        </div>
      </div>
    ),

    github: (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
          <Github className="h-8 w-8 text-zinc-900 dark:text-zinc-100" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          GitHub Connection
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Connect to GitHub to push branches and create PRs.
        </p>

        {status?.github.connected ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span>GitHub CLI authenticated</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Run this command in your terminal:
              </p>
              <code className="block rounded-lg bg-zinc-900 dark:bg-zinc-950 px-4 py-2 text-sm text-green-400 font-mono">
                gh auth login
              </code>
            </div>
            <p className="text-xs text-zinc-500">
              This step is optional. You can skip and configure later in Settings.
            </p>
          </div>
        )}
      </div>
    ),

    claude: (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 dark:bg-purple-900/30">
          <Terminal className="h-8 w-8 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Claude CLI
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          The Claude CLI powers ClaudeDesk's AI capabilities.
        </p>

        {status?.claude.installed ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span>Claude CLI installed</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
              <p className="text-amber-800 dark:text-amber-200 text-sm mb-3">
                Claude CLI is not installed.
              </p>
              <a
                href="https://docs.anthropic.com/en/docs/claude-cli"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 text-sm font-medium hover:underline"
              >
                Installation Guide <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    ),

    voice: (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-100 dark:bg-pink-900/30">
          <Mic className="h-8 w-8 text-pink-600 dark:text-pink-400" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Voice Control
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          Use Whisper for voice commands (optional).
        </p>

        {status?.whisper.installed ? (
          <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-5 w-5" />
              <span>Whisper installed</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 p-4">
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Voice control requires OpenAI Whisper:
              </p>
              <code className="block rounded-lg bg-zinc-900 dark:bg-zinc-950 px-4 py-2 text-sm text-green-400 font-mono">
                pip install openai-whisper
              </code>
            </div>
            <p className="text-xs text-zinc-500">
              This step is optional. Skip if you don't need voice control.
            </p>
          </div>
        )}
      </div>
    ),

    done: (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600">
          <Check className="h-10 w-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mb-3">
          You're All Set!
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6 max-w-md mx-auto">
          ClaudeDesk is configured and ready. Head to the Terminal to start your first
          Claude-powered development session.
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-left mb-6">
          <StatusItem icon={<Terminal className="h-4 w-4" />} label="Claude CLI" ok={status?.claude.installed} />
          <StatusItem icon={<Github className="h-4 w-4" />} label="GitHub" ok={status?.github.connected} />
          <StatusItem icon={<Terminal className="h-4 w-4" />} label="Cloudflared" ok={status?.cloudflared.installed} />
          <StatusItem icon={<FolderPlus className="h-4 w-4" />} label="Repos" ok={(status?.repos.count || 0) > 0} />
        </div>

        <button
          onClick={handleComplete}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-white font-semibold hover:bg-blue-700 shadow-lg shadow-blue-600/20"
        >
          Go to Terminal
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    ),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-zinc-950 overflow-y-auto">
      <div className="w-full max-w-lg px-6 py-12">
        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={cn(
                'h-2 rounded-full transition-all',
                index === currentIndex
                  ? 'w-8 bg-blue-600'
                  : index < currentIndex
                  ? 'w-2 bg-blue-400'
                  : 'w-2 bg-zinc-200 dark:bg-zinc-800'
              )}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={prefersReduced ? {} : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReduced ? {} : { opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {stepContent[currentStep]}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {currentStep !== 'done' && (
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={goBack}
              disabled={currentIndex === 0}
              className={cn(
                'flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
                currentIndex === 0
                  ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            <button
              onClick={goNext}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              {currentStep === 'voice' ? 'Finish' : 'Skip'}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusItem({ icon, label, ok }: { icon: React.ReactNode; label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40 px-3 py-2">
      {icon}
      <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
      {ok === undefined ? (
        <AlertCircle className="h-4 w-4 text-zinc-400" />
      ) : ok ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-amber-500" />
      )}
    </div>
  );
}
