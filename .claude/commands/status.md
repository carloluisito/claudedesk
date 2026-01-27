# Status Skill

Check the current status of the ClaudeDesk project.

## Instructions

When the user runs `/status`, gather and display:

1. **Git Status**
   - Current branch
   - Uncommitted changes
   - Commits ahead/behind remote

2. **Version Info**
   - Current version from `package.json`
   - Latest published npm version: `npm view claudedesk version`
   - Latest git tag

3. **Build Status**
   - Check if `dist/` exists and is up to date
   - Link to GitHub Actions: https://github.com/carloluisito/claudedesk/actions

4. **Dependencies**
   - Check for outdated packages: `npm outdated`

## Example Output

```
ClaudeDesk Status
─────────────────
Branch: main
Version: 1.0.3 (local) | 1.0.3 (npm)
Build: ✓ Up to date
Git: Clean, up to date with origin

Recent Actions: https://github.com/carloluisito/claudedesk/actions
```
