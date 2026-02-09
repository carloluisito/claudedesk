# Agent Teams - ClaudeDesk User Guide

## Overview

Agent Teams is a feature that provides first-class visibility and management of Claude Code's experimental Agent Teams capability. When Claude Code spawns multiple agents that collaborate on a task, ClaudeDesk automatically detects, monitors, and visualizes their activity.

## Features

### Team Detection & Monitoring
- **Automatic detection** via file system monitoring of `~/.claude/teams/` and `~/.claude/tasks/`
- **Real-time updates** as teams form, teammates join, and tasks change
- **Session linking** - automatically links Claude sessions to their team roles

### Team Panel (Sidebar)
Open the Team Panel by clicking the **Users** icon in the tab bar, or when teams are detected (indicated by a blue badge showing the team count).

The panel shows:
- **Team list** with expandable cards
- **Member hierarchy** - lead (gold star) and teammates (blue user icon)
- **Session status** - green (running), yellow (starting), red (exited), gray (disconnected)
- **Task statistics** - pending, in-progress, and completed counts

Click on any team member to focus their terminal session.

### Task Board
A Kanban-style visualization of team tasks:
- **Three columns**: Pending | In Progress | Completed
- **Filter by**: status (all/assigned/blocked/unblocked) and team member
- **Task details**: click to expand and see description, dependencies, owner
- **Blocked indicator**: red left border on tasks that are blocked by others

### Message Stream
Real-time inter-agent communication feed:
- **Pattern detection**: Parses multiple message formats from terminal output
- **Color-coded** participants for easy visual tracking
- **Search and filter**: by content, sender, or receiver
- **Timeline view**: chronological with auto-scroll
- **Expandable details**: click to see raw output and message ID

### Agent Graph
Interactive node-based visualization using React Flow:
- **Hierarchical layout**: lead at top, teammates below
- **Node details**: agent name, role badge, connection status
- **Animated edges**: show communication flow between agents
- **Interactive**: zoom, pan, drag nodes
- **Click to focus**: click any node to focus its terminal session

### Auto-Layout
Automatically arranges split panes when teammates join:
- **Smart detection**: listens for teammate events
- **Automatic splitting**: creates new panes for new teammates
- **Respects limits**: max 4 panes
- **Configurable**: toggle on/off in Settings > General > Agent Teams

## Settings

### Agent Teams Settings (Settings > General)
- **Auto-layout teams**: When enabled (default), automatically arranges split panes when new teammates join a team.

## How It Works

1. **Environment Variable**: ClaudeDesk sets `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` on all CLI sessions, enabling the Agent Teams feature in Claude Code.

2. **File System Monitoring**: ClaudeDesk watches `~/.claude/teams/` for team configuration files and `~/.claude/tasks/` for task files. Changes are detected via `fs.watch()` with debouncing (200ms).

3. **Session Linking**: When a team is detected, ClaudeDesk searches for recently created sessions (within 30 seconds) and links them to team members. The oldest running session is assigned as the lead.

4. **Message Parsing**: Terminal output is parsed using regex patterns to extract inter-agent messages. Parsing is debounced (100ms) for performance.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Click Teams icon | Open/close Team Panel |
| Click team member | Focus their terminal session |
| Click task card | Expand/collapse task details |

## File Format

### Team Configuration (`~/.claude/teams/<team-name>.json`)
```json
{
  "members": [
    {
      "name": "Lead Agent",
      "agentId": "agent-1",
      "agentType": "lead"
    },
    {
      "name": "Helper Agent",
      "agentId": "agent-2",
      "agentType": "teammate"
    }
  ]
}
```

### Task File (`~/.claude/tasks/<task-name>.json`)
```json
{
  "tasks": [
    {
      "taskId": "1",
      "subject": "Implement feature X",
      "description": "Full description of the task",
      "status": "in_progress",
      "owner": "agent-2",
      "blockedBy": [],
      "blocks": ["2"]
    }
  ]
}
```

## Troubleshooting

### Teams not appearing
- Ensure Claude Code version supports Agent Teams
- Check that `~/.claude/teams/` directory exists
- Verify team JSON files are valid

### Session not linking to team
- Sessions must be created within 30 seconds of the team file appearing
- Try manually linking via the Team Panel
- Check that the session's `agentId` matches a team member

### Messages not appearing
- Messages are parsed from terminal output - ensure agents are actively communicating
- Check that message formats match expected patterns
- Messages are debounced by 100ms; wait briefly after agent activity

### Auto-layout not working
- Verify "Auto-layout teams" is enabled in Settings > General
- Maximum 4 panes are supported
- Each teammate is only auto-laid out once per session
