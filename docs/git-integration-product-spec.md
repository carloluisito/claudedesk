# Git Integration & Smart Commits -- Product & Technical Specification

**Version**: 1.0
**Date**: 2026-02-12
**Target Application**: ClaudeDesk (Electron 28 + React 18 + TypeScript)

---

## 1) Problem Statement

- **Goal**: Allow ClaudeDesk users to perform core git operations (status, staging, committing, pushing, pulling, branching, diffs) directly within the application without switching to external tools, and to generate conventional commit messages from staged changes using heuristic analysis.
- **Users**: Developers using ClaudeDesk for AI-assisted coding who currently break their flow to use external git tools (terminal, VS Code, GitKraken, etc.).
- **Success Definition**: A user can view repository status, stage files, generate a commit message, commit, and push -- all within ClaudeDesk's sidebar panel -- without ever leaving the application.

---

## 2) Scope

### In Scope
- Git status display (staged, unstaged, untracked files with change counts)
- File staging and unstaging (individual and bulk)
- Committing with manual or AI-generated messages (heuristic, Phase 1)
- Push, pull, and fetch with progress feedback
- Branch listing, switching, and creation
- Commit history view (last 50 commits) with diff stats
- File diff viewer (text-based, monospace, inline unified format)
- Discard unstaged changes (with confirmation dialog)
- Real-time `.git` directory watching for external change detection
- Session-aware working directory resolution
- Checkpoint integration (optional post-commit checkpoint)
- TabBar/ToolsDropdown integration with staged file count badge
- Keyboard shortcut (Ctrl+Shift+G) to toggle the Git panel
- Empty state for non-git directories with "Initialize Git" button
- Merge conflict detection with warning banner
- Detached HEAD detection with info banner

### Out of Scope
- Interactive rebase
- Cherry-pick
- Stash management
- Submodule management
- Git blame / annotation
- GitHub/GitLab/Bitbucket PR integration
- Monaco-based diff editor
- GPG signing
- Git LFS operations
- Claude API-based commit message generation (deferred to Phase 2)
- Multi-remote management (only `origin` supported)
- SSH key management
- `.gitignore` editing UI

---

## 3) Functional Behavior

### 3.1 Primary Flow: Stage, Commit, Push

1. User clicks the git icon in ToolsDropdown (or presses Ctrl+Shift+G).
2. System determines the working directory from the active session's `workingDirectory` property.
3. System executes `git rev-parse --is-inside-work-tree` in that directory.
4. If true, system executes `git status --porcelain=v2 --branch` and `git log --oneline -1`.
5. GitPanel opens as a right-side overlay panel (same pattern as AtlasPanel, TeamPanel, HistoryPanel).
6. Panel displays three sections: **Branch Header**, **Changes**, **Commit Area**.
7. User checks one or more file checkboxes in the "Unstaged" or "Untracked" sections.
8. System executes `git add <file1> <file2> ...` for each checked file.
9. Status auto-refreshes. Staged files move to the "Staged" section.
10. User clicks "Generate Message" button in the Commit Area.
11. System analyzes staged diff (`git diff --cached --stat --numstat`) using heuristic engine.
12. System produces a conventional commit message: `type(scope): description` with confidence level.
13. Message appears in the commit text input. User can edit it.
14. User clicks "Commit" button.
15. System executes `git commit -m "<message>"`.
16. On success: status refreshes, staged files disappear, commit appears in history, toast shows "Committed: `<short-hash> <message>`".
17. If "Create checkpoint after commit" checkbox is checked, system calls `checkpoint:create` with the commit hash as the checkpoint name.
18. User clicks "Push" button.
19. System executes `git push origin <current-branch>`.
20. On success: push count badge clears, toast shows "Pushed to origin/<branch>".

### 3.2 Alternate Flows

**A1: Not a git repository**
1. `git rev-parse` returns non-zero exit code.
2. Panel shows empty state: "This directory is not a git repository."
3. "Initialize Git" button is shown.
4. Clicking it executes `git init` in the working directory.
5. On success: status refreshes to show empty repository state.

**A2: Branch operations**
1. User clicks the branch name in the Branch Header.
2. A dropdown appears listing all local branches (from `git branch --list`).
3. User can select a branch to switch (`git checkout <branch>`).
4. A text input at the top of the dropdown allows typing a new branch name.
5. Pressing Enter on a non-existing branch name executes `git checkout -b <name>`.
6. On success: branch header updates, status refreshes.

**A3: Pull**
1. User clicks "Pull" button in the Branch Header area.
2. System executes `git pull origin <current-branch>`.
3. During execution: button shows a spinner, all other git operations are disabled.
4. On success: status refreshes, toast shows "Pulled N commits from origin/<branch>".
5. On conflict: status refreshes, merge conflict banner appears.

**A4: Fetch**
1. User clicks "Fetch" button.
2. System executes `git fetch origin`.
3. On success: system compares `git rev-list --count HEAD..origin/<branch>` and shows "N commits behind" indicator if > 0.

**A5: View commit history**
1. User clicks "History" tab at the top of GitPanel.
2. System executes `git log --oneline --format="%H|%h|%an|%ae|%aI|%s" -50`.
3. Panel displays a scrollable list of commits with short hash, author, relative time, and subject.
4. Clicking a commit shows `git diff-tree --no-commit-id -r --stat <hash>` (files changed, insertions, deletions).

**A6: View file diff**
1. User clicks a file name in the Changes section.
2. System executes `git diff <file>` (unstaged) or `git diff --cached <file>` (staged).
3. A diff pane appears below the file list showing unified diff output.
4. Diff is rendered in monospace with line-by-line coloring: additions in `#9ece6a` (green), deletions in `#f7768e` (red), context in `#a9b1d6`.
5. Diffs over 100KB (measured by raw diff output size) are truncated with a "Diff too large to display" message.

**A7: Unstage files**
1. User unchecks a file in the "Staged" section.
2. System executes `git reset HEAD <file>`.
3. Status refreshes. File moves back to "Unstaged" or "Untracked".

**A8: Discard changes**
1. User right-clicks a file in "Unstaged" and selects "Discard Changes".
2. A `ConfirmDialog` appears: "Discard changes to `<filename>`? This action cannot be undone."
3. On confirm: system executes `git checkout -- <file>`.
4. On success: status refreshes, file disappears from changes list.

**A9: Stage all / Unstage all**
1. "Stage All" button above the unstaged section executes `git add -A`.
2. "Unstage All" button above the staged section executes `git reset HEAD`.

**A10: Session switching**
1. User switches to a different session (different working directory).
2. GitPanel detects `projectPath` change via the hook dependency on `activeSessionId`.
3. All git state (status, history, branch info) resets and reloads for the new directory.
4. If the new directory is not a git repo, the empty state is shown.

### 3.3 Error Flows

**E1: Git not installed**
- Detection: `git --version` fails on manager initialization.
- Behavior: Panel shows permanent error state: "Git is not installed or not found in PATH."
- No git operations are available. All IPC methods return error results.

**E2: Push without upstream**
- Detection: `git push` fails with "no upstream branch" error (exit code 128, stderr match).
- Behavior: System prompts user with a dialog: "No upstream branch set. Push to `origin/<branch>`?"
- On confirm: executes `git push -u origin <current-branch>`.

**E3: Push rejected (non-fast-forward)**
- Detection: `git push` fails with "rejected" / "non-fast-forward" in stderr.
- Behavior: Toast error "Push rejected: remote has new commits. Pull first."

**E4: Authentication error**
- Detection: `git push` or `git pull` or `git fetch` fails with "Authentication failed" or "could not read Username" in stderr.
- Behavior: Toast error "Git authentication failed. Configure credentials outside ClaudeDesk."

**E5: Merge conflict**
- Detection: `git status --porcelain=v2` output contains entries with `u` (unmerged) status.
- Behavior: Red warning banner at top of Changes section: "Merge conflicts detected. Resolve conflicts before committing."
- Conflicted files are listed with a distinct icon (warning triangle).
- Commit button is disabled. Stage/unstage of conflicted files is disabled.

**E6: Detached HEAD**
- Detection: `git status --porcelain=v2 --branch` shows `# branch.head (detached)`.
- Behavior: Yellow info banner: "HEAD is detached. Create a branch to save your work."
- A "Create Branch" button is shown in the banner.

**E7: Empty commit (no staged changes)**
- Commit button is disabled (grayed out) when staged file count is 0.
- No error dialog needed; the disabled state communicates the issue.

**E8: Git operation timeout**
- All git commands have a 30-second timeout (configurable).
- On timeout: operation is killed, toast error "Git operation timed out after 30 seconds."

**E9: Concurrent git operations**
- A mutex in `GitManager` prevents concurrent git commands to the same working directory.
- If a second operation is requested while one is in progress, it is queued and executed after the first completes.
- The UI shows a loading spinner on the panel header during any git operation.

---

## 4) Contracts

### 4.1 New Types (`src/shared/types/git-types.ts`)

```typescript
// -- Git file status --

export type GitFileStatus =
  | 'added'       // A - new file staged
  | 'modified'    // M - modified
  | 'deleted'     // D - deleted
  | 'renamed'     // R - renamed
  | 'copied'      // C - copied
  | 'untracked'   // ? - untracked
  | 'ignored'     // ! - ignored
  | 'unmerged';   // U - merge conflict

export type GitFileArea = 'staged' | 'unstaged' | 'untracked' | 'conflicted';

export interface GitFileEntry {
  /** Relative path from repo root */
  path: string;
  /** Original path (for renames) */
  originalPath: string | null;
  /** Status in staging area */
  indexStatus: GitFileStatus;
  /** Status in working tree */
  workTreeStatus: GitFileStatus;
  /** Which area this file belongs to in the UI */
  area: GitFileArea;
}

// -- Git branch --

export interface GitBranchInfo {
  /** Branch name */
  name: string;
  /** Is this the current branch? */
  isCurrent: boolean;
  /** Tracking remote branch (e.g., "origin/main") */
  upstream: string | null;
  /** Commits ahead of upstream */
  ahead: number;
  /** Commits behind upstream */
  behind: number;
}

// -- Git status --

export interface GitStatus {
  /** Is this a git repository? */
  isRepo: boolean;
  /** Is HEAD detached? */
  isDetached: boolean;
  /** Are there merge conflicts? */
  hasConflicts: boolean;
  /** Current branch name (null if detached) */
  branch: string | null;
  /** Tracking remote branch */
  upstream: string | null;
  /** Commits ahead of upstream */
  ahead: number;
  /** Commits behind upstream */
  behind: number;
  /** All changed files */
  files: GitFileEntry[];
  /** Count of staged files */
  stagedCount: number;
  /** Count of unstaged modified files */
  unstagedCount: number;
  /** Count of untracked files */
  untrackedCount: number;
  /** Count of conflicted files */
  conflictedCount: number;
}

// -- Git commit --

export interface GitCommitInfo {
  /** Full SHA */
  hash: string;
  /** Short SHA (7 chars) */
  shortHash: string;
  /** Author name */
  authorName: string;
  /** Author email */
  authorEmail: string;
  /** Commit timestamp (ISO 8601) */
  date: string;
  /** Commit subject (first line) */
  subject: string;
  /** Files changed count */
  filesChanged: number;
  /** Insertions count */
  insertions: number;
  /** Deletions count */
  deletions: number;
}

// -- Git diff --

export interface GitDiffResult {
  /** File path */
  filePath: string;
  /** Raw unified diff text */
  diff: string;
  /** Was the diff truncated? */
  isTruncated: boolean;
  /** Total diff size in bytes before truncation */
  totalSizeBytes: number;
}

// -- AI commit message --

export type CommitType =
  | 'feat'      // new feature
  | 'fix'       // bug fix
  | 'refactor'  // restructure without behavior change
  | 'docs'      // documentation changes
  | 'style'     // formatting, whitespace
  | 'test'      // adding/fixing tests
  | 'chore'     // maintenance, dependencies
  | 'perf'      // performance improvements
  | 'ci'        // CI/CD changes
  | 'build';    // build system changes

export type CommitConfidence = 'high' | 'medium' | 'low';

export interface GeneratedCommitMessage {
  /** The generated message in conventional format */
  message: string;
  /** Detected commit type */
  type: CommitType;
  /** Detected scope (may be null) */
  scope: string | null;
  /** Description portion */
  description: string;
  /** Confidence in the generated message */
  confidence: CommitConfidence;
  /** Explanation of why this type/scope was chosen */
  reasoning: string;
}

// -- Git operation results --

export interface GitOperationResult {
  /** Did the operation succeed? */
  success: boolean;
  /** Human-readable message */
  message: string;
  /** Error code if failed */
  errorCode: GitErrorCode | null;
}

export type GitErrorCode =
  | 'NOT_A_REPO'
  | 'GIT_NOT_INSTALLED'
  | 'NOTHING_TO_COMMIT'
  | 'MERGE_CONFLICTS'
  | 'NO_UPSTREAM'
  | 'PUSH_REJECTED'
  | 'AUTH_FAILED'
  | 'TIMEOUT'
  | 'DETACHED_HEAD'
  | 'BRANCH_EXISTS'
  | 'BRANCH_NOT_FOUND'
  | 'UNCOMMITTED_CHANGES'
  | 'UNKNOWN';

// -- Git commit request --

export interface GitCommitRequest {
  /** Working directory */
  workingDirectory: string;
  /** Commit message */
  message: string;
  /** Create a checkpoint after commit? */
  createCheckpoint: boolean;
  /** Session ID (for checkpoint linkage) */
  sessionId: string | null;
}

// -- Git push/pull progress --

export interface GitRemoteProgress {
  /** Operation type */
  operation: 'push' | 'pull' | 'fetch';
  /** Phase description */
  phase: string;
  /** Is the operation complete? */
  isComplete: boolean;
}
```

### 4.2 IPC Contract Additions (`IPCContractMap` in `src/shared/ipc-contract.ts`)

All methods use the `git:` channel prefix.

```typescript
// -- Git Integration (invoke) --

// Core status
getGitStatus:         InvokeContract<'git:status',          [string],                              GitStatus>;
getGitBranches:       InvokeContract<'git:branches',        [string],                              GitBranchInfo[]>;

// Staging
gitStageFiles:        InvokeContract<'git:stage',           [string, string[]],                    GitOperationResult>;
gitUnstageFiles:      InvokeContract<'git:unstage',         [string, string[]],                    GitOperationResult>;
gitStageAll:          InvokeContract<'git:stageAll',        [string],                              GitOperationResult>;
gitUnstageAll:        InvokeContract<'git:unstageAll',      [string],                              GitOperationResult>;

// Commit
gitCommit:            InvokeContract<'git:commit',          [GitCommitRequest],                    GitOperationResult>;
gitGenerateMessage:   InvokeContract<'git:generateMessage', [string],                              GeneratedCommitMessage>;

// Remote operations
gitPush:              InvokeContract<'git:push',            [string, boolean?],                    GitOperationResult>;  // [workDir, setUpstream?]
gitPull:              InvokeContract<'git:pull',            [string],                              GitOperationResult>;
gitFetch:             InvokeContract<'git:fetch',           [string],                              GitOperationResult>;

// Branches
gitSwitchBranch:      InvokeContract<'git:switchBranch',    [string, string],                      GitOperationResult>;  // [workDir, branchName]
gitCreateBranch:      InvokeContract<'git:createBranch',    [string, string],                      GitOperationResult>;  // [workDir, branchName]

// History & Diff
gitLog:               InvokeContract<'git:log',             [string, number?],                     GitCommitInfo[]>;     // [workDir, count?]
gitDiff:              InvokeContract<'git:diff',            [string, string, boolean],             GitDiffResult>;       // [workDir, filePath, staged]
gitCommitDiff:        InvokeContract<'git:commitDiff',      [string, string],                      GitCommitInfo>;       // [workDir, hash]

// Discard
gitDiscardFile:       InvokeContract<'git:discardFile',     [string, string],                      GitOperationResult>;  // [workDir, filePath]
gitDiscardAll:        InvokeContract<'git:discardAll',      [string],                              GitOperationResult>;

// Init
gitInit:              InvokeContract<'git:init',            [string],                              GitOperationResult>;

// Watch
gitStartWatching:     InvokeContract<'git:startWatching',   [string],                              boolean>;
gitStopWatching:      InvokeContract<'git:stopWatching',    [string],                              boolean>;

// -- Git events (main -> renderer) --

onGitStatusChanged:   EventContract<'git:statusChanged',    GitStatus>;
onGitRemoteProgress:  EventContract<'git:remoteProgress',   GitRemoteProgress>;
```

This adds **21 IPC methods** (19 invoke + 2 events).

### 4.3 Error Response Format

All `GitOperationResult` errors follow a consistent pattern:

| `errorCode` | `message` (example) |
|---|---|
| `NOT_A_REPO` | "Not a git repository" |
| `GIT_NOT_INSTALLED` | "Git is not installed or not in PATH" |
| `NOTHING_TO_COMMIT` | "No staged changes to commit" |
| `MERGE_CONFLICTS` | "Cannot commit: merge conflicts exist" |
| `NO_UPSTREAM` | "No upstream branch configured for `main`" |
| `PUSH_REJECTED` | "Push rejected: remote contains work you do not have locally" |
| `AUTH_FAILED` | "Authentication failed for remote `origin`" |
| `TIMEOUT` | "Git operation timed out after 30000ms" |
| `DETACHED_HEAD` | "HEAD is detached; create a branch first" |
| `BRANCH_EXISTS` | "Branch `feature-x` already exists" |
| `BRANCH_NOT_FOUND` | "Branch `feature-x` not found" |
| `UNCOMMITTED_CHANGES` | "Cannot switch branch: uncommitted changes exist" |
| `UNKNOWN` | Raw stderr output from git |

---

## 5) Data Model

### 5.1 New Files

| File | Purpose |
|---|---|
| `src/shared/types/git-types.ts` | All git-related type definitions (Section 4.1 above) |
| `src/main/git-manager.ts` | Main process manager -- executes git commands, manages watchers, generates commit messages |
| `src/renderer/hooks/useGit.ts` | Renderer hook -- manages git state, exposes actions to components |
| `src/renderer/components/GitPanel.tsx` | Main panel component |
| `src/renderer/components/git/GitFileList.tsx` | File list with staging checkboxes |
| `src/renderer/components/git/GitDiffView.tsx` | Unified diff renderer |
| `src/renderer/components/git/GitBranchPicker.tsx` | Branch dropdown with search and create |
| `src/renderer/components/git/GitCommitArea.tsx` | Commit message input + generate button + commit button |
| `src/renderer/components/git/GitHistoryList.tsx` | Commit history list |
| `src/renderer/components/git/GitStatusBanner.tsx` | Conflict/detached/error banners |

### 5.2 No Persistent Data Model

This feature does not introduce any new persistent storage. All state is derived from git commands executed against the file system. The `.git` directory itself is the source of truth.

### 5.3 AppSettings Addition

Add one optional field to `AppSettings` in `src/shared/ipc-types.ts`:

```typescript
gitSettings?: {
  /** Auto-refresh interval in ms (0 = disabled, default 0 -- rely on fs.watch) */
  autoRefreshIntervalMs: number;
  /** Command timeout in ms (default 30000) */
  commandTimeoutMs: number;
  /** Create checkpoint after commit (default false) */
  createCheckpointAfterCommit: boolean;
  /** Max diff size in bytes before truncation (default 102400 = 100KB) */
  maxDiffSizeBytes: number;
};
```

---

## 6) Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|---|---|
| `git:status` p50 latency | < 200ms for repos with < 10,000 files |
| `git:status` p99 latency | < 1000ms |
| `git:log` (50 entries) p50 | < 300ms |
| `git:diff` (single file) p50 | < 100ms |
| `git:generateMessage` p50 | < 50ms (heuristic only, no network) |
| `.git` watcher debounce | 500ms (coalesce rapid changes into a single status refresh) |
| Panel open-to-rendered | < 300ms |

### 6.2 Reliability

- All git operations use a per-directory mutex to prevent concurrent execution.
- All git commands have a configurable timeout (default 30 seconds).
- `fs.watch` on `.git` directory uses a 500ms debounce to prevent refresh storms.
- If `fs.watch` fails (permission error, too many watchers), the system falls back to polling at 5-second intervals and logs a warning.
- Partial failures in batch operations (e.g., staging 5 files where 1 fails) report the failure for the specific file while proceeding with others.

### 6.3 Security

- No credentials are stored or managed by ClaudeDesk. Git's credential helper is used.
- Git commands are executed via `child_process.execFile` (not `exec`) to prevent shell injection. Arguments are passed as arrays, never concatenated into a shell command string.
- File paths are validated to be within the session's working directory to prevent path traversal.
- Diff output is rendered as pre-formatted text, never as HTML, to prevent XSS from malicious filenames or content.

### 6.4 Platform Compatibility

- Windows: Git is invoked as `git.exe`. Paths use backslash internally but are normalized by `git` itself. The `.replace(/\\/g, '\\\\')` pattern from CLAUDE.md is applied where needed.
- macOS/Linux: Git is invoked as `git`. Standard path handling.
- The manager detects the git binary path at initialization: `which git` (Unix) or `where git` (Windows).

---

## 7) Component Specifications

### 7.1 GitManager (Main Process)

**File**: `src/main/git-manager.ts`
**Pattern**: Follows `CheckpointManager` / `AtlasManager` pattern.

```
class GitManager {
  private emitter: IPCEmitter | null;
  private watchers: Map<string, FSWatcher>;      // workDir -> watcher
  private mutexes: Map<string, Promise<void>>;    // workDir -> pending operation
  private gitBinary: string | null;               // resolved git path

  constructor()
  setMainWindow(window: BrowserWindow): void
  destroy(): void

  // Core
  async getStatus(workDir: string): Promise<GitStatus>
  async getBranches(workDir: string): Promise<GitBranchInfo[]>

  // Staging
  async stageFiles(workDir: string, files: string[]): Promise<GitOperationResult>
  async unstageFiles(workDir: string, files: string[]): Promise<GitOperationResult>
  async stageAll(workDir: string): Promise<GitOperationResult>
  async unstageAll(workDir: string): Promise<GitOperationResult>

  // Commit
  async commit(request: GitCommitRequest): Promise<GitOperationResult>
  async generateMessage(workDir: string): Promise<GeneratedCommitMessage>

  // Remote
  async push(workDir: string, setUpstream?: boolean): Promise<GitOperationResult>
  async pull(workDir: string): Promise<GitOperationResult>
  async fetch(workDir: string): Promise<GitOperationResult>

  // Branches
  async switchBranch(workDir: string, branch: string): Promise<GitOperationResult>
  async createBranch(workDir: string, branch: string): Promise<GitOperationResult>

  // History & Diff
  async log(workDir: string, count?: number): Promise<GitCommitInfo[]>
  async diff(workDir: string, filePath: string, staged: boolean): Promise<GitDiffResult>
  async commitDiff(workDir: string, hash: string): Promise<GitCommitInfo>

  // Discard
  async discardFile(workDir: string, filePath: string): Promise<GitOperationResult>
  async discardAll(workDir: string): Promise<GitOperationResult>

  // Init
  async init(workDir: string): Promise<GitOperationResult>

  // Watching
  startWatching(workDir: string): boolean
  stopWatching(workDir: string): boolean

  // Internal
  private async execGit(workDir: string, args: string[], timeoutMs?: number): Promise<{stdout: string, stderr: string, exitCode: number}>
  private async withMutex<T>(workDir: string, fn: () => Promise<T>): Promise<T>
  private parseStatus(output: string): GitStatus
  private parseBranches(output: string): GitBranchInfo[]
  private parseLog(output: string): GitCommitInfo[]
  private detectErrorCode(stderr: string, exitCode: number): GitErrorCode
}
```

**Git command execution**: All commands use `child_process.execFile` with the following pattern:

```typescript
private async execGit(
  workDir: string,
  args: string[],
  timeoutMs: number = 30000
): Promise<{stdout: string, stderr: string, exitCode: number}> {
  // Uses execFile (NOT exec) to avoid shell injection
  // Passes args as array
  // Sets cwd to workDir
  // Sets timeout
  // Returns {stdout, stderr, exitCode}
}
```

### 7.2 Heuristic Commit Message Generator

Embedded within `GitManager.generateMessage()`. This is a pure function that analyzes the output of `git diff --cached --stat --numstat` and `git diff --cached --name-only`.

**Detection rules (evaluated in order)**:

| Condition | Type | Confidence |
|---|---|---|
| All changed files match `*.test.*`, `*.spec.*`, `__tests__/*` | `test` | high |
| All changed files match `*.md`, `*.txt`, `*.rst`, `docs/*` | `docs` | high |
| All changed files match `*.css`, `*.scss`, `*.less` (and insertions/deletions are balanced within 20%) | `style` | medium |
| All changed files match `Dockerfile`, `*.yml`, `.github/*`, `Jenkinsfile` | `ci` | high |
| All changed files match `package.json`, `*.lock`, `webpack.*`, `tsconfig.*`, `vite.*` | `build` | medium |
| Total deletions > 2x total insertions and > 50 lines deleted | `refactor` | medium |
| Files contain only new additions (no modifications) | `feat` | medium |
| <= 3 files changed, total lines changed < 20 | `fix` | low |
| None of the above | `chore` | low |

**Scope detection**: The scope is derived from the most common parent directory of changed files. If all files share a directory (e.g., `src/main/`), the scope is that directory name (e.g., `main`). If files span multiple directories, scope is null.

**Description generation**: The description is composed from:
1. Count of files changed
2. Primary file extensions involved
3. Most common verb inferred from diff content (add/update/remove/fix)

Example output: `feat(renderer): add 3 new TypeScript components`

### 7.3 useGit Hook (Renderer)

**File**: `src/renderer/hooks/useGit.ts`
**Pattern**: Follows `useAtlas` pattern exactly.

```typescript
export function useGit(projectPath: string | null) {
  // State
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranchInfo[]>([]);
  const [log, setLog] = useState<GitCommitInfo[]>([]);
  const [selectedDiff, setSelectedDiff] = useState<GitDiffResult | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<GeneratedCommitMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Effects: subscribe to git:statusChanged event, load on projectPath change
  // Actions: refreshStatus, stageFiles, unstageFiles, stageAll, unstageAll,
  //          commit, generateMessage, push, pull, fetch, switchBranch,
  //          createBranch, viewDiff, discardFile, discardAll, initRepo,
  //          loadHistory

  return {
    status, branches, log, selectedDiff, generatedMessage,
    isLoading, operationInProgress, error,
    refreshStatus, stageFiles, unstageFiles, stageAll, unstageAll,
    commit, generateMessage, push, pull, fetch,
    switchBranch, createBranch, viewDiff, discardFile, discardAll,
    initRepo, loadHistory,
  };
}
```

### 7.4 Integration with Existing Systems

**App.tsx additions**:
- `const [showGitPanel, setShowGitPanel] = useState(false);`
- `const git = useGit(atlasProjectPath);` (reuses the same projectPath derivation from active session)
- New keyboard handler: `Ctrl+Shift+G` toggles `showGitPanel`
- `<GitPanel isOpen={showGitPanel} onClose={...} ... />` rendered alongside other panels
- `gitStartWatching` called when panel opens, `gitStopWatching` when panel closes

**ToolsDropdown addition**:
- New item in the dropdown list with a git-branch SVG icon
- Badge shows `gitStagedCount` when > 0

**Checkpoint integration** (in `GitManager.commit()`):
- If `request.createCheckpoint` is true and `request.sessionId` is not null, after a successful commit, the manager calls `checkpointManager.createCheckpoint(...)`.
- This requires passing `CheckpointManager` as a constructor dependency of `GitManager`.

**Main process wiring** (in `src/main/index.ts`):
- Import `GitManager`
- Instantiate: `gitManager = new GitManager(checkpointManager);`
- Call `gitManager.setMainWindow(mainWindow);`
- Pass to `setupIPCHandlers(...)` as a new parameter
- In the `closed` handler: `gitManager.destroy();`

---

## 8) Acceptance Criteria

### Status & Display
- [ ] When GitPanel opens for a git repository, the panel displays the current branch name, staged/unstaged/untracked file counts, and file list within 300ms
- [ ] When GitPanel opens for a non-git directory, the panel displays "This directory is not a git repository" with an "Initialize Git" button
- [ ] When `git init` is executed via the "Initialize Git" button, the panel transitions to showing the empty repository status
- [ ] When a file changes externally (outside ClaudeDesk), the `.git` watcher triggers a status refresh within 1000ms (500ms debounce + execution time)
- [ ] When the active session changes, the git panel reloads status for the new session's working directory

### Staging
- [ ] Clicking an unchecked file checkbox stages that file and the UI moves it to the "Staged" section
- [ ] Clicking a checked file checkbox in "Staged" unstages that file and the UI moves it back
- [ ] "Stage All" button stages all unstaged and untracked files in a single operation
- [ ] "Unstage All" button unstages all staged files in a single operation
- [ ] Staging/unstaging operations complete and refresh the UI within 500ms for 100 files or fewer

### Commit
- [ ] Commit button is disabled when staged file count is 0
- [ ] Commit button is disabled when the commit message input is empty
- [ ] Commit button is disabled when merge conflicts exist
- [ ] Clicking "Commit" executes `git commit` with the entered message and shows a success toast with the short hash
- [ ] After a successful commit, the staged files section is empty and the commit appears in the History tab
- [ ] When "Create checkpoint after commit" is checked, a checkpoint is created with the commit hash in its name

### AI Commit Message
- [ ] Clicking "Generate" analyzes staged changes and populates the commit message input with a conventional commit message within 100ms
- [ ] The generated message follows the format `type(scope): description`
- [ ] A confidence indicator (high/medium/low) is displayed next to the generated message
- [ ] The generated message is editable after generation
- [ ] If no files are staged, the "Generate" button is disabled

### Remote Operations
- [ ] Push button displays "Push ^N" where N is the count of commits ahead of upstream
- [ ] Push button is disabled when there are no commits ahead of upstream
- [ ] During push/pull/fetch, all git operation buttons are disabled and a spinner is shown
- [ ] When push fails with "no upstream", a dialog offers to set upstream automatically
- [ ] When push fails with "rejected", a toast displays "Pull first" guidance
- [ ] When authentication fails, a toast displays "Configure credentials outside ClaudeDesk"
- [ ] Pull succeeds and refreshes status showing any new or modified files

### Branches
- [ ] Clicking the branch name opens a dropdown listing all local branches
- [ ] Selecting a different branch executes `git checkout` and refreshes status
- [ ] Typing a new branch name and pressing Enter creates and switches to that branch
- [ ] Switching branches with uncommitted changes shows an error toast (does not silently drop changes)
- [ ] Detached HEAD state shows a yellow banner with a "Create Branch" button

### History
- [ ] History tab shows the last 50 commits with short hash, author, date, and subject
- [ ] Clicking a commit shows the files changed with insertion/deletion counts

### Diff
- [ ] Clicking a file in the Changes section shows its unified diff
- [ ] Staged file diffs show `git diff --cached` output
- [ ] Unstaged file diffs show `git diff` output
- [ ] Additions are colored `#9ece6a`, deletions `#f7768e`, context lines `#a9b1d6`
- [ ] Diffs exceeding 100KB are truncated with a "Diff too large" message

### Discard
- [ ] Right-clicking an unstaged file shows a context menu with "Discard Changes"
- [ ] Clicking "Discard Changes" shows a ConfirmDialog with the filename
- [ ] Confirming discards the file's changes and removes it from the unstaged list

### Error Handling
- [ ] If git is not installed, the panel shows "Git is not installed" and no operations are available
- [ ] All git operations enforce a 30-second timeout and display "timed out" on expiry
- [ ] Concurrent git operations to the same directory are serialized (not rejected)

### Integration
- [ ] Ctrl+Shift+G toggles the Git panel
- [ ] The ToolsDropdown shows a "Git" item with a badge showing staged file count when > 0
- [ ] Switching sessions updates the Git panel to the new session's working directory

---

## 9) Rollout & Compatibility

### Backward Compatibility
- No existing IPC methods are modified. All changes are additive.
- No existing types are modified. `AppSettings` gains one new optional field (`gitSettings`).
- No existing components are modified beyond adding new optional props to `ToolsDropdown`, `TabBar`, and `App.tsx`.
- The feature is inert for directories without `.git` -- the empty state is the default.

### Phase Breakdown

**Phase 1 (MVP)**: Core Git + Heuristic Commit Messages
- GitManager with all git command execution
- GitPanel with status, staging, commit, push/pull/fetch
- Heuristic commit message generation
- `.git` directory watching
- Branch display (current branch only, no switching)
- Keyboard shortcut and ToolsDropdown integration
- Estimated scope: ~1,500 LOC across 11 files, 21 IPC methods

**Phase 2 (Enhancement)**: Branches + History + Diffs
- Branch picker with switch and create
- Commit history list (50 entries)
- File diff viewer with syntax coloring
- Discard changes with confirmation
- Fetch with behind-count display
- Estimated scope: ~800 LOC additional

**Phase 3 (Future, Out of Current Scope)**: AI-Enhanced Commit Messages
- Claude API integration for commit message generation
- Semantic analysis of code changes
- Multi-paragraph commit body generation
- This phase is explicitly deferred and not part of this specification.

### Feature Flag

No feature flag is required. The feature is naturally gated:
- The Git panel only appears in the ToolsDropdown, requiring explicit user action to open.
- Git operations only work in directories with `.git`.
- No automatic behavior changes for existing users.

---

## 10) Risks & Open Questions

### Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Large repos (> 100K files) make `git status` slow | Status refresh takes > 1 second, UI feels laggy | Show loading spinner during status operations. Consider `--untracked-files=no` flag with a toggle for large repos. |
| `fs.watch` on `.git` directory may not work reliably on all platforms | External changes are not detected | Fall back to polling (5-second interval) when watch fails. Log warnings for debugging. |
| Windows path handling with spaces and special characters | Git commands fail on paths with spaces | All paths passed via `execFile` args array (not shell-concatenated). Test with spaces in paths. |
| User has git hooks (pre-commit, commit-msg) that require interactive input | Commit hangs until timeout | Set `GIT_TERMINAL_PROMPT=0` environment variable. Document this behavior. |
| Merge conflict resolution UI is minimal | Users still need external tools for conflicts | Explicitly communicate that conflict resolution is out of scope. Show clear guidance to resolve externally. |
| Race condition: user stages file, external process modifies it before commit | Commit includes unexpected content | The mutex serializes operations but cannot prevent external filesystem changes. This is inherent to git workflows and matches behavior of all git clients. |

### Open Questions

1. **Diff rendering for binary files**: Display "Binary file differs" or attempt to show binary diff stats? **Recommendation**: Display "Binary file changed (N bytes)" with no inline diff.

2. **Rename detection**: `git status --porcelain=v2` does not always detect renames. Use `git diff --find-renames --cached --name-status` for staged files? **Recommendation**: Yes, use `--find-renames` for staged file lists to show proper rename indicators.

3. **Auto-refresh frequency on watch**: 500ms debounce is aggressive for repos with many rapid file changes (e.g., build output). Allow user to configure debounce? **Recommendation**: Use 500ms default, expose in `gitSettings.autoRefreshIntervalMs` for power users.

4. **Git commit message encoding**: Some repositories use non-UTF-8 encodings. Handle `i18n.commitEncoding`? **Recommendation**: Assume UTF-8 for Phase 1. Add encoding support if user reports arise.

5. **Checkpoint name format for post-commit checkpoints**: Use `"git: <short-hash> <subject>"` or just the subject? **Recommendation**: `"git: <short-hash> <subject>"` (max 50 chars after truncation).

6. **Should the Git panel support multiple remotes?** The current spec only handles `origin`. **Recommendation**: Phase 1 uses `origin` only. Add remote picker in a future phase if requested.

7. **Where to place "Git" in the ToolsDropdown order?** **Recommendation**: Insert Git between Teams and History, since it is a developer workflow tool used frequently.

---

## Appendix A: Git Command Reference

Exact git commands used by `GitManager`:

| Operation | Command |
|---|---|
| Check repo | `git rev-parse --is-inside-work-tree` |
| Status | `git status --porcelain=v2 --branch` |
| Stage files | `git add -- <file1> <file2> ...` |
| Unstage files | `git reset HEAD -- <file1> <file2> ...` |
| Stage all | `git add -A` |
| Unstage all | `git reset HEAD` |
| Commit | `git commit -m <message>` |
| Diff (unstaged) | `git diff -- <file>` |
| Diff (staged) | `git diff --cached -- <file>` |
| Diff stats (staged) | `git diff --cached --stat --numstat` |
| Push | `git push origin <branch>` |
| Push (set upstream) | `git push -u origin <branch>` |
| Pull | `git pull origin <branch>` |
| Fetch | `git fetch origin` |
| Branches | `git branch --list --format="%(refname:short) %(upstream:short) %(upstream:track)"` |
| Switch branch | `git checkout <branch>` |
| Create branch | `git checkout -b <branch>` |
| Log | `git log --format="%H\|%h\|%an\|%ae\|%aI\|%s" -<count>` |
| Log stats | `git diff-tree --no-commit-id -r --stat <hash>` |
| Discard file | `git checkout -- <file>` |
| Discard all | `git checkout -- .` |
| Init | `git init` |
| Ahead/behind | `git rev-list --count --left-right <branch>...origin/<branch>` |
| Git version | `git --version` |
| Find git binary | `where git` (Windows) / `which git` (Unix) |

## Appendix B: File Inventory

New files to create:

```
src/shared/types/git-types.ts                  (~180 LOC)  - Type definitions
src/main/git-manager.ts                        (~600 LOC)  - Main process manager
src/renderer/hooks/useGit.ts                   (~200 LOC)  - React hook
src/renderer/components/GitPanel.tsx            (~350 LOC)  - Main panel
src/renderer/components/git/GitFileList.tsx     (~150 LOC)  - File list
src/renderer/components/git/GitDiffView.tsx     (~120 LOC)  - Diff renderer
src/renderer/components/git/GitBranchPicker.tsx (~130 LOC)  - Branch dropdown
src/renderer/components/git/GitCommitArea.tsx   (~150 LOC)  - Commit UI
src/renderer/components/git/GitHistoryList.tsx  (~120 LOC)  - History list
src/renderer/components/git/GitStatusBanner.tsx (~80 LOC)   - Warning banners
```

Files to modify:

```
src/shared/ipc-contract.ts                     - Add 21 new IPC methods + imports
src/shared/ipc-types.ts                        - Add gitSettings to AppSettings
src/main/ipc-handlers.ts                       - Add git handler registrations
src/main/index.ts                              - Instantiate GitManager, pass to setupIPCHandlers
src/renderer/App.tsx                           - Add useGit hook, GitPanel, keyboard shortcut
src/renderer/components/ui/ToolsDropdown.tsx   - Add Git entry with badge
src/renderer/components/ui/TabBar.tsx          - Add onOpenGit + gitStagedCount props
src/renderer/styles/globals.css                - Add git-panel styles
docs/repo-index.md                             - Update domain-to-file mapping
```

Estimated total: ~2,080 LOC new, ~200 LOC modified.
