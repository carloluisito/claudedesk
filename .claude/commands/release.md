# Release Skill

Create a new release for ClaudeDesk.

## Instructions

When the user runs `/release`, follow these steps:

1. **Check current state**
   - Run `git status` to ensure working directory is clean
   - If there are uncommitted changes, ask user if they want to commit them first

2. **Determine version bump**
   - Check current version in `package.json`
   - Ask user what type of release:
     - `patch` (1.0.3 → 1.0.4) - Bug fixes
     - `minor` (1.0.3 → 1.1.0) - New features
     - `major` (1.0.3 → 2.0.0) - Breaking changes
   - Or let them specify exact version

3. **Update versions**
   - Update `version` in `package.json`
   - Update version in `src/ui/app/screens/Launcher.tsx` (the hardcoded UI version)

4. **Commit and tag**
   - Stage the version changes
   - Commit with message: `chore: bump version to vX.Y.Z`
   - Create git tag `vX.Y.Z`

5. **Push release**
   - Push commits to `origin main`
   - Push tag to trigger GitHub Actions release workflow

6. **Confirm**
   - Show the GitHub Actions URL for tracking: https://github.com/carloluisito/claudedesk/actions
   - Remind user the release will publish to npm and GitHub Container Registry

## Example Usage

```
User: /release
Assistant: Current version is 1.0.3. What type of release?
User: patch
Assistant: [Updates to 1.0.4, commits, tags, pushes]
```
