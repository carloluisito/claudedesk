---
id: full-check
name: Full Quality Check
description: Runs a complete quality check pipeline - lint, typecheck, and tests
version: "1.0.0"
type: workflow
workflow:
  steps:
    - command: npm run lint
    - command: npm run typecheck
    - command: npm test
tags:
  - ci
  - quality
  - pipeline
---

# Full Quality Check

This workflow skill runs a complete quality assurance pipeline:

1. **Lint** - Check code style and potential issues
2. **Typecheck** - Verify TypeScript types
3. **Test** - Run the test suite

If any step fails, the workflow stops and reports the error.
