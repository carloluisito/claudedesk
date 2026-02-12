# Git Integration — Implementation Task List

**Status**: Ready for implementation
**Specs**: `docs/git-integration-product-spec.md`, `docs/git-integration-ui-spec.md`
**Plan**: `.claude/plans/quirky-exploring-origami.md`

---

## Overview

Implementing Git Integration in 4 phases:
1. **Phase 1**: Types + IPC + GitManager (backend foundation)
2. **Phase 2**: Basic UI (GitPanel + CommitDialog, can stage/commit)
3. **Phase 3**: Enhanced UI (branches, history, diffs, AI message generation)
4. **Phase 4**: Polish (error handling, edge cases, documentation)

**Total Estimate**: ~2,280 LOC new, ~200 LOC modified

---

## Phase 1: Core Backend (Types + IPC + GitManager)

### Task 1.1: Create Git Types
**File**: `src/shared/types/git-types.ts` (~180 LOC)

**Deliverables**:
- [ ] `GitFileStatus` type (added/modified/deleted/renamed/untracked/unmerged)
- [ ] `GitFileArea` type (staged/unstaged/untracked/conflicted)
- [ ] `GitFileEntry` interface
- [ ] `GitBranchInfo` interface
- [ ] `GitStatus` interface
- [ ] `GitCommitInfo` interface
- [ ] `GitDiffResult` interface
- [ ] `CommitType` type (feat/fix/refactor/docs/etc.)
- [ ] `CommitConfidence` type (high/medium/low)
- [ ] `GeneratedCommitMessage` interface
- [ ] `GitOperationResult` interface
- [ ] `GitErrorCode` type (NOT_A_REPO, MERGE_CONFLICTS, etc.)
- [ ] `GitCommitRequest` interface
- [ ] `GitRemoteProgress` interface

**Reference**: Product spec section 4.1

---

### Task 1.2: Add IPC Contract
**Files**: `src/shared/ipc-contract.ts`, `src/shared/ipc-types.ts`

**Deliverables in `ipc-contract.ts`**:
- [ ] Import git types from `types/git-types`
- [ ] Add 19 invoke methods to `IPCContractMap`:
  - `getGitStatus`, `getGitBranches`
  - `gitStageFiles`, `gitUnstageFiles`, `gitStageAll`, `gitUnstageAll`
  - `gitCommit`, `gitGenerateMessage`
  - `gitPush`, `gitPull`, `gitFetch`
  - `gitSwitchBranch`, `gitCreateBranch`
  - `gitLog`, `gitDiff`, `gitCommitDiff`
  - `gitDiscardFile`, `gitDiscardAll`
  - `gitInit`
  - `gitStartWatching`, `gitStopWatching`
- [ ] Add 2 event methods:
  - `onGitStatusChanged`
  - `onGitRemoteProgress`
- [ ] Add channel mappings (all with `git:*` prefix)
- [ ] Add contract kinds (invoke vs event)

**Deliverables in `ipc-types.ts`**:
- [ ] Add `gitSettings` optional field to `AppSettings`:
  - `autoRefreshIntervalMs: number` (default 0)
  - `commandTimeoutMs: number` (default 30000)
  - `createCheckpointAfterCommit: boolean` (default false)
  - `maxDiffSizeBytes: number` (default 102400)

**Reference**: Product spec section 4.2

---

### Task 1.3: Implement GitManager (Main Process)
**File**: `src/main/git-manager.ts` (~600 LOC)

**Deliverables — Core Infrastructure**:
- [ ] Class structure:
  - `private emitter: IPCEmitter | null`
  - `private watchers: Map<string, FSWatcher>` (workDir → watcher)
  - `private mutexes: Map<string, Promise<void>>` (workDir → operation lock)
  - `private gitBinary: string | null` (resolved path to git)
  - `private checkpointManager: CheckpointManager`
- [ ] Constructor (detect git binary: `where git` on Windows, `which git` on Unix)
- [ ] `setMainWindow(window: BrowserWindow): void`
- [ ] `destroy(): void` (cleanup watchers)

**Deliverables — Git Command Execution**:
- [ ] `private async execGit(workDir, args, timeoutMs?): Promise<{stdout, stderr, exitCode}>`
  - Use `child_process.execFile` (NOT `exec` — prevents shell injection)
  - Pass args as array
  - Set cwd to workDir
  - Enforce timeout (default 30s)
  - Return stdout, stderr, exitCode
- [ ] `private async withMutex<T>(workDir, fn): Promise<T>` (serialize operations per directory)
- [ ] `private detectErrorCode(stderr, exitCode): GitErrorCode` (map git errors to typed codes)

**Deliverables — Parsers**:
- [ ] `private parseStatus(output: string): GitStatus` (parse `git status --porcelain=v2 --branch`)
- [ ] `private parseBranches(output: string): GitBranchInfo[]` (parse `git branch --list --format=...`)
- [ ] `private parseLog(output: string): GitCommitInfo[]` (parse `git log --format=...`)

**Deliverables — Core Operations**:
- [ ] `async getStatus(workDir): Promise<GitStatus>`
  - Run: `git rev-parse --is-inside-work-tree`
  - Run: `git status --porcelain=v2 --branch`
  - Parse into `GitStatus`
- [ ] `async getBranches(workDir): Promise<GitBranchInfo[]>`
  - Run: `git branch --list --format="%(refname:short) %(upstream:short) %(upstream:track)"`
  - Parse into array

**Deliverables — Staging**:
- [ ] `async stageFiles(workDir, files[]): Promise<GitOperationResult>`
  - Run: `git add -- <file1> <file2> ...`
- [ ] `async unstageFiles(workDir, files[]): Promise<GitOperationResult>`
  - Run: `git reset HEAD -- <file1> <file2> ...`
- [ ] `async stageAll(workDir): Promise<GitOperationResult>`
  - Run: `git add -A`
- [ ] `async unstageAll(workDir): Promise<GitOperationResult>`
  - Run: `git reset HEAD`

**Deliverables — Commit**:
- [ ] `async commit(request: GitCommitRequest): Promise<GitOperationResult>`
  - Run: `git commit -m <message>`
  - Parse commit hash from output
  - If `request.createCheckpoint`, call `checkpointManager.createCheckpoint(...)`
  - Return `{success: true, message: ..., errorCode: null}` or error
- [ ] `async generateMessage(workDir): Promise<GeneratedCommitMessage>`
  - Run: `git diff --cached --stat --numstat` (get staged file stats)
  - Run: `git diff --cached --name-only` (get file names)
  - Analyze file types, line counts, directory patterns
  - Infer commit type using heuristics (see section 7.2 in product spec)
  - Generate conventional commit format: `type(scope): description`
  - Return with confidence level

**Deliverables — Remote**:
- [ ] `async push(workDir, setUpstream?): Promise<GitOperationResult>`
  - Run: `git push origin <branch>` or `git push -u origin <branch>`
- [ ] `async pull(workDir): Promise<GitOperationResult>`
  - Run: `git pull origin <branch>`
- [ ] `async fetch(workDir): Promise<GitOperationResult>`
  - Run: `git fetch origin`

**Deliverables — Branches**:
- [ ] `async switchBranch(workDir, branch): Promise<GitOperationResult>`
  - Run: `git checkout <branch>`
- [ ] `async createBranch(workDir, branch): Promise<GitOperationResult>`
  - Run: `git checkout -b <branch>`

**Deliverables — History & Diff**:
- [ ] `async log(workDir, count?): Promise<GitCommitInfo[]>`
  - Run: `git log --format="%H|%h|%an|%ae|%aI|%s" -<count>`
  - Parse into array
- [ ] `async diff(workDir, filePath, staged): Promise<GitDiffResult>`
  - Run: `git diff -- <file>` (unstaged) or `git diff --cached -- <file>` (staged)
  - Truncate if > `maxDiffSizeBytes` (default 100KB)
- [ ] `async commitDiff(workDir, hash): Promise<GitCommitInfo>`
  - Run: `git diff-tree --no-commit-id -r --stat <hash>`

**Deliverables — Discard**:
- [ ] `async discardFile(workDir, filePath): Promise<GitOperationResult>`
  - Run: `git checkout -- <file>`
- [ ] `async discardAll(workDir): Promise<GitOperationResult>`
  - Run: `git checkout -- .`

**Deliverables — Init**:
- [ ] `async init(workDir): Promise<GitOperationResult>`
  - Run: `git init`

**Deliverables — Watching**:
- [ ] `startWatching(workDir): boolean`
  - Use `fs.watch()` on `.git` directory
  - Debounce 500ms
  - On change: call `getStatus()` and emit `git:statusChanged` event
  - If watch fails, fall back to polling (5s interval) and log warning
- [ ] `stopWatching(workDir): boolean`
  - Clean up watcher

**Reference**: Product spec section 7.1, 7.2

---

### Task 1.4: Wire GitManager into Main Process
**Files**: `src/main/index.ts`, `src/main/ipc-handlers.ts`

**Deliverables in `index.ts`**:
- [ ] Import `GitManager` from `./git-manager`
- [ ] Import `CheckpointManager` (already exists)
- [ ] Instantiate: `gitManager = new GitManager(checkpointManager)`
- [ ] Call `gitManager.setMainWindow(mainWindow)`
- [ ] Pass to `setupIPCHandlers(...)` as new parameter
- [ ] In `closed` handler: call `gitManager.destroy()`

**Deliverables in `ipc-handlers.ts`**:
- [ ] Add `gitManager: GitManager` parameter to `setupIPCHandlers()`
- [ ] Register 19 handlers using `registry.handle()` or `registry.on()`:
  - `getGitStatus` → `gitManager.getStatus()`
  - `getGitBranches` → `gitManager.getBranches()`
  - `gitStageFiles` → `gitManager.stageFiles()`
  - `gitUnstageFiles` → `gitManager.unstageFiles()`
  - `gitStageAll` → `gitManager.stageAll()`
  - `gitUnstageAll` → `gitManager.unstageAll()`
  - `gitCommit` → `gitManager.commit()`
  - `gitGenerateMessage` → `gitManager.generateMessage()`
  - `gitPush` → `gitManager.push()`
  - `gitPull` → `gitManager.pull()`
  - `gitFetch` → `gitManager.fetch()`
  - `gitSwitchBranch` → `gitManager.switchBranch()`
  - `gitCreateBranch` → `gitManager.createBranch()`
  - `gitLog` → `gitManager.log()`
  - `gitDiff` → `gitManager.diff()`
  - `gitCommitDiff` → `gitManager.commitDiff()`
  - `gitDiscardFile` → `gitManager.discardFile()`
  - `gitDiscardAll` → `gitManager.discardAll()`
  - `gitInit` → `gitManager.init()`
  - `gitStartWatching` → `gitManager.startWatching()`
  - `gitStopWatching` → `gitManager.stopWatching()`

**Reference**: Product spec section 7.4

---

### Task 1.5: Test Backend (Manual Console Testing)
**Goal**: Verify IPC and GitManager work before building UI

**Test Cases**:
- [ ] Open Electron DevTools console (main process)
- [ ] Call `gitManager.getStatus('/path/to/git/repo')`
  - Verify returns `GitStatus` object
  - Verify `isRepo: true`
  - Verify files lists populated
- [ ] Call `gitManager.stageFiles('/path/to/repo', ['file1.txt'])`
  - Verify returns `{success: true}`
- [ ] Call `gitManager.commit({workingDirectory: '...', message: 'test', createCheckpoint: false, sessionId: null})`
  - Verify commit hash returned
- [ ] Call `gitManager.generateMessage('/path/to/repo')`
  - Verify returns conventional commit message
  - Verify confidence level
- [ ] Verify watchers work: modify file externally, verify event emitted

---

## Phase 2: Basic UI (GitPanel + CommitDialog)

### Task 2.1: Create useGit Hook
**File**: `src/renderer/hooks/useGit.ts` (~200 LOC)

**Deliverables — State**:
- [ ] `const [status, setStatus] = useState<GitStatus | null>(null)`
- [ ] `const [branches, setBranches] = useState<GitBranchInfo[]>([])`
- [ ] `const [log, setLog] = useState<GitCommitInfo[]>([])`
- [ ] `const [selectedDiff, setSelectedDiff] = useState<GitDiffResult | null>(null)`
- [ ] `const [generatedMessage, setGeneratedMessage] = useState<GeneratedCommitMessage | null>(null)`
- [ ] `const [isLoading, setIsLoading] = useState(false)`
- [ ] `const [operationInProgress, setOperationInProgress] = useState<string | null>(null)`
- [ ] `const [error, setError] = useState<string | null>(null)`

**Deliverables — Effects**:
- [ ] Subscribe to `git:statusChanged` event on mount
- [ ] Load status on `projectPath` change
- [ ] Cleanup subscription on unmount

**Deliverables — Actions**:
- [ ] `refreshStatus(): Promise<void>`
- [ ] `stageFiles(files: string[]): Promise<void>`
- [ ] `unstageFiles(files: string[]): Promise<void>`
- [ ] `stageAll(): Promise<void>`
- [ ] `unstageAll(): Promise<void>`
- [ ] `commit(request: GitCommitRequest): Promise<void>`
- [ ] `generateMessage(): Promise<void>`
- [ ] `push(setUpstream?: boolean): Promise<void>`
- [ ] `pull(): Promise<void>`
- [ ] `fetch(): Promise<void>`
- [ ] `switchBranch(branch: string): Promise<void>`
- [ ] `createBranch(branch: string): Promise<void>`
- [ ] `viewDiff(filePath: string, staged: boolean): Promise<void>`
- [ ] `discardFile(filePath: string): Promise<void>`
- [ ] `discardAll(): Promise<void>`
- [ ] `initRepo(): Promise<void>`
- [ ] `loadHistory(count?: number): Promise<void>`

**Return**:
```typescript
return {
  status, branches, log, selectedDiff, generatedMessage,
  isLoading, operationInProgress, error,
  refreshStatus, stageFiles, unstageFiles, stageAll, unstageAll,
  commit, generateMessage, push, pull, fetch,
  switchBranch, createBranch, viewDiff, discardFile, discardAll,
  initRepo, loadHistory,
};
```

**Reference**: Product spec section 7.3

---

### Task 2.2: Create GitPanel Component (Basic)
**File**: `src/renderer/components/GitPanel.tsx` (~350 LOC for full version, ~200 LOC for Phase 2)

**Phase 2 Scope** (basic version, no branches/history yet):

**Deliverables — Structure**:
- [ ] Props: `isOpen: boolean`, `onClose: () => void`, `projectPath: string | null`
- [ ] Use `useGit(projectPath)` hook
- [ ] Slide-in panel from right (420px width)
- [ ] Dark theme background `#1a1b26`
- [ ] Slide animation: `translateX(100%)` → `translateX(0)` over 200ms ease-out

**Deliverables — Header Section** (60px fixed):
- [ ] Title: "Git" (JetBrains Mono, 16px, `#c0caf5`, font-weight 600)
- [ ] Close button (32x32px, icon 16x16px, `#565f89`, hover `#c0caf5`)

**Deliverables — Branch Bar** (48px fixed, simplified for Phase 2):
- [ ] Current branch name display (no dropdown yet)
- [ ] Ahead/behind indicators (if applicable)
- [ ] Fetch/Pull/Push buttons (28x28px each)

**Deliverables — Changes Section** (scrollable):
- [ ] 3 collapsible subsections:
  - **Staged Changes** (green left border `#9ece6a`)
  - **Unstaged Changes** (yellow left border `#e0af68`)
  - **Untracked Files** (gray left border `#565f89`)
- [ ] Each subsection header:
  - Chevron icon (rotates 90deg when expanded)
  - Label + count badge
  - Action links: "Stage All" / "Unstage All" / "Discard All"
- [ ] File entries (per subsection):
  - Checkbox (16x16px) — check to stage, uncheck to unstage
  - File path (primary text 13px `#c0caf5`, secondary dir path 11px `#565f89`)
  - Change stats (+N in `#9ece6a`, -N in `#f7768e`)
  - Hover: background `#24283b`, chevron appears

**Deliverables — Action Bar** (56px fixed):
- [ ] Left side: Bulk action buttons ("Stage All", "Unstage All", "Discard All")
- [ ] Right side:
  - **Generate Message** button (icon + "Generate" text, border `#7aa2f7`)
  - **Commit** button (background `#7aa2f7`, shows count "Commit (3)")
- [ ] Commit button opens `CommitDialog` modal

**Deliverables — Empty State** (if not a git repo):
- [ ] Icon (64x64px, `#565f89`)
- [ ] Title: "Not a Git Repository" (16px, `#c0caf5`)
- [ ] Description (13px, `#565f89`)
- [ ] "Initialize Repository" button (calls `initRepo()`)

**Reference**: UI spec section 2 (GitPanel)

---

### Task 2.3: Create CommitDialog Component
**File**: `src/renderer/components/ui/CommitDialog.tsx` (~200 LOC)

**Deliverables — Structure**:
- [ ] Props: `isOpen: boolean`, `onClose: () => void`, `onCommit: (request: GitCommitRequest) => Promise<void>`, `stagedFiles: GitFileEntry[]`, `onGenerateMessage: () => Promise<void>`
- [ ] Modal overlay (full-screen, background `#000000` at 60% opacity)
- [ ] Card (centered, 560px width, background `#24283b`, rounded 8px)

**Deliverables — Components**:
- [ ] **Header**: Title "Commit Changes" + close button
- [ ] **Summary bar**: Shows "{count} files staged · +{insertions} −{deletions}"
- [ ] **Title input**:
  - Label: "Commit message"
  - Placeholder: "type(scope): description"
  - Max-length: 72 chars
  - Character counter: "{chars}/72" (turns `#f7768e` if >72)
- [ ] **Body textarea**:
  - Label: "Description (optional)"
  - Min-height: 120px
  - Resize: vertical
- [ ] **Options row**:
  - Checkbox: "Create checkpoint after commit"
  - "Generate Message" button (calls `onGenerateMessage()`)
- [ ] **Footer actions**:
  - Cancel button (text button, `#7aa2f7`)
  - Commit button (background `#7aa2f7`, disabled if title empty)

**Deliverables — Behavior**:
- [ ] Auto-focus title input on open
- [ ] Ctrl+Enter submits commit (if title filled)
- [ ] Escape closes dialog (with confirmation if message non-empty)
- [ ] When Generate clicked: show loading state, populate title/body on success
- [ ] When Commit clicked: call `onCommit()`, show loading state, close on success

**Reference**: UI spec section 2 (CommitDialog)

---

### Task 2.4: Integrate Git into App.tsx
**File**: `src/renderer/App.tsx`

**Deliverables**:
- [ ] Import `GitPanel` and `useGit`
- [ ] Add state: `const [showGitPanel, setShowGitPanel] = useState(false)`
- [ ] Derive `projectPath` from active session (reuse existing logic for `atlasProjectPath`)
- [ ] Initialize hook: `const git = useGit(projectPath)`
- [ ] Add keyboard shortcut: Ctrl+Shift+G toggles `showGitPanel`
- [ ] Render `<GitPanel isOpen={showGitPanel} onClose={...} projectPath={projectPath} />`
- [ ] Call `git.startWatching()` when panel opens
- [ ] Call `git.stopWatching()` when panel closes

**Reference**: Product spec section 7.4

---

### Task 2.5: Add Git Button to ToolsDropdown
**File**: `src/renderer/components/ui/ToolsDropdown.tsx`

**Deliverables**:
- [ ] Add props: `onOpenGit?: () => void`, `gitStagedCount?: number`
- [ ] Add new dropdown item:
  - Icon: git-branch SVG (20x20px, `#7aa2f7`)
  - Text: "Git Integration"
  - Badge: Shows `gitStagedCount` when > 0 (blue background `#7aa2f7`)
  - Click: calls `onOpenGit()`
- [ ] Position: Insert between "Teams" and "History"

**Reference**: Product spec section 7.4, UI spec section 2

---

### Task 2.6: Test Basic UI
**Goal**: Verify can stage files and commit

**Test Cases**:
- [ ] Open ClaudeDesk in a git repository
- [ ] Press Ctrl+Shift+G → GitPanel opens
- [ ] Modify a file externally
- [ ] Verify file appears in "Unstaged Changes" section within 1s
- [ ] Click checkbox → file moves to "Staged Changes" section
- [ ] Click "Commit" button → CommitDialog opens
- [ ] Type commit message "test: manual commit"
- [ ] Click "Commit" → dialog closes, success toast appears
- [ ] Verify commit created (check external `git log`)
- [ ] Verify GitPanel refreshes (staged section empty)

---

## Phase 3: Enhanced UI (Branches, History, Diffs, AI)

### Task 3.1: Add BranchSwitcher Component
**File**: `src/renderer/components/ui/BranchSwitcher.tsx` (~130 LOC)

**Deliverables — Structure**:
- [ ] Props: `branches: GitBranchInfo[]`, `currentBranch: string | null`, `onSwitch: (branch: string) => Promise<void>`, `onCreate: (branch: string) => Promise<void>`
- [ ] Dropdown (320px width, max-height 400px, background `#24283b`)
- [ ] Positioned below trigger button with 4px gap

**Deliverables — Components**:
- [ ] **Search input**: Placeholder "Search branches...", filters in real-time
- [ ] **Local branches section**:
  - Label: "LOCAL BRANCHES" (sticky header)
  - Branch list (scrollable)
  - Each entry: branch name, ahead/behind badge, current branch has checkmark + blue accent
  - Click: calls `onSwitch(branch)`
- [ ] **Remote branches section**: Collapsible (collapsed by default)
- [ ] **Create new branch section**:
  - "Create new branch..." row
  - Click: toggles inline input field
  - Input: auto-focused, validates branch name
  - "Create" / "Cancel" buttons

**Deliverables — Behavior**:
- [ ] Arrow Up/Down navigate branch list
- [ ] Enter selects highlighted branch
- [ ] Escape closes dropdown
- [ ] If uncommitted changes: show confirmation dialog before switching

**Reference**: UI spec section 2 (BranchSwitcher)

---

### Task 3.2: Add BranchSwitcher to GitPanel
**File**: `src/renderer/components/GitPanel.tsx` (modify)

**Deliverables**:
- [ ] Replace branch name text with `<BranchSwitcher>` component in Branch Bar
- [ ] Pass props: `branches`, `currentBranch`, `onSwitch`, `onCreate`
- [ ] Load branches on panel open: `useEffect(() => { git.loadBranches(); }, [projectPath])`

---

### Task 3.3: Add CommitHistoryView Component
**File**: `src/renderer/components/ui/CommitHistoryView.tsx` (~120 LOC)

**Deliverables — Structure**:
- [ ] Props: `commits: GitCommitInfo[]`, `onCopyHash: (hash: string) => void`, `onRevert: (hash: string) => void`
- [ ] Scrollable section (300px max-height)

**Deliverables — Components**:
- [ ] **Section header**: "Recent Commits" + "View All" link
- [ ] **Commit entries** (collapsed state):
  - Short hash (7 chars, 11px, `#565f89`) + relative time
  - Commit message (truncate after 320px)
  - Conventional commit type colored (feat=cyan, fix=green, docs=blue, etc.)
  - Author name + file count + change stats (+45 -12)
- [ ] **Commit entries** (expanded state):
  - Full commit message (all lines, line-height 1.5)
  - Files changed list (if <15 files)
  - Action buttons: "Copy Hash", "Revert", "View in Terminal"

**Deliverables — Behavior**:
- [ ] Click entry: expand/collapse
- [ ] Click "Copy Hash": copies to clipboard, shows toast
- [ ] Click "Revert": shows confirmation dialog, then reverts commit

**Deliverables — Empty State**:
- [ ] Icon: git commit icon (48x48px, `#565f89`)
- [ ] Text: "No commits yet" + "Make your first commit to see history here"

**Reference**: UI spec section 2 (GitPanel — Recent Commits Section)

---

### Task 3.4: Add CommitHistoryView to GitPanel
**File**: `src/renderer/components/GitPanel.tsx` (modify)

**Deliverables**:
- [ ] Add Recent Commits section after Action Bar
- [ ] Render `<CommitHistoryView>` component
- [ ] Pass props: `commits={git.log}`, `onCopyHash`, `onRevert`
- [ ] Load history on panel open: `useEffect(() => { git.loadHistory(10); }, [projectPath])`

---

### Task 3.5: Add DiffViewer Component
**File**: `src/renderer/components/ui/DiffViewer.tsx` (~120 LOC)

**Deliverables — Structure**:
- [ ] Props: `diff: GitDiffResult | null`, `onClose: () => void`
- [ ] Inline expandable accordion (appears below file entry)
- [ ] Max-height: 400px (scrollable)
- [ ] Background: `#1a1b26`, border `#292e42`, rounded 4px
- [ ] Expand animation: 0 → full height over 200ms ease-out

**Deliverables — Components**:
- [ ] **Diff header**:
  - File path (12px, `#7dcfff`)
  - "Copy" button (copies diff to clipboard)
  - Collapse button ("x" icon)
- [ ] **Diff content** (unified format):
  - Monospace font (JetBrains Mono, 12px)
  - Line numbers column (40px wide, `#565f89`)
  - Added lines: background `#9ece6a` at 12% opacity, "+" in `#9ece6a`
  - Removed lines: background `#f7768e` at 12% opacity, "-" in `#f7768e`
  - Context lines: transparent background, `#c0caf5`
  - Hunk headers (@@): background `#7aa2f7` at 8% opacity, italic

**Deliverables — States**:
- [ ] **Loading**: Skeleton loader (3-5 animated lines)
- [ ] **Too large**: Show "Diff too large to display" message with "View in Terminal" button
- [ ] **Binary file**: Show "Binary file" message

**Reference**: UI spec section 2 (DiffViewer)

---

### Task 3.6: Add DiffViewer to GitPanel
**File**: `src/renderer/components/GitPanel.tsx` (modify)

**Deliverables**:
- [ ] Add expand indicator (chevron icon) to file entries
- [ ] Track expanded file: `const [expandedFile, setExpandedFile] = useState<string | null>(null)`
- [ ] On file name click:
  - Call `git.viewDiff(filePath, isStaged)`
  - Set `expandedFile` to `filePath`
- [ ] Render `<DiffViewer>` below expanded file entry
- [ ] Pass props: `diff={git.selectedDiff}`, `onClose={() => setExpandedFile(null)}`

---

### Task 3.7: Implement AI Commit Message Generation
**File**: `src/main/git-manager.ts` (modify `generateMessage()` method)

**Deliverables — Heuristic Analysis**:
- [ ] Get staged diff: `git diff --cached --stat --numstat`
- [ ] Parse file paths, insertions, deletions
- [ ] Analyze file types (extensions):
  - All `*.test.*`, `*.spec.*`, `__tests__/*` → type: `test`, confidence: high
  - All `*.md`, `*.txt`, `docs/*` → type: `docs`, confidence: high
  - All `*.css`, `*.scss`, `*.less` (balanced +/-) → type: `style`, confidence: medium
  - All `Dockerfile`, `*.yml`, `.github/*`, `Jenkinsfile` → type: `ci`, confidence: high
  - All `package.json`, `*.lock`, `webpack.*`, `tsconfig.*` → type: `build`, confidence: medium
  - Deletions > 2x insertions (>50 lines) → type: `refactor`, confidence: medium
  - Only additions, no modifications → type: `feat`, confidence: medium
  - ≤3 files, <20 lines → type: `fix`, confidence: low
  - Default → type: `chore`, confidence: low
- [ ] Infer scope: Most common parent directory of changed files
  - All files in `src/main/` → scope: `main`
  - Files span multiple directories → scope: null
- [ ] Generate description:
  - "{count} {file type} {verb}"
  - Example: "add 3 TypeScript components"
- [ ] Format: `{type}({scope}): {description}` or `{type}: {description}` (if scope is null)
- [ ] Return `GeneratedCommitMessage` with confidence + reasoning

**Reference**: Product spec section 7.2

---

### Task 3.8: Wire AI Generation to UI
**Files**: `src/renderer/hooks/useGit.ts`, `src/renderer/components/ui/CommitDialog.tsx`

**Deliverables in `useGit.ts`**:
- [ ] Add `generateMessage()` action:
  - Call `window.electron.gitGenerateMessage(projectPath)`
  - Set `generatedMessage` state
  - Show error toast on failure

**Deliverables in `CommitDialog.tsx`**:
- [ ] When "Generate Message" clicked:
  - Call `onGenerateMessage()`
  - Show loading state (icon rotates, text "Generating...")
  - On success: populate title and body fields with fade-in animation
  - Display confidence badge (high/medium/low) next to title

**Reference**: UI spec section 2 (CommitDialog)

---

### Task 3.9: Test Enhanced UI
**Goal**: Verify branches, history, diffs, AI generation work

**Test Cases**:
- [ ] **Branch switching**:
  - Click branch name → BranchSwitcher opens
  - Select different branch → branch switches, status refreshes
  - Type new branch name → create and switch
- [ ] **Commit history**:
  - Scroll Recent Commits section
  - Click commit → expands to show details
  - Click "Copy Hash" → hash copied, toast appears
- [ ] **Diff viewer**:
  - Click file name → diff expands below
  - Verify added lines green, removed lines red
  - Click collapse button → diff collapses
- [ ] **AI message generation**:
  - Stage files (mix of .ts, .md, .test.ts)
  - Click "Generate Message" in CommitDialog
  - Verify message follows conventional format
  - Verify confidence level displayed
  - Verify message is editable

---

## Phase 4: Polish (Error Handling, Edge Cases, Documentation)

### Task 4.1: Add Error & Warning States
**Files**: `src/renderer/components/GitPanel.tsx`, various new components

**Deliverables — Merge Conflict Banner**:
- [ ] Create `ConflictBanner.tsx` component
- [ ] Show at top of Changes Section when `status.hasConflicts`
- [ ] Yellow warning banner: "{count} merge conflicts need resolution"
- [ ] "Abort Merge" button (shows confirmation dialog)
- [ ] Disable commit button when conflicts exist

**Deliverables — Detached HEAD Banner**:
- [ ] Create `DetachedHeadBanner.tsx` component
- [ ] Show below Branch Bar when `status.isDetached`
- [ ] Blue info banner: "Detached HEAD at {short_hash}"
- [ ] "Create Branch" button (opens branch creation input)

**Deliverables — Error Toasts**:
- [ ] Create `ErrorToast.tsx` component (or reuse existing toast system)
- [ ] Show on operation failures:
  - "Push failed: {error_reason}" (red toast, auto-dismiss 6s)
  - "Pull failed: {error_reason}"
  - "Authentication required. Configure credentials."
  - "Git is not installed or not in PATH"

**Deliverables — Authentication Error Dialog**:
- [ ] Create `AuthErrorDialog.tsx` modal
- [ ] Show when `errorCode === 'AUTH_FAILED'`
- [ ] Title: "Authentication Required"
- [ ] Message + suggestion box with git config command
- [ ] "Open Terminal" / "Dismiss" buttons

**Reference**: UI spec section 2 (Error & Warning States)

---

### Task 4.2: Add Confirmation Dialogs
**Files**: Various, reuse existing `ConfirmDialog` pattern

**Deliverables**:
- [ ] **Discard all changes**:
  - Title: "Discard All Changes?"
  - Body: "This will permanently discard all unstaged changes. This action cannot be undone."
  - Actions: "Discard" (red), "Cancel"
- [ ] **Switch branch with uncommitted changes**:
  - Title: "Uncommitted Changes"
  - Body: "You have uncommitted changes. What would you like to do?"
  - Actions: "Stash & Switch", "Discard & Switch", "Cancel"
- [ ] **Revert commit**:
  - Title: "Revert Commit?"
  - Body: "This will create a new commit that undoes the changes from {short_hash}. Continue?"
  - Actions: "Revert" (red), "Cancel"
- [ ] **Abort merge**:
  - Title: "Abort Merge?"
  - Body: "This will abort the current merge and return to the state before merging. Continue?"
  - Actions: "Abort Merge" (red), "Cancel"
- [ ] **Close CommitDialog with unsaved message**:
  - Title: "Discard Commit Message?"
  - Body: "You have an unsaved commit message. Discard it?"
  - Actions: "Discard", "Cancel"

**Reference**: UI spec section 4 (Content & Microcopy)

---

### Task 4.3: Add Git Panel Styles
**File**: `src/renderer/styles/globals.css`

**Deliverables** (~100 LOC):
- [ ] `.git-panel` base styles (420px width, slide animation)
- [ ] `.git-panel-header` (60px fixed, flexbox)
- [ ] `.git-panel-branch-bar` (48px fixed, flexbox)
- [ ] `.git-panel-changes-section` (scrollable)
- [ ] `.git-panel-subsection` (collapsible)
- [ ] `.git-panel-file-entry` (flexbox, hover states)
- [ ] `.git-panel-action-bar` (56px fixed, flexbox)
- [ ] `.git-panel-history` (300px max-height, scrollable)
- [ ] Diff viewer styles (unified format, line backgrounds)
- [ ] Empty state styles (centered, icon + text)
- [ ] Banner styles (conflict, detached HEAD)
- [ ] Toast styles (error, success)

**Color Palette** (Tokyo Night):
- Background: `#1a1b26`
- Surface: `#24283b`
- Border: `#292e42`
- Text primary: `#c0caf5`
- Text secondary: `#565f89`
- Accent: `#7aa2f7`
- Success: `#9ece6a`
- Warning: `#e0af68`
- Danger: `#f7768e`
- Info: `#7dcfff`

**Reference**: UI spec section 6 (Responsive Behavior — animations/transitions)

---

### Task 4.4: Add Keyboard Navigation & Accessibility
**Files**: All UI components

**Deliverables — Focus Management**:
- [ ] GitPanel opens: focus on close button
- [ ] CommitDialog opens: focus on title input
- [ ] BranchSwitcher opens: focus on search input
- [ ] Dialog/dropdown closes: focus returns to trigger
- [ ] All interactive elements: 2px solid `#7aa2f7` outline on `:focus-visible`

**Deliverables — ARIA Attributes**:
- [ ] GitPanel: `role="region"`, `aria-label="Git Integration Panel"`
- [ ] File entries: `role="checkbox"`, `aria-checked="true/false"`
- [ ] Commit entries: `role="button"`, `aria-expanded="false"`
- [ ] BranchSwitcher: `role="listbox"`, branch entries `role="option"`
- [ ] CommitDialog: `role="dialog"`, `aria-modal="true"`
- [ ] All buttons: `aria-label` with descriptive text
- [ ] Loading states: `aria-busy="true"`

**Deliverables — Screen Reader Announcements**:
- [ ] GitPanel opens/closes: announce state change
- [ ] File staged: "Staged {filename}"
- [ ] Commit succeeds: "Committed {count} files successfully"
- [ ] Operation fails: "{Operation} failed: {error_reason}"
- [ ] Branch switches: "Switched to branch {branch_name}"

**Reference**: UI spec section 5 (Accessibility Requirements)

---

### Task 4.5: Handle Edge Cases
**Files**: All relevant components

**Deliverables**:
- [ ] **Git not installed**: Show permanent error in GitPanel, disable all operations
- [ ] **Large diffs (>100KB)**: Truncate, show "Diff too large" message
- [ ] **Binary files**: Show "Binary file" message instead of diff
- [ ] **Very long file paths**: Truncate with ellipsis, full path in tooltip
- [ ] **Ahead/behind counts >99**: Show "99+"
- [ ] **Branch names >180px**: Truncate with ellipsis
- [ ] **No remote configured**: Disable push/pull buttons, tooltip "No remote configured"
- [ ] **Push without upstream**: Show dialog offering `git push -u origin <branch>`
- [ ] **Timeout (30s)**: Kill operation, show "Git operation timed out" error
- [ ] **Concurrent operations**: Serialize with mutex (already in GitManager)

**Reference**: Product spec section 3.3 (Error Flows)

---

### Task 4.6: Update Documentation
**Files**: `docs/repo-index.md`, `CLAUDE.md`

**Deliverables in `repo-index.md`**:
- [ ] Add new "Git Integration" domain section:
  - Main: `git-manager.ts` (~600 LOC)
  - Shared: `types/git-types.ts` (~180 LOC)
  - Hooks: `useGit.ts` (~200 LOC)
  - Components: `GitPanel.tsx`, `CommitDialog.tsx`, `BranchSwitcher.tsx`, `CommitHistoryView.tsx`, `DiffViewer.tsx`
  - IPC prefix: `git:*` (21 methods total)

**Deliverables in `CLAUDE.md`**:
- [ ] Update domain map table with Git Integration row
- [ ] Add to "Adding a New Domain" example section
- [ ] Add to critical patterns:
  - Heuristic commit message generation
  - Git command execution via `execFile` (not `exec`)
  - `.git` directory watching with 500ms debounce

**Reference**: CLAUDE.md structure

---

### Task 4.7: Final Testing
**Goal**: End-to-end verification across all flows

**Test Cases — Core Workflow**:
- [ ] Open ClaudeDesk in git repo → GitPanel shows status
- [ ] Modify file → appears in Unstaged within 1s
- [ ] Stage file → moves to Staged section
- [ ] Generate message → AI suggests conventional commit
- [ ] Edit message → can modify suggestion
- [ ] Check "Create checkpoint" → enabled
- [ ] Commit → success, checkpoint created
- [ ] Push → success, ahead count clears

**Test Cases — Branch Operations**:
- [ ] Switch branch → status refreshes
- [ ] Create branch → new branch appears in list
- [ ] Uncommitted changes + switch → confirmation dialog

**Test Cases — History & Diffs**:
- [ ] View commit history → last 10 commits shown
- [ ] Expand commit → full details visible
- [ ] Copy hash → clipboard updated
- [ ] View diff → unified format with colors
- [ ] Binary file → "Binary file" message
- [ ] Large diff → "Diff too large" message

**Test Cases — Error Handling**:
- [ ] Not a git repo → empty state with "Initialize Git"
- [ ] Merge conflicts → banner + disabled commit
- [ ] Detached HEAD → banner + "Create Branch"
- [ ] Push without upstream → dialog offers `-u` flag
- [ ] Auth error → dialog with suggestions
- [ ] Git not installed → permanent error state

**Test Cases — Edge Cases**:
- [ ] Staged count >99 → shows "99+"
- [ ] Long branch name → truncates with ellipsis
- [ ] Long file path → truncates, full path in tooltip
- [ ] No remote → push/pull disabled
- [ ] Operation timeout → error after 30s

**Test Cases — Windows Compatibility**:
- [ ] Test all operations on Windows
- [ ] Verify path handling (spaces, backslashes)
- [ ] Verify `git.exe` found
- [ ] Verify checkpoint integration works

**Test Cases — Accessibility**:
- [ ] Tab navigation works through all elements
- [ ] Focus indicators visible
- [ ] Screen reader announces actions
- [ ] Keyboard shortcuts work (Ctrl+Shift+G, Ctrl+Enter, Escape)
- [ ] ARIA attributes present

---

## Verification Checklist

After all phases complete:

### Functionality
- [ ] Can stage/unstage files visually
- [ ] Can commit with manual messages
- [ ] Can commit with AI-generated messages
- [ ] Can switch branches
- [ ] Can create branches
- [ ] Can view commit history
- [ ] Can view file diffs
- [ ] Can push/pull/fetch
- [ ] Can discard changes
- [ ] Can initialize git repo
- [ ] Can create checkpoint on commit

### Performance
- [ ] Git status loads <300ms (typical repos)
- [ ] File staging updates UI <100ms
- [ ] Diff loads <300ms (typical files)
- [ ] AI message generation <50ms
- [ ] External changes detected <1s

### Error Handling
- [ ] All error codes mapped correctly
- [ ] User-friendly error messages
- [ ] Confirmation for destructive actions
- [ ] Graceful handling of all edge cases

### Integration
- [ ] Works with session manager
- [ ] Works with checkpoint manager
- [ ] TabBar button shows badge
- [ ] Keyboard shortcut works
- [ ] Real-time status updates

### Platform Compatibility
- [ ] Works on Windows
- [ ] Works on macOS
- [ ] Works on Linux
- [ ] Path handling correct on all platforms

### Documentation
- [ ] `repo-index.md` updated
- [ ] `CLAUDE.md` updated
- [ ] Product spec exists
- [ ] UI spec exists
- [ ] Implementation tasks exist

---

## Success Criteria

- ✅ All 4 phases complete
- ✅ All verification checklist items pass
- ✅ No regressions in existing features
- ✅ Follows ClaudeDesk's 3-layer architecture
- ✅ Matches Tokyo Night design language
- ✅ Accessible (WCAG AA)
- ✅ ~2,280 LOC new code
- ✅ 21 IPC methods added
- ✅ Windows/macOS/Linux compatible

---

## File Inventory

### New Files (11 total)
1. `src/shared/types/git-types.ts` (~180 LOC)
2. `src/main/git-manager.ts` (~600 LOC)
3. `src/renderer/hooks/useGit.ts` (~200 LOC)
4. `src/renderer/components/GitPanel.tsx` (~350 LOC)
5. `src/renderer/components/ui/CommitDialog.tsx` (~200 LOC)
6. `src/renderer/components/ui/BranchSwitcher.tsx` (~130 LOC)
7. `src/renderer/components/ui/CommitHistoryView.tsx` (~120 LOC)
8. `src/renderer/components/ui/DiffViewer.tsx` (~120 LOC)
9. `src/renderer/components/git/ConflictBanner.tsx` (~80 LOC)
10. `src/renderer/components/git/DetachedHeadBanner.tsx` (~80 LOC)
11. `src/renderer/components/git/AuthErrorDialog.tsx` (~100 LOC)

### Modified Files (7 total)
1. `src/shared/ipc-contract.ts` (add 21 methods)
2. `src/shared/ipc-types.ts` (add gitSettings)
3. `src/main/ipc-handlers.ts` (register 21 handlers)
4. `src/main/index.ts` (wire GitManager)
5. `src/renderer/App.tsx` (integrate GitPanel)
6. `src/renderer/components/ui/ToolsDropdown.tsx` (add Git button)
7. `src/renderer/styles/globals.css` (add git-panel styles)

### Documentation Files (3 total)
1. `docs/git-integration-product-spec.md` (existing)
2. `docs/git-integration-ui-spec.md` (existing)
3. `docs/git-integration-implementation-tasks.md` (this file)

---

**End of Implementation Task List**
