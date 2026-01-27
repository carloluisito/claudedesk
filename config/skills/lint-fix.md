---
id: lint-fix
name: Lint and Fix
description: Runs linter with auto-fix on the codebase
version: "1.0.0"
type: command
command:
  run: npm run lint -- --fix
  timeout: 120000
tags:
  - lint
  - code-quality
  - automation
---

# Lint and Fix

This skill runs the project's linter with the `--fix` flag to automatically fix any fixable issues.

The command will:
1. Run ESLint (or configured linter)
2. Auto-fix all fixable issues
3. Report remaining issues that require manual intervention
