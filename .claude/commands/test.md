# Test Skill

Run tests for ClaudeDesk.

## Instructions

When the user runs `/test`:

1. **Run test suite**
   ```bash
   npm test
   ```
   This runs vitest with `--passWithNoTests` flag.

2. **Watch mode**
   If user specifies `/test --watch` or `/test -w`:
   ```bash
   npm run test:watch
   ```

3. **Report results**
   - Show test summary
   - If tests fail, help debug the failures
