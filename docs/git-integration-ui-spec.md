# UI Specification: Git Integration & Smart Commits

---

## 1) UI Overview

**User goal:** Manage Git operations (staging, committing, branching, viewing history) within ClaudeDesk without leaving the terminal workflow. Leverage Claude to generate commit messages based on staged changes.

**Key screens/views:**
1. GitPanel (sidebar panel, toggleable via TabBar)
2. CommitDialog (modal overlay)
3. BranchSwitcher (dropdown within GitPanel)
4. DiffViewer (inline expandable accordion)
5. TabBar Git Button (entry point)

**Navigation model:**
- User clicks Git icon in TabBar -> GitPanel slides in from right
- GitPanel contains all primary git operations
- "Commit" button opens CommitDialog modal
- Branch name opens BranchSwitcher dropdown
- File names expand DiffViewer inline
- Close button or ESC key closes GitPanel

---

## 2) Screen Specifications

### TabBar Git Button

**Purpose:** Entry point for Git features. Indicates git status at a glance.

**Layout:**
- Icon button in left TabBar, vertically aligned with other panel buttons (TeamPanel, CheckpointPanel, etc.)
- Icon: Git branch icon (similar to Octicons git-branch) 20x20px
- Badge overlay: Top-right corner, shows staged file count

**Components:**
- Git branch icon (SVG, `#7aa2f7` when panel closed, `#c0caf5` when panel open)
- Badge (circular, 16x16px min, expands with content)
  - Background: `#7aa2f7`
  - Text: `#1a1b26`, JetBrains Mono, 10px, bold
  - Visible only when staged files > 0
  - Shows count (e.g., "3")
- Tooltip: "Git Integration" + keyboard shortcut hint "(Ctrl+G)"

**Primary actions:**
- Click: Toggle GitPanel visibility

**States:**
- **Default/Inactive:** Icon `#7aa2f7`, no badge if count is 0
- **Active (panel open):** Icon `#c0caf5`, background `#24283b` with left border 2px `#7aa2f7`
- **Hover:** Icon brightens to `#89b4fa` (10% lighter), background `#24283b` with 50% opacity
- **Focus (keyboard):** 2px outline `#7aa2f7` with 2px offset
- **Disabled (not a git repo):** Icon `#565f89` (dimmed), no badge, tooltip says "Not a Git repository"
- **Loading (git status running):** Icon has subtle pulse animation (opacity 0.6 -> 1.0 over 1.5s, infinite)

**Edge cases:**
- If directory is not a git repo, button is dimmed and clicking opens GitPanel in "not a repo" empty state
- Badge shows "99+" if staged count exceeds 99

**Accessibility:**
- `aria-label`: "Git Integration, {count} files staged" (or "Git Integration" if count is 0)
- `aria-pressed`: true when panel open
- Keyboard: Tab to focus, Enter/Space to toggle panel

---

### GitPanel (Sidebar Panel)

**Purpose:** Primary interface for all git operations within the current workspace.

**Layout:**
- Fixed width: 420px
- Slides in from right side of window, overlaying terminal content
- Background: `#1a1b26`
- Right border: 1px solid `#292e42`
- Transitions: slide animation 200ms ease-out
- Scrollable content area (header and action bar remain fixed)

**Visual structure (top to bottom):**

```
+-------------------------------------------+
| [Header]                                   |  <- Fixed, 60px height
+-------------------------------------------+
| [Branch Bar]                               |  <- Fixed, 48px height
+-------------------------------------------+
| +=======================================+  |
| | [Changes Section]                     |  |  <- Scrollable
| |   - Staged Files (collapsible)        |  |
| |   - Unstaged Files (collapsible)      |  |
| |   - Untracked Files (collapsible)     |  |
| |   - Conflicted Files (if any)         |  |
| +=======================================+  |
+-------------------------------------------+
| [Action Bar]                               |  <- Fixed, 56px height
+-------------------------------------------+
| +=======================================+  |
| | [Recent Commits]                      |  |  <- Scrollable
| +=======================================+  |
+-------------------------------------------+
```

---

#### Header Section (60px height, fixed)

**Layout:**
- Padding: 16px
- Flexbox: space-between, align-center
- Bottom border: 1px solid `#292e42`

**Components:**
- Title: "Git" (JetBrains Mono, 16px, `#c0caf5`, font-weight: 600)
- Close button (32x32px, icon 16x16px)
  - Icon: "x" or close icon, `#565f89`
  - Hover: `#c0caf5`, background `#24283b` (rounded 4px)
  - Click: Close panel

**States:**
- Default: As described
- Hover (close button): Icon `#c0caf5`, background `#24283b`
- Focus (close button): 2px outline `#7aa2f7`, offset 2px

**Accessibility:**
- Close button: `aria-label="Close Git panel"`, keyboard: Escape key also closes

---

#### Branch Bar (48px height, fixed)

**Layout:**
- Padding: 8px 16px
- Background: `#24283b`
- Bottom border: 1px solid `#292e42`
- Flexbox: space-between, align-center, gap 8px

**Left side components:**
- BranchSwitcher trigger button (grows to fit content, min-width 120px)
  - Icon: git-branch icon 14x14px, `#7aa2f7`
  - Current branch name: JetBrains Mono, 13px, `#c0caf5`
  - Dropdown chevron: 12x12px, `#565f89`
  - Background: `#1a1b26`, border: 1px solid `#292e42`, rounded 4px
  - Padding: 6px 10px
  - Hover: border `#7aa2f7`
- Ahead/Behind indicators (if applicable)
  - Small badge: "^3" (ahead), "v2" (behind), or "^3 v2" (diverged)
  - Background: `#7aa2f7` (ahead), `#e0af68` (diverged), transparent otherwise
  - Text: `#1a1b26` (on colored bg), `#7aa2f7` (ahead on transparent), `#e0af68` (behind on transparent)
  - Font: 11px, JetBrains Mono
  - Padding: 2px 6px, rounded 3px
  - Margin-left: 6px from branch button

**Right side components:**
- Button group (flexbox, gap 4px)
  - Fetch button: Icon (download cloud), 28x28px, icon 14x14px
  - Pull button: Icon (download arrow), 28x28px, icon 14x14px
  - Push button: Icon (upload arrow), 28x28px, icon 14x14px
  - All buttons: Background `#1a1b26`, border 1px `#292e42`, rounded 4px
  - Hover: border `#7aa2f7`, icon `#7aa2f7`
  - Active (operation in progress): icon animates (rotate for fetch, bounce for pull/push)
  - Disabled: icon `#3b4261`, cursor not-allowed

**States:**
- **Default:** As described
- **Detached HEAD:** BranchSwitcher shows commit hash instead of branch name, blue info icon appears before hash with tooltip "Detached HEAD: you are not on any branch"
- **Loading (operations):** Button icon animates, button disabled
- **Error (operation failed):** Button shakes briefly (keyframe: translate +/-4px over 300ms), tooltip shows error message
- **Sync success:** Brief green checkmark overlay on button (500ms fade out)

**Edge cases:**
- Very long branch names truncate with ellipsis after 180px, full name in tooltip
- Ahead/behind counts >99 show "99+"
- If remote not configured, push/pull buttons disabled with tooltip "No remote configured"

**Accessibility:**
- BranchSwitcher: `aria-haspopup="listbox"`, `aria-expanded="false"` (true when open)
- Fetch/Pull/Push buttons: `aria-label="Fetch from remote"`, etc., `aria-busy="true"` when loading
- Keyboard: Tab through buttons, Enter/Space to activate

---

#### Changes Section (scrollable, grows to fill available space)

**Layout:**
- Padding: 0 (each subsection has internal padding)
- Flexbox column, gap 0
- Contains 3-4 collapsible subsections (order: Merge Conflicts -> Staged -> Unstaged -> Untracked)

**Subsection structure (repeated for each file status category):**

**Subsection Header:**
- Padding: 10px 16px
- Background: `#24283b` (Staged), `#1a1b26` (others)
- Left border: 3px solid (color varies by type)
  - Staged: `#9ece6a` (green)
  - Unstaged: `#e0af68` (yellow/orange)
  - Untracked: `#565f89` (gray)
  - Conflicts: `#f7768e` (red)
- Flexbox: space-between, align-center
- Cursor: pointer (entire header is clickable to expand/collapse)
- Hover: background brightens to `#2a2f42`

**Subsection Header Components:**
- Left side:
  - Chevron icon (12x12px, `#565f89`, rotates 90deg when expanded)
  - Label: "Staged Changes" / "Unstaged Changes" / "Untracked Files" / "Merge Conflicts"
    - Font: JetBrains Mono, 12px, `#c0caf5`, font-weight: 600, text-transform: uppercase
  - Count badge: "(3)" in `#565f89`, margin-left 6px
- Right side (only for Staged/Unstaged/Untracked):
  - Action links (text buttons, 11px, `#7aa2f7`)
    - Staged: "Unstage All"
    - Unstaged: "Stage All" | "Discard All" (separated by middle dot divider in `#565f89`)
    - Untracked: "Add All" | "Ignore All"
  - Hover: underline, `#89b4fa`
  - Click: Stops propagation (doesn't toggle collapse)

**Subsection Body (file list):**
- Background: `#1a1b26`
- Padding: 0
- Max-height when collapsed: 0, overflow hidden
- Max-height when expanded: 600px (scrollable if exceeds), transition 200ms ease
- Empty state (no files): Padding 20px 16px, text "No {category} files" in `#565f89`, 12px

**File Entry Layout:**
- Padding: 8px 16px 8px 12px
- Flexbox: align-start, gap 8px
- Border-bottom: 1px solid `#292e42` (except last item)
- Hover: background `#24283b`
- Cursor: pointer (file name area)

**File Entry Components (left to right):**

1. **Checkbox** (16x16px, min-width to prevent shrink)
   - Unchecked: border 1.5px `#292e42`, background `#1a1b26`, rounded 3px
   - Checked: border 1.5px `#7aa2f7`, background `#7aa2f7`, white checkmark icon
   - Hover: border `#7aa2f7`
   - Focus: 2px outline `#7aa2f7`, offset 2px
   - For Staged files: checked by default
   - For Unstaged/Untracked: unchecked by default
   - For Conflicts: checkbox replaced by warning icon (`#f7768e`)

2. **File path** (flexbox column, grows to fill space)
   - **Primary text (file name):** JetBrains Mono, 13px, `#c0caf5`
     - Truncate with ellipsis if exceeds 280px
     - Full path in tooltip on hover
   - **Secondary text (directory path):** JetBrains Mono, 11px, `#565f89`, margin-top 2px
     - Shows parent directory path relative to repo root
     - Example: "src/renderer/components/"
     - Only shown if file is nested (not in root)

3. **Change stats** (flexbox row, gap 6px, align-center, no-shrink)
   - Added lines: "+12" in `#9ece6a`, 11px
   - Removed lines: "-8" in `#f7768e`, 11px
   - If binary file: "Binary" badge in `#565f89`, 11px
   - If renamed: "-> newname.ts" in `#7dcfff`, 11px
   - If file too large (>5MB): "Large file" badge in `#e0af68`, 11px

4. **Expand indicator** (chevron icon, 12x12px, `#565f89`, margin-left 4px)
   - Points right when collapsed, down when expanded
   - Only visible on hover or when diff is expanded

**File Entry States:**
- **Default:** As described
- **Hover:** Background `#24283b`, chevron appears
- **Focus (keyboard):** 2px outline `#7aa2f7` around entire entry
- **Expanded (diff visible):** Background `#24283b`, chevron pointing down, DiffViewer appears below
- **Staging in progress:** Checkbox shows loading spinner (12x12px, `#7aa2f7`)
- **Conflict file:** No checkbox, warning icon instead, file path in `#f7768e`, "Resolve" button appears on right

**Edge cases:**
- File path >280px: truncate with ellipsis in middle of path (preserve filename and first directory)
- Change stats unavailable (binary files): show "Binary" badge only
- Submodule changes: show "Submodule" badge in `#7dcfff` instead of line counts
- File deleted: show file path with strikethrough, no diff preview available
- File renamed: show old -> new name inline, diff shows combined changes

**Accessibility:**
- Each file entry: `role="checkbox"` (for Staged/Unstaged/Untracked), `aria-checked="true/false"`
- Conflict files: `role="alert"`, `aria-label="Merge conflict in {filename}"`
- Subsection header: `role="button"`, `aria-expanded="true/false"`, `aria-controls="section-{id}"`
- Keyboard: Tab to navigate entries, Space to toggle checkbox, Enter to expand diff

**Data needed:**
- Per file: status (staged/unstaged/untracked/conflict), path, added lines count, removed lines count, binary flag, renamed flag (with old/new names), file size
- Per subsection: file count, cumulative stats

---

#### Action Bar (56px height, fixed, sticks above Recent Commits)

**Layout:**
- Padding: 12px 16px
- Background: `#24283b`
- Top border: 1px solid `#292e42`
- Flexbox: space-between, align-center, gap 8px

**Left side components:**
- Bulk action buttons (text buttons, 12px, `#7aa2f7`)
  - "Stage All" (if unstaged files exist)
  - "Unstage All" (if staged files exist)
  - "Discard All" (if unstaged files exist, shows confirmation dialog)
  - Separated by middle dot divider in `#565f89`
  - Hover: underline, `#89b4fa`
  - Disabled: `#3b4261`, no hover effect

**Right side components:**
- Button group (flexbox, gap 8px)
  - **Generate Message button:**
    - Icon: sparkle/robot icon 14x14px, `#7aa2f7`
    - Text: "Generate" (12px, `#c0caf5`)
    - Background: `#1a1b26`, border 1px `#7aa2f7`, rounded 4px
    - Padding: 8px 12px
    - Hover: background `#7aa2f7`, text `#1a1b26`, icon `#1a1b26`
    - Disabled (no staged files): icon and text `#3b4261`, border `#292e42`, cursor not-allowed
    - Loading: icon rotates, text "Generating...", disabled
  - **Commit button:**
    - Text: "Commit" (13px, `#1a1b26`)
    - Background: `#7aa2f7`, no border, rounded 4px
    - Padding: 8px 16px
    - Font-weight: 600
    - Hover: background `#89b4fa`
    - Disabled (no staged files): background `#3b4261`, cursor not-allowed
    - Shows staged file count in button: "Commit (3)"

**States:**
- **Default:** As described
- **No staged files:** Commit and Generate buttons disabled
- **Generating message:** Generate button shows loading state, still clickable to cancel
- **Generation complete:** Brief success animation on Generate button (scale 1.05 -> 1.0 over 200ms)

**Edge cases:**
- If >20 files staged, Commit button shows "Commit (20+)"
- If AI unavailable, Generate button hidden

**Accessibility:**
- Commit button: `aria-label="Commit {count} staged files"`, `aria-disabled="true"` when disabled
- Generate button: `aria-label="Generate commit message with AI"`, `aria-busy="true"` when loading
- Keyboard: Tab through buttons, Enter/Space to activate

---

#### Recent Commits Section (scrollable, 300px max-height)

**Layout:**
- Padding: 0
- Background: `#1a1b26`
- Top border: 1px solid `#292e42`
- Overflow-y: auto
- Shows last 10 commits

**Section Header:**
- Padding: 12px 16px
- Background: `#24283b`
- Flexbox: space-between, align-center
- Text: "Recent Commits" (JetBrains Mono, 12px, `#c0caf5`, font-weight: 600, text-transform: uppercase)
- Right side: "View All" link (11px, `#7aa2f7`, hover: underline)

**Commit Entry Layout:**
- Padding: 12px 16px
- Flexbox column, gap 6px
- Border-bottom: 1px solid `#292e42` (except last)
- Hover: background `#24283b`, cursor pointer
- Click: Expands to show full details

**Commit Entry Components (collapsed state):**

1. **Top row (flexbox, space-between, align-center):**
   - Left: Commit hash (7 chars, monospace, 11px, `#565f89`)
   - Right: Relative time (11px, `#565f89`), e.g., "2 hours ago"

2. **Commit message (first line only):**
   - Font: JetBrains Mono, 13px, `#c0caf5`
   - Truncate with ellipsis after 320px
   - If message follows conventional commits format (e.g., "feat:", "fix:"), prefix is colored:
     - `feat:` -> `#7dcfff` (cyan)
     - `fix:` -> `#9ece6a` (green)
     - `docs:` -> `#7aa2f7` (blue)
     - `refactor:` -> `#bb9af7` (purple)
     - `chore:` -> `#565f89` (gray)
     - Other types: `#e0af68` (yellow)

3. **Metadata row (flexbox, gap 8px, align-center):**
   - Author name: 11px, `#565f89`, max-width 120px, truncate
   - File count badge: "3 files" (11px, `#565f89`)
   - Change stats: "+45 -12" (`#9ece6a` for additions, `#f7768e` for deletions, 11px)

**Commit Entry Components (expanded state):**
- All collapsed components remain visible
- **Full commit message:** Shows all lines, 12px, `#c0caf5`, margin-top 8px, line-height 1.5
- **Files changed list:** (if <15 files)
  - Each file on new line: icon (M/A/D/R), path (11px, `#7aa2f7`), stats (+N -M in respective colors)
  - Padding-left: 16px
  - Max 10 files shown, "+ N more files" link if exceeds
- **Action buttons (flexbox, gap 8px, margin-top 12px):**
  - "Copy Hash" (text button, 11px, `#7aa2f7`)
  - "Revert" (text button, 11px, `#f7768e`, shows confirmation dialog)
  - "View in Terminal" (text button, 11px, `#7aa2f7`, runs `git show {hash}`)

**States:**
- **Default (collapsed):** As described
- **Hover:** Background `#24283b`, chevron icon appears on right
- **Expanded:** Background `#24283b`, chevron points down, full details visible
- **Focus (keyboard):** 2px outline `#7aa2f7`
- **Loading (on initial panel open):** Skeleton loaders for 3 commit entries

**Empty state:**
- Icon: git commit icon, 48x48px, `#565f89`
- Text: "No commits yet" (14px, `#c0caf5`)
- Subtext: "Make your first commit to see history here" (12px, `#565f89`)
- Padding: 40px 16px
- Center-aligned

**Edge cases:**
- Commit messages with no conventional prefix: no color highlighting
- Very long commit hashes: always show first 7 chars only
- Author name >120px: truncate with ellipsis, full name in tooltip
- Files changed >15: show first 10 + "View all N files" link

**Accessibility:**
- Each commit entry: `role="button"`, `aria-expanded="false"` (true when expanded)
- Keyboard: Tab to navigate entries, Enter to expand, Arrow keys to move between entries
- Screen reader announces: "Commit {hash}, {message}, by {author}, {time ago}"

**Data needed:**
- Per commit: full hash, short hash, message, author name, author email, timestamp, files changed (paths + status), insertions count, deletions count

---

### BranchSwitcher (Dropdown)

**Purpose:** Switch between branches, create new branches, view branch status.

**Layout:**
- Dropdown menu attached to branch name button in Branch Bar
- Width: 320px
- Max-height: 400px (scrollable)
- Background: `#24283b`
- Border: 1px solid `#292e42`
- Rounded: 6px
- Box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4)
- Positioned below trigger button with 4px gap

**Components (top to bottom):**

1. **Search input:**
   - Padding: 12px
   - Background: `#1a1b26`
   - Border: none
   - Border-bottom: 1px solid `#292e42`
   - Placeholder: "Search branches..." (`#565f89`, 13px)
   - Text: `#c0caf5`, 13px, JetBrains Mono
   - Focus: outline none, bottom border `#7aa2f7`

2. **Local branches section:**
   - Label: "LOCAL BRANCHES" (10px, `#565f89`, font-weight: 600, padding: 8px 12px, background `#24283b`, sticky top)
   - Branch list (scrollable if exceeds ~250px)
     - Each branch entry:
       - Padding: 8px 12px
       - Flexbox: space-between, align-center
       - Hover: background `#1a1b26`, cursor pointer
       - Current branch: background `#7aa2f7` at 10% opacity, left border 2px `#7aa2f7`, checkmark icon on right
       - Branch name: 13px, `#c0caf5`, JetBrains Mono
       - Ahead/behind badge (if applicable): same styling as Branch Bar
       - Click: Switch to branch (shows confirmation if uncommitted changes)

3. **Remote branches section:** (collapsible, collapsed by default)
   - Label: "REMOTE BRANCHES" with chevron (same styling as local section)
   - Similar branch entry styling, but branch names prefixed with remote name (e.g., "origin/main")
   - Dimmed text: `#7dcfff` (cyan) to indicate remote
   - Click: Creates local tracking branch and switches

4. **Create new branch section:**
   - Separator: 1px solid `#292e42`
   - Padding: 8px 12px
   - Flexbox: align-center, gap 8px
   - Icon: "+" icon, 14x14px, `#7aa2f7`
   - Text: "Create new branch..." (13px, `#7aa2f7`)
   - Hover: background `#1a1b26`, cursor pointer
   - Click: Toggles inline input field

5. **Inline input (create mode):**
   - Replaces "Create new branch..." row
   - Input field:
     - Width: 100%
     - Padding: 6px 8px
     - Background: `#1a1b26`
     - Border: 1px solid `#7aa2f7`
     - Rounded: 4px
     - Placeholder: "new-branch-name" (`#565f89`)
     - Auto-focused
   - Action buttons below input (flexbox, gap 8px, margin-top 8px):
     - "Create" button (background `#7aa2f7`, text `#1a1b26`, padding 6px 12px, rounded 4px)
     - "Cancel" button (text button, `#7aa2f7`)
   - Enter key: Create branch
   - Escape key: Cancel

**States:**
- **Closed:** Dropdown not visible
- **Open:** Dropdown visible, search input auto-focused
- **Searching:** Branch list filtered in real-time as user types
- **Loading (fetching branches):** Skeleton loaders for branch entries
- **Creating branch:** "Create" button shows loading spinner, input disabled
- **Error (invalid branch name):** Input border changes to `#f7768e`, error message below in `#f7768e` (11px), e.g., "Invalid branch name"
- **Empty search results:** "No branches found" message (12px, `#565f89`, center-aligned, padding 20px)

**Edge cases:**
- Branch name validation: no spaces, special chars except `-/_`, not starting with `-`
- If >50 branches, warn user with "Fetching branches may take a moment..." toast
- If uncommitted changes exist, switching shows confirmation dialog: "You have uncommitted changes. Stash or discard them?" with options: "Stash & Switch", "Discard & Switch", "Cancel"

**Accessibility:**
- Dropdown: `role="listbox"`, `aria-label="Branch switcher"`
- Search input: `aria-label="Search branches"`
- Branch entries: `role="option"`, `aria-selected="true"` for current branch
- Keyboard: Arrow keys to navigate, Enter to select, Escape to close, Tab to cycle through sections
- Screen reader announces: "Branch {name}, {ahead/behind status}" for each entry

**Data needed:**
- Local branches: name, current flag, ahead/behind counts, last commit time
- Remote branches: name, remote name, last commit time
- Current branch name

---

### CommitDialog (Modal)

**Purpose:** Compose commit message, optionally generate with AI, configure commit options.

**Layout:**
- Modal overlay: Full-screen, background `#000000` at 60% opacity
- Card: Centered, width 560px, background `#24283b`, border 1px `#292e42`, rounded 8px, box-shadow 0 16px 48px rgba(0, 0, 0, 0.6)
- Padding: 24px
- Flexbox column, gap 16px

**Components (top to bottom):**

1. **Header:**
   - Flexbox: space-between, align-center
   - Title: "Commit Changes" (16px, `#c0caf5`, font-weight: 600)
   - Close button: "x" icon (24x24px, `#565f89`, hover: `#c0caf5`)

2. **Summary bar:**
   - Padding: 10px 12px
   - Background: `#7aa2f7` at 10% opacity
   - Border-left: 3px solid `#7aa2f7`
   - Rounded: 4px
   - Text: "{count} files staged +{insertions} -{deletions}" (12px, `#c0caf5`, JetBrains Mono)
   - Icon: git commit icon on left (14x14px, `#7aa2f7`)

3. **Title input field:**
   - Label: "Commit message" (12px, `#565f89`, font-weight: 600, margin-bottom 6px)
   - Input:
     - Width: 100%
     - Padding: 10px 12px
     - Background: `#1a1b26`
     - Border: 1px solid `#292e42`
     - Rounded: 4px
     - Font: JetBrains Mono, 13px, `#c0caf5`
     - Placeholder: "type(scope): description" (`#565f89`)
     - Max-length: 72 chars
     - Focus: border `#7aa2f7`, outline none
   - Character counter: "{chars}/72" (11px, `#565f89`, aligned right, margin-top 4px)
     - Turns `#f7768e` if >72 chars (warning, not blocking)

4. **Body textarea:**
   - Label: "Description (optional)" (12px, `#565f89`, font-weight: 600, margin-bottom 6px)
   - Textarea:
     - Width: 100%
     - Min-height: 120px
     - Padding: 10px 12px
     - Background: `#1a1b26`
     - Border: 1px solid `#292e42`
     - Rounded: 4px
     - Font: JetBrains Mono, 12px, `#c0caf5`
     - Placeholder: "Provide additional context (optional)..." (`#565f89`)
     - Resize: vertical
     - Focus: border `#7aa2f7`, outline none

5. **Options row:**
   - Flexbox: space-between, align-center, margin-top 8px

   - Left side: Checkbox option
     - Checkbox (16x16px, same styling as file checkboxes)
     - Label: "Create checkpoint after commit" (13px, `#c0caf5`, margin-left 8px)
     - Info icon (12x12px, `#565f89`, margin-left 4px, tooltip: "Saves current workspace state as a checkpoint for easy restoration")

   - Right side: Generate button
     - Icon: sparkle icon (14x14px, `#7aa2f7`)
     - Text: "Generate Message" (13px, `#7aa2f7`)
     - Padding: 6px 10px
     - Background: transparent, border 1px `#7aa2f7`, rounded 4px
     - Hover: background `#7aa2f7`, text `#1a1b26`, icon `#1a1b26`
     - Loading state: icon rotates, text "Generating...", disabled

6. **Footer actions:**
   - Flexbox: flex-end, gap 8px, margin-top 24px, padding-top 16px, border-top 1px `#292e42`
   - Cancel button:
     - Text: "Cancel" (13px, `#7aa2f7`)
     - Padding: 8px 16px
     - Background: transparent, border: none
     - Hover: underline, `#89b4fa`
   - Commit button:
     - Text: "Commit" (13px, `#1a1b26`)
     - Padding: 8px 24px
     - Background: `#7aa2f7`
     - Border: none, rounded 4px
     - Font-weight: 600
     - Hover: background `#89b4fa`
     - Disabled (title empty): background `#3b4261`, cursor not-allowed
     - Loading (committing): text "Committing...", loading spinner, disabled

**States:**
- **Default:** All fields empty, Commit button disabled
- **Title filled:** Commit button enabled
- **Generating message:** Generate button loading, title and body inputs show loading skeleton overlay
- **Generation complete:** AI-generated message populates fields with fade-in animation (200ms)
- **Generation failed:** Error toast appears, fields remain unchanged
- **Committing:** Commit button loading, all inputs disabled
- **Commit success:** Dialog closes with fade-out (200ms), success toast appears
- **Commit failed:** Error message appears below Commit button (red text, 12px), button re-enabled

**Edge cases:**
- If title exceeds 72 chars, warning (not blocking) but best practice indicator
- If body is empty, that's fine (optional field)
- If staged files list changes while dialog open, summary bar updates in real-time
- If user clicks outside modal, treat as Cancel (with confirmation if message is non-empty)
- If Generate fails due to AI unavailable, show error: "AI service unavailable. Please write message manually."

**Accessibility:**
- Modal overlay: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="commit-dialog-title"`
- Title input: `aria-label="Commit message title"`, `aria-describedby="title-hint"`
- Body textarea: `aria-label="Commit message description"`
- Checkbox: `aria-checked="true/false"`, label associated via `htmlFor`
- Escape key: Close dialog (with confirmation if message non-empty)
- Enter key (Ctrl+Enter): Submit commit if title is filled
- Tab order: Title -> Body -> Checkbox -> Generate -> Cancel -> Commit

**Data needed:**
- Staged files count, insertions count, deletions count
- AI-generated message (title + body) when Generate clicked
- Commit result (success/failure + error message if failed)

---

### DiffViewer (Inline Expandable)

**Purpose:** Show unified diff for a file when clicked in the changes list.

**Layout:**
- Appears directly below the clicked file entry in the changes list
- Width: 100% of GitPanel width minus file entry padding
- Max-height: 400px (scrollable if exceeds)
- Background: `#1a1b26`
- Border: 1px solid `#292e42`
- Rounded: 4px
- Margin: 8px 0
- Animation: Expand from 0 to full height over 200ms ease-out

**Components:**

1. **Diff header:**
   - Padding: 8px 12px
   - Background: `#24283b`
   - Border-bottom: 1px solid `#292e42`
   - Flexbox: space-between, align-center
   - Left side: File path (12px, `#7dcfff`, JetBrains Mono)
   - Right side:
     - "Copy" button (text button, 11px, `#7aa2f7`, copies diff to clipboard)
     - Collapse button ("x" icon, 16x16px, `#565f89`, hover: `#c0caf5`)

2. **Diff content (unified format):**
   - Padding: 12px
   - Font: JetBrains Mono, 12px, `#c0caf5`
   - Line-height: 1.4
   - Overflow-x: auto (horizontal scroll for long lines)
   - Each line is a flex row:
     - Line number column (left): 40px wide, text-align right, `#565f89`, padding-right 8px
     - Content column (right): Grows to fill, preserves whitespace
   - Line backgrounds:
     - Added lines (start with `+`): background `#9ece6a` at 12% opacity, text `#9ece6a` for the `+` symbol
     - Removed lines (start with `-`): background `#f7768e` at 12% opacity, text `#f7768e` for the `-` symbol
     - Context lines (start with space): background transparent, text `#c0caf5`
     - Hunk headers (start with `@@`): background `#7aa2f7` at 8% opacity, text `#7aa2f7`, font-style italic

3. **Syntax highlighting (if possible):**
   - Apply basic syntax highlighting based on file extension
   - Use muted colors to not conflict with diff backgrounds
   - Keywords: `#bb9af7` (purple)
   - Strings: `#9ece6a` (green)
   - Comments: `#565f89` (gray)
   - Functions: `#7dcfff` (cyan)
   - If syntax highlighting library unavailable, plain monospace is fine

**States:**
- **Loading (fetching diff):** Skeleton loader with animated gradient (3-5 lines)
- **Expanded:** Full diff visible, collapse button active
- **Collapsed:** Height 0, overflow hidden
- **Diff too large (>100KB or >1000 lines):** Show message instead of diff:
  - Icon: file icon, 32x32px, `#565f89`
  - Text: "Diff too large to display" (13px, `#c0caf5`)
  - Subtext: "View in terminal with `git diff {file}`" (11px, `#565f89`)
  - "View in Terminal" button (text button, 12px, `#7aa2f7`)
- **Binary file:** Show message:
  - Icon: binary icon, 32x32px, `#565f89`
  - Text: "Binary file" (13px, `#c0caf5`)
  - Subtext: "Cannot display diff for binary files" (11px, `#565f89`)
- **Fetch error:** Show error message (red text, 12px)

**Edge cases:**
- Very long lines (>200 chars): horizontal scrollbar appears
- Empty file changes (file added but empty): Show "Empty file" message
- Entire file deleted: Show all lines with red background
- Entire file added: Show all lines with green background
- Renamed file with no content changes: Show "File renamed, no changes" message

**Accessibility:**
- Diff content: `role="region"`, `aria-label="Diff for {filename}"`
- Copy button: `aria-label="Copy diff to clipboard"`
- Collapse button: `aria-label="Collapse diff"`
- Keyboard: Escape key to collapse, arrow keys to scroll (if focused)
- Screen reader: Announce line-by-line with status (added/removed/unchanged)

**Data needed:**
- Full unified diff text for the file
- File extension (for syntax highlighting)
- File size (to check if too large)
- Binary flag (to avoid showing binary content)

---

### Empty States

#### Empty State: Not a Git Repository

**Layout:**
- Centered in GitPanel, padding 60px 40px
- Flexbox column, align-center, gap 16px

**Components:**
- Icon: Git logo or folder with X icon (64x64px, `#565f89`)
- Title: "Not a Git Repository" (16px, `#c0caf5`, font-weight: 600)
- Description: "This directory is not tracked by Git. Initialize a repository to start using version control." (13px, `#565f89`, text-align center, max-width 280px, line-height 1.5)
- Primary action button:
  - Text: "Initialize Repository" (13px, `#1a1b26`)
  - Padding: 10px 20px
  - Background: `#7aa2f7`
  - Rounded: 4px
  - Hover: background `#89b4fa`
  - Click: Runs `git init`, then reloads GitPanel

**States:**
- **Default:** As described
- **Initializing:** Button shows loading spinner, text "Initializing...", disabled
- **Success:** Panel reloads with initialized repo state
- **Error:** Error message appears below button (red text, 12px)

---

#### Empty State: No Changes

**Layout:**
- Appears in Changes Section when working tree is clean
- Centered in section, padding 40px 20px
- Flexbox column, align-center, gap 12px

**Components:**
- Icon: Checkmark in circle (48x48px, `#9ece6a`)
- Title: "Working tree clean" (14px, `#c0caf5`, font-weight: 600)
- Description: "No changes to commit. Your working directory matches the HEAD commit." (12px, `#565f89`, text-align center, max-width 260px, line-height 1.5)

---

#### Empty State: No Commits

**Layout:**
- Appears in Recent Commits Section when no commits exist
- Centered in section, padding 40px 20px
- Flexbox column, align-center, gap 12px

**Components:**
- Icon: Git commit icon (48x48px, `#565f89`)
- Title: "No commits yet" (14px, `#c0caf5`, font-weight: 600)
- Description: "Make your first commit to see history here" (12px, `#565f89`, text-align center, max-width 240px, line-height 1.5)

---

### Error & Warning States

#### Warning: Merge Conflicts

**Layout:**
- Banner at top of Changes Section (above Merge Conflicts subsection)
- Padding: 12px 16px
- Background: `#e0af68` at 15% opacity
- Border-left: 3px solid `#e0af68`
- Flexbox: space-between, align-center

**Components:**
- Left side:
  - Warning icon (16x16px, `#e0af68`)
  - Text: "{count} merge conflicts need resolution" (13px, `#c0caf5`, font-weight: 600)
- Right side:
  - "Abort Merge" button (text button, 12px, `#f7768e`, shows confirmation dialog)

---

#### Info: Detached HEAD

**Layout:**
- Banner below Branch Bar
- Padding: 10px 16px
- Background: `#7aa2f7` at 12% opacity
- Border-left: 3px solid `#7aa2f7`
- Flexbox: align-center, gap 8px

**Components:**
- Info icon (14x14px, `#7aa2f7`)
- Text: "Detached HEAD at {short_hash}" (12px, `#c0caf5`, JetBrains Mono)
- Description: "You are not on any branch. Create a branch to keep your changes." (12px, `#565f89`)
- "Create Branch" button (text button, 11px, `#7aa2f7`)

---

#### Error: Push/Pull Failed

**Layout:**
- Toast notification (top-right corner of GitPanel, floats over content)
- Width: 340px
- Padding: 14px 16px
- Background: `#f7768e` at 95% opacity
- Border: 1px solid `#f7768e`
- Rounded: 6px
- Box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3)
- Auto-dismisses after 6 seconds (or user clicks X)

**Components:**
- Flexbox: align-start, gap 10px
- Error icon (20x20px, `#1a1b26`)
- Text column:
  - Title: "Push Failed" or "Pull Failed" (13px, `#1a1b26`, font-weight: 600)
  - Message: Error message from git (12px, `#1a1b26`, max 2 lines, truncate with ellipsis)
- Close button ("x" icon, 16x16px, `#1a1b26`, top-right corner)

**States:**
- **Visible:** Fades in from right (200ms)
- **Dismissing:** Fades out to right (200ms)
- **Hover:** Close button background `#000000` at 10% opacity

---

#### Error: Authentication Required

**Layout:**
- Modal dialog (same structure as CommitDialog)
- Width: 480px
- Centered on screen

**Components:**
- Header: "Authentication Required" (16px, `#c0caf5`, font-weight: 600)
- Icon: Lock icon (48x48px, `#f7768e`, centered)
- Message: "Git operation requires authentication. Please configure your credentials." (13px, `#c0caf5`, text-align center, line-height 1.5, margin 20px 0)
- Suggestion box:
  - Padding: 12px 14px
  - Background: `#7aa2f7` at 10% opacity
  - Border-left: 3px solid `#7aa2f7`
  - Rounded: 4px
  - Text: "Run `git config credential.helper store` or set up SSH keys" (12px, `#7dcfff`, JetBrains Mono)
- Footer actions:
  - "Open Terminal" button (primary, background `#7aa2f7`)
  - "Dismiss" button (secondary, text button)

---

## 3) Component Inventory

| Component | Responsibility | Reused On | Props/Data |
|-----------|---------------|-----------|------------|
| GitPanel | Main git operations sidebar | Toggles from TabBar | workspaceId, gitStatus, stagedFiles, unstagedFiles, untrackedFiles, conflicts, recentCommits, currentBranch, remoteStatus |
| TabBar Git Button | Entry point, status indicator | TabBar | stagedCount, isGitRepo, panelOpen |
| BranchSwitcher | Branch switching & creation | GitPanel Branch Bar | localBranches, remoteBranches, currentBranch, aheadBehind |
| CommitDialog | Compose & submit commits | Opens from GitPanel | stagedFiles, stagedStats, onCommit, onGenerate, onCancel |
| DiffViewer | Inline file diff display | GitPanel file entries | filePath, diffContent, fileExtension, isBinary, fileSize |
| FileEntry | Individual file in changes list | GitPanel changes sections | file {path, status, added, removed, binary, renamed}, onStage, onUnstage, onExpand |
| CommitEntry | Individual commit in history | GitPanel recent commits | commit {hash, message, author, timestamp, files, stats}, onExpand, onRevert |
| ChangesSection | Collapsible file group | GitPanel | title, files, type (staged/unstaged/untracked/conflict), color, actions |
| ActionBar | Bulk actions & commit trigger | GitPanel | stagedCount, onStageAll, onUnstageAll, onDiscardAll, onCommit, onGenerate |
| BranchBar | Branch status & remote ops | GitPanel | currentBranch, aheadBehind, onFetch, onPull, onPush |
| EmptyState (not git repo) | Guide user to initialize | GitPanel | onInitialize |
| EmptyState (no changes) | Confirm clean state | GitPanel Changes Section | - |
| EmptyState (no commits) | Guide to first commit | GitPanel Recent Commits | - |
| ConflictBanner | Alert for merge conflicts | GitPanel top | conflictCount, onAbort |
| DetachedHeadBanner | Info for detached HEAD | GitPanel below Branch Bar | commitHash, onCreateBranch |
| ErrorToast | Operation failure notification | Floats over GitPanel | title, message, onDismiss |
| AuthErrorDialog | Prompt for auth setup | Modal overlay | onOpenTerminal, onDismiss |

---

## 4) Content & Microcopy

### Button Labels
- **GitPanel actions:**
  - "Stage All" (context: unstaged files exist)
  - "Unstage All" (context: staged files exist)
  - "Discard All" (context: unstaged changes exist)
  - "Add All" (context: untracked files exist)
  - "Ignore All" (context: untracked files exist)
  - "Commit" / "Commit (3)" (context: ready to commit)
  - "Generate" / "Generate Message" (context: AI available)
  - "Fetch" (tooltip: "Fetch from remote")
  - "Pull" (tooltip: "Pull from remote")
  - "Push" (tooltip: "Push to remote")
  - "Resolve" (context: conflict file)
  - "Abort Merge" (context: merge in progress)
  - "Create Branch" (context: detached HEAD)
  - "View All" (context: recent commits)
  - "Copy Hash" (context: commit details)
  - "Revert" (context: commit details)
  - "View in Terminal" (context: commit/diff actions)

- **CommitDialog actions:**
  - "Commit" (primary action)
  - "Cancel" (secondary action)
  - "Generate Message" (AI action)

- **BranchSwitcher actions:**
  - "Create new branch..."
  - "Create" (confirm new branch)
  - "Cancel" (cancel new branch)

- **Empty state actions:**
  - "Initialize Repository" (context: not a git repo)
  - "Learn more about Git" (context: not a git repo)

- **Error dialog actions:**
  - "Open Terminal" (context: auth error)
  - "Dismiss" (context: errors)

### Error Messages
- **Staging errors:**
  - "Failed to stage {filename}: {error_reason}" (toast, 4s duration)
  - "Failed to unstage {filename}: {error_reason}" (toast, 4s duration)

- **Commit errors:**
  - "Commit failed: {error_reason}" (inline below Commit button)
  - "Nothing to commit. Please stage changes first." (inline, yellow warning)
  - "Commit message cannot be empty." (inline, red error)

- **Branch errors:**
  - "Invalid branch name. Use only alphanumeric characters, hyphens, and underscores." (inline below input)
  - "Branch '{name}' already exists." (inline, red)
  - "Failed to switch branch: {error_reason}" (toast)
  - "Cannot switch branch with uncommitted changes." (confirmation dialog trigger)

- **Remote operation errors:**
  - "Push failed: {error_reason}" (toast, red)
  - "Pull failed: {error_reason}" (toast, red)
  - "Fetch failed: {error_reason}" (toast, red)
  - "Authentication required. Please configure credentials." (dialog)
  - "Remote '{remote}' not configured." (toast)

- **Merge conflict errors:**
  - "{count} merge conflicts detected. Resolve conflicts before committing." (banner, yellow)

- **AI generation errors:**
  - "AI service unavailable. Please write message manually." (toast, yellow)
  - "Failed to generate commit message: {error_reason}" (toast, red)

### Empty State Messages
- **Not a git repository:**
  - Title: "Not a Git Repository"
  - Body: "This directory is not tracked by Git. Initialize a repository to start using version control."

- **No changes:**
  - Title: "Working tree clean"
  - Body: "No changes to commit. Your working directory matches the HEAD commit."

- **No commits:**
  - Title: "No commits yet"
  - Body: "Make your first commit to see history here"

- **No staged files:**
  - "No staged files" (inline, gray, 12px)

- **No unstaged files:**
  - "No unstaged files" (inline, gray, 12px)

- **No untracked files:**
  - "No untracked files" (inline, gray, 12px)

- **No branches found (search):**
  - "No branches found" (center-aligned, gray, 13px)

### Helper Text
- **Commit title input:**
  - Placeholder: "type(scope): description"
  - Helper: "{chars}/72" (character counter, right-aligned below input)
  - Warning (>72 chars): "Consider keeping the title under 72 characters" (yellow, 11px)

- **Commit body textarea:**
  - Placeholder: "Provide additional context (optional)..."

- **Branch search input:**
  - Placeholder: "Search branches..."

- **New branch input:**
  - Placeholder: "new-branch-name"

- **Tooltips:**
  - Git TabBar button: "Git Integration"
  - Fetch button: "Fetch from remote"
  - Pull button: "Pull from remote"
  - Push button: "Push to remote"
  - Ahead indicator: "^{count} commits ahead of remote"
  - Behind indicator: "v{count} commits behind remote"
  - Diverged indicator: "^{ahead} ahead, v{behind} behind remote"
  - Checkpoint checkbox: "Saves current workspace state as a checkpoint for easy restoration"
  - Detached HEAD icon: "Detached HEAD: you are not on any branch"
  - File path (truncated): "{full_file_path}" (shows full path)
  - Commit hash: "{full_commit_hash}" (shows full 40-char hash)

### Confirmation Messages
- **Success toasts (3-4s duration, top-right, green accent):**
  - "Committed {count} files" (after successful commit)
  - "Switched to branch '{branch_name}'" (after branch switch)
  - "Created branch '{branch_name}'" (after new branch)
  - "Pushed to {remote}/{branch}" (after successful push)
  - "Pulled from {remote}/{branch}" (after successful pull)
  - "Fetched from {remote}" (after successful fetch)
  - "Diff copied to clipboard" (after copying diff)
  - "Commit hash copied to clipboard" (after copying hash)

- **Confirmation dialogs:**
  - **Discard all changes:**
    - Title: "Discard All Changes?"
    - Body: "This will permanently discard all unstaged changes. This action cannot be undone."
    - Actions: "Discard" (red), "Cancel"

  - **Switch branch with uncommitted changes:**
    - Title: "Uncommitted Changes"
    - Body: "You have uncommitted changes. What would you like to do?"
    - Actions: "Stash & Switch", "Discard & Switch", "Cancel"

  - **Revert commit:**
    - Title: "Revert Commit?"
    - Body: "This will create a new commit that undoes the changes from {short_hash}. Continue?"
    - Actions: "Revert" (red), "Cancel"

  - **Abort merge:**
    - Title: "Abort Merge?"
    - Body: "This will abort the current merge and return to the state before merging. Continue?"
    - Actions: "Abort Merge" (red), "Cancel"

  - **Close CommitDialog with unsaved message:**
    - Title: "Discard Commit Message?"
    - Body: "You have an unsaved commit message. Discard it?"
    - Actions: "Discard", "Cancel"

---

## 5) Accessibility Requirements

### Keyboard Navigation

**GitPanel navigation:**
- **Tab order:**
  1. Close button (header)
  2. Branch switcher trigger
  3. Fetch button
  4. Pull button
  5. Push button
  6. Changes section headers (collapsible)
  7. File entries (each checkbox, then file name)
  8. Action bar buttons (Stage All, Unstage All, Discard All, Generate, Commit)
  9. Recent commits section header
  10. Commit entries (each expandable)

- **Keyboard shortcuts (global within GitPanel):**
  - `Ctrl+G` or `Cmd+G`: Toggle GitPanel visibility
  - `Escape`: Close GitPanel (or close expanded dropdowns/dialogs)
  - `Ctrl+Enter` or `Cmd+Enter`: Commit (if Commit button enabled)
  - `Ctrl+Shift+A` or `Cmd+Shift+A`: Stage all
  - `Ctrl+Shift+U` or `Cmd+Shift+U`: Unstage all
  - `Space`: Toggle checkbox (when file entry focused), expand/collapse section (when section header focused)
  - `Enter`: Expand diff (when file name focused), expand commit (when commit entry focused)
  - `Arrow Up/Down`: Navigate between file entries or commit entries (when within a list)

**BranchSwitcher navigation:**
- `Tab`: Move to search input
- `Arrow Up/Down`: Navigate branch list
- `Enter`: Select highlighted branch
- `Escape`: Close dropdown
- Type to search (any alphanumeric key focuses search input)

**CommitDialog navigation:**
- **Tab order:**
  1. Title input
  2. Body textarea
  3. Checkpoint checkbox
  4. Generate button
  5. Cancel button
  6. Commit button

- **Keyboard shortcuts:**
  - `Escape`: Close dialog (with confirmation if message exists)
  - `Ctrl+Enter` or `Cmd+Enter`: Submit commit (if title filled)
  - `Ctrl+G` or `Cmd+G`: Trigger Generate Message

**DiffViewer navigation:**
- `Tab`: Focus on diff region (enables scrolling with arrow keys)
- `Arrow Up/Down`: Scroll diff content (when focused)
- `Escape`: Collapse diff
- `Ctrl+C` or `Cmd+C`: Copy diff to clipboard (when focused)

### Focus Management

**Focus behavior:**
- When GitPanel opens: Focus goes to first interactive element (Close button) or to search input if previously searching branches
- When CommitDialog opens: Focus goes to title input
- When BranchSwitcher opens: Focus goes to search input
- When DiffViewer expands: Focus remains on file entry (do not auto-focus diff)
- When dialog/dropdown closes: Focus returns to trigger element
- When toast appears: Screen reader announces, but focus does not move (non-modal)
- When error dialog opens: Focus goes to primary action button

**Focus indicators:**
- All interactive elements: 2px solid `#7aa2f7` outline with 2px offset
- Focus visible on keyboard navigation only (not mouse clicks) -- use `:focus-visible` CSS pseudo-class
- Focus ring never clipped by overflow (use `outline-offset`)

### ARIA Requirements

**GitPanel:**
- Panel container: `role="region"`, `aria-label="Git Integration Panel"`
- Close button: `aria-label="Close Git panel"`
- Branch switcher trigger: `aria-haspopup="listbox"`, `aria-expanded="false"` (true when open)
- Fetch/Pull/Push buttons: `aria-label="Fetch from remote"`, etc., `aria-busy="true"` when loading
- Changes section headers: `role="button"`, `aria-expanded="false"` (true when expanded), `aria-controls="{section-id}"`
- File entries (staged/unstaged/untracked): `role="checkbox"`, `aria-checked="true/false"`, `aria-label="{filename}, {status}, {stats}"`
- Conflict files: `role="alert"`, `aria-label="Merge conflict in {filename}"`
- Commit entries: `role="button"`, `aria-expanded="false"` (true when expanded), `aria-label="Commit {hash}, {message}, by {author}, {time}"`

**BranchSwitcher:**
- Dropdown: `role="listbox"`, `aria-label="Branch switcher"`
- Search input: `aria-label="Search branches"`
- Branch entries: `role="option"`, `aria-selected="true"` (for current branch only)
- Current branch indicator: `aria-current="true"`

**CommitDialog:**
- Modal overlay: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="commit-dialog-title"`
- Title input: `aria-label="Commit message title"`, `aria-describedby="title-char-count"`
- Body textarea: `aria-label="Commit message description"`
- Checkpoint checkbox: `aria-checked="true/false"`, `aria-describedby="checkpoint-tooltip"`
- Generate button: `aria-label="Generate commit message with AI"`, `aria-busy="true"` when loading
- Commit button: `aria-label="Commit {count} staged files"`, `aria-disabled="true"` when disabled, `aria-busy="true"` when loading

**DiffViewer:**
- Diff region: `role="region"`, `aria-label="Diff for {filename}"`
- Copy button: `aria-label="Copy diff to clipboard"`
- Collapse button: `aria-label="Collapse diff"`

**Toasts:**
- Toast container: `role="status"`, `aria-live="polite"` (for success), `aria-live="assertive"` (for errors)
- Toast message: Announced automatically by screen readers

**Confirmation dialogs:**
- Dialog: `role="alertdialog"`, `aria-modal="true"`, `aria-labelledby="dialog-title"`, `aria-describedby="dialog-body"`
- Primary action: `aria-label="{action} (cannot be undone)"` for destructive actions

### Screen Reader Considerations

**Announcements:**
- When GitPanel opens: "Git Integration panel opened"
- When GitPanel closes: "Git Integration panel closed"
- When file staged: "Staged {filename}"
- When file unstaged: "Unstaged {filename}"
- When commit succeeds: "Committed {count} files successfully"
- When operation fails: "{Operation} failed: {error_reason}"
- When branch switches: "Switched to branch {branch_name}"
- When merge conflicts detected: "{count} merge conflicts require resolution"
- When AI generates message: "Commit message generated"

**Live regions:**
- Staged file count in GitPanel Action Bar: `aria-live="polite"` updates when count changes
- Branch ahead/behind indicators: `aria-live="polite"` updates after fetch/pull/push
- Commit dialog summary bar: `aria-live="polite"` updates if staged files change during dialog open
- Error messages: `aria-live="assertive"` (announced immediately)

**Hidden content:**
- Decorative icons: `aria-hidden="true"` (if label text exists)
- Character counters: Announced via `aria-describedby` association, not live region
- Visual-only indicators (borders, colors): Paired with text or ARIA labels

**Descriptive labels:**
- File entries: "filename.ts, unstaged, added 12 lines, removed 3 lines"
- Commit entries: "Commit abc1234, feat: add new feature, by John Doe, 2 hours ago"
- Branch entries: "main, current branch, 3 commits ahead of origin"
- Ahead/behind: "3 commits ahead of remote" (not just "^3")

### Visual Requirements

**Contrast ratios (WCAG AA minimum 4.5:1 for text, 3:1 for UI components):**
- Primary text (`#c0caf5`) on background (`#1a1b26`): ~10.5:1
- Secondary text (`#565f89`) on background (`#1a1b26`): ~4.6:1
- Accent text (`#7aa2f7`) on background (`#1a1b26`): ~6.2:1
- Button text (`#1a1b26`) on accent background (`#7aa2f7`): ~6.2:1
- Border (`#292e42`) on background (`#1a1b26`): ~3.2:1
- Success (`#9ece6a`) on background (`#1a1b26`): ~8.1:1
- Error (`#f7768e`) on background (`#1a1b26`): ~5.3:1

**Text sizing:**
- Minimum text size: 11px (used for metadata, not primary content)
- Primary content text: 12-13px (JetBrains Mono has good legibility at small sizes)
- Headings: 14-16px
- Line-height: 1.4-1.5 for readability
- Allow text zoom up to 200% without breaking layout

**Touch targets (minimum 44x44px for mobile, 32x32px acceptable for desktop):**
- All buttons: 32x32px minimum
- Checkboxes: 16x16px with 12px padding around = 40x40px effective touch area
- File entries: Full row height 44px minimum
- Branch switcher trigger: 48px height (full row)
- Commit entries: Full row height 44px minimum

**Color is not the only indicator:**
- Staged files: Green left border + "Staged Changes" label + checkmark icon
- Unstaged files: Yellow left border + "Unstaged Changes" label + checkbox empty
- Untracked files: Gray left border + "Untracked Files" label + checkbox empty
- Conflicts: Red left border + "Merge Conflicts" label + warning icon
- Diff added lines: Green background + "+" symbol + line number
- Diff removed lines: Red background + "-" symbol + line number
- Branch ahead: Blue badge + up arrow + count + tooltip text
- Branch behind: Orange badge + down arrow + count + tooltip text

---

## 6) Responsive Behavior

**Note:** GitPanel is a fixed-width sidebar (420px). Responsive behavior primarily concerns how the panel interacts with the main window at different sizes.

### Breakpoints
- **Mobile/Small:** <768px window width (panel not shown on mobile; git operations deferred to terminal)
- **Tablet/Medium:** 768px - 1024px window width
- **Desktop/Large:** >1024px window width

### Layout Changes

**Desktop (>1024px):**
- GitPanel slides in from right, width 420px
- Terminal content pushes left to accommodate panel (if space allows)
- Panel appears as overlay if window width <1200px
- Panel has drop shadow to distinguish from terminal content when overlaying

**Tablet (768px - 1024px):**
- GitPanel slides in as full-height overlay (420px width maintained)
- Terminal content dimmed with 40% opacity overlay
- Panel has higher z-index, click outside panel closes it
- Diff viewer max-height reduced to 300px (from 400px)
- Recent commits section max-height reduced to 200px (from 300px)

**Mobile (<768px):**
- GitPanel not available (git icon in TabBar hidden or disabled)
- User directed to use terminal for git operations

### Component Adaptations

**GitPanel (within panel itself):**
- Panel width remains fixed at 420px on all supported screen sizes (tablet+)
- Scrollable sections adjust max-height based on available vertical space
- At very short window heights (<600px), Recent Commits section collapses by default

**CommitDialog:**
- Desktop: 560px width, centered
- Tablet: 90vw width, max 560px, centered
- Mobile (if supported): 100vw width, full screen, no border radius

**BranchSwitcher dropdown:**
- Desktop: 320px width, positioned below trigger
- Tablet: 280px width, positioned below trigger or above if no space below
- Mobile: Full-width dropdown (if GitPanel supported on mobile)

**DiffViewer:**
- Desktop: Full panel width (420px minus padding)
- Tablet: Same as desktop
- Horizontal scroll for long lines on all screen sizes
- Font size remains 12px (no scaling) -- monospace fonts should not scale down

**Toasts:**
- Desktop: 340px width, top-right corner of GitPanel
- Tablet: 300px width, top-right of panel
- Mobile: Full-width, top of screen (if supported)

### Animations/Transitions

**GitPanel slide-in:**
- Transition: `transform 200ms ease-out`
- Transform: `translateX(100%)` (hidden) -> `translateX(0)` (visible)
- Overlay fade-in (if applicable): `opacity 0 -> 0.4 over 200ms ease-out`

**CommitDialog appearance:**
- Overlay fade-in: `opacity 0 -> 0.6 over 150ms ease-out`
- Dialog scale-in: `transform: scale(0.95) opacity 0 -> scale(1) opacity 1 over 200ms ease-out`

**BranchSwitcher dropdown:**
- Expand: `max-height 0 -> 400px, opacity 0 -> 1 over 150ms ease-out`
- Collapse: `max-height 400px -> 0, opacity 1 -> 0 over 150ms ease-in`

**DiffViewer expand/collapse:**
- Expand: `max-height 0 -> 400px over 200ms ease-out`
- Collapse: `max-height 400px -> 0 over 200ms ease-in`
- Content opacity fade: `opacity 0 -> 1 over 100ms` (after expand starts)

**File entry hover:**
- Background transition: `background-color 100ms ease-out`
- Chevron appearance: `opacity 0 -> 1 over 100ms ease-out`

**Button interactions:**
- Hover: `background-color 100ms ease-out, border-color 100ms ease-out`
- Active/click: `transform scale(0.98) over 50ms ease-out` (subtle press effect)
- Loading spinner: Continuous rotation `360deg over 1s linear infinite`

**Success animations:**
- Checkmark overlay on Fetch/Pull/Push success: `opacity 0 -> 1 over 200ms, then 1 -> 0 over 300ms after 500ms delay`
- Generate button success: `transform scale(1.05) over 100ms ease-out, then scale(1) over 100ms ease-in`

**Error animations:**
- Button shake on operation failure: `transform translateX(-4px) -> 4px -> -4px -> 4px -> 0 over 300ms`

**Toast animations:**
- Slide in: `transform translateX(100%) -> 0 over 200ms ease-out`
- Slide out: `transform 0 -> translateX(100%) over 200ms ease-in`
- Auto-dismiss: Fade out opacity `1 -> 0 over 300ms` before sliding out

**Loading states:**
- Skeleton loaders: Shimmer effect using gradient background
  - Background: `linear-gradient(90deg, #24283b 25%, #2a2f42 50%, #24283b 75%)`
  - Animation: `background-position -200% -> 200% over 2s ease-in-out infinite`
- Spinner: Circular spinner with `border: 2px solid transparent, border-top-color: #7aa2f7, border-right-color: #7aa2f7`
  - Animation: `rotate 0deg -> 360deg over 800ms linear infinite`

---

## 7) UI Acceptance Criteria

### GitPanel

- [ ] When user clicks Git icon in TabBar, GitPanel slides in from right over 200ms
- [ ] When GitPanel is open, Git icon in TabBar shows active state (blue accent)
- [ ] When GitPanel is open and user clicks Git icon again, panel closes
- [ ] When GitPanel is open and user presses Escape, panel closes
- [ ] When directory is not a git repo, GitPanel shows "Not a Git Repository" empty state
- [ ] When user clicks "Initialize Repository", git repo is initialized and panel refreshes
- [ ] When git status returns data, Changes Section populates with files grouped by status
- [ ] When user hovers over a file entry, background changes and chevron appears
- [ ] When user clicks checkbox on unstaged file, file is staged and moves to Staged section
- [ ] When user clicks checkbox on staged file, file is unstaged and moves to Unstaged section
- [ ] When user clicks file name, DiffViewer expands below file entry over 200ms
- [ ] When DiffViewer is expanded and user clicks file name again, DiffViewer collapses
- [ ] When user clicks "Stage All", all unstaged files are staged
- [ ] When user clicks "Unstage All", all staged files are unstaged
- [ ] When user clicks "Discard All", confirmation dialog appears
- [ ] When user confirms "Discard All", unstaged changes are permanently discarded
- [ ] When no staged files exist, Commit button is disabled
- [ ] When staged files exist, Commit button is enabled and shows count
- [ ] When user clicks Commit button, CommitDialog opens
- [ ] When user clicks Generate Message button, AI generates commit message (loading state shown)
- [ ] When recent commits load, Recent Commits section shows last 10 commits
- [ ] When user clicks a commit entry, it expands to show full details
- [ ] When user clicks "Copy Hash", commit hash is copied to clipboard and toast appears
- [ ] When user hovers over branch name in Branch Bar, cursor changes to pointer
- [ ] When user clicks branch name, BranchSwitcher dropdown opens below
- [ ] When user clicks Fetch/Pull/Push button, operation runs and loading state shows
- [ ] When fetch/pull/push succeeds, success checkmark appears briefly and panel refreshes
- [ ] When fetch/pull/push fails, error toast appears with message
- [ ] When branch is ahead of remote, ahead indicator shows count
- [ ] When branch is behind remote, behind indicator shows count
- [ ] When branch is diverged, both ahead and behind indicators show
- [ ] When HEAD is detached, Detached HEAD banner appears below Branch Bar
- [ ] When merge conflicts exist, Merge Conflicts banner appears and Merge Conflicts section shows files
- [ ] When working tree is clean, Changes Section shows "Working tree clean" empty state
- [ ] When no commits exist, Recent Commits section shows "No commits yet" empty state

### BranchSwitcher

- [ ] When BranchSwitcher opens, search input is auto-focused
- [ ] When user types in search, branch list filters in real-time
- [ ] When user presses Arrow Down, next branch is highlighted
- [ ] When user presses Arrow Up, previous branch is highlighted
- [ ] When user presses Enter, highlighted branch is selected
- [ ] When user clicks a branch name, branch switches and dropdown closes
- [ ] When switching branch with uncommitted changes, confirmation dialog appears
- [ ] When user confirms "Stash & Switch", changes are stashed and branch switches
- [ ] When user confirms "Discard & Switch", changes are discarded and branch switches
- [ ] When user clicks "Create new branch...", inline input appears
- [ ] When user types branch name and clicks Create, new branch is created and switched
- [ ] When user types invalid branch name, error message appears below input
- [ ] When user presses Escape, BranchSwitcher closes
- [ ] When branch switches successfully, GitPanel refreshes and toast appears
- [ ] When branch switch fails, error toast appears

### CommitDialog

- [ ] When CommitDialog opens, title input is auto-focused
- [ ] When user types in title input, character counter updates
- [ ] When title exceeds 72 chars, character counter turns red (warning, not blocking)
- [ ] When title is empty, Commit button is disabled
- [ ] When title is filled, Commit button is enabled
- [ ] When user clicks Generate Message, AI generates message and populates fields
- [ ] When AI generation fails, error toast appears and fields remain unchanged
- [ ] When user clicks Commit, commit operation runs and dialog shows loading state
- [ ] When commit succeeds, dialog closes and success toast appears
- [ ] When commit fails, error message appears below Commit button
- [ ] When user checks "Create checkpoint", commit creates checkpoint after committing
- [ ] When user presses Ctrl+Enter (title filled), commit is submitted
- [ ] When user presses Escape, dialog closes (with confirmation if message exists)
- [ ] When user clicks outside dialog (with unsaved message), confirmation dialog appears
- [ ] When user clicks Cancel, dialog closes without committing

### DiffViewer

- [ ] When DiffViewer expands, diff content loads and displays
- [ ] When diff is loading, skeleton loader appears
- [ ] When diff is too large (>100KB), "Diff too large" message appears instead of content
- [ ] When file is binary, "Binary file" message appears instead of diff
- [ ] When diff content displays, added lines have green background
- [ ] When diff content displays, removed lines have red background
- [ ] When diff content displays, line numbers appear on left
- [ ] When user clicks Copy button, diff is copied to clipboard and toast appears
- [ ] When user clicks Collapse button, DiffViewer collapses
- [ ] When user presses Escape (DiffViewer focused), DiffViewer collapses
- [ ] When diff has very long lines, horizontal scrollbar appears

### Accessibility

- [ ] When user navigates with Tab key, focus moves through all interactive elements in logical order
- [ ] When interactive element is focused, 2px blue outline appears with offset
- [ ] When user presses Space on file checkbox, file is staged/unstaged
- [ ] When user presses Enter on file name, DiffViewer expands
- [ ] When user presses Space on section header, section collapses/expands
- [ ] When user presses Ctrl+G, GitPanel toggles visibility
- [ ] When user presses Ctrl+Enter in CommitDialog, commit is submitted
- [ ] When screen reader user focuses Git button, label announces "Git Integration, {count} files staged"
- [ ] When toast appears, screen reader announces message
- [ ] When error dialog opens, screen reader announces error and focus moves to primary action
- [ ] When file is staged, screen reader announces "Staged {filename}"
- [ ] When commit succeeds, screen reader announces "Committed {count} files successfully"
- [ ] When all text is zoomed to 200%, layout does not break and all content remains readable

### Error Handling

- [ ] When git command fails, error toast appears with specific message
- [ ] When network operation (fetch/pull/push) fails, error toast appears
- [ ] When authentication is required, authentication error dialog appears
- [ ] When merge conflicts are detected, Merge Conflicts banner and section appear
- [ ] When staging operation fails, error toast appears and file remains unstaged
- [ ] When commit operation fails, error message appears in CommitDialog

### Performance

- [ ] When GitPanel opens, git status loads within 500ms for typical repos
- [ ] When file is staged, UI updates within 100ms (optimistic update)
- [ ] When diff is requested, content appears within 300ms for typical files
- [ ] When searching branches, filter results appear within 50ms (real-time)
- [ ] When Recent Commits loads, skeleton loaders appear immediately and data populates within 500ms
