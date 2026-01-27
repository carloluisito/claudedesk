# Build Skill

Build the ClaudeDesk project.

## Instructions

When the user runs `/build`, execute the build process:

1. **Run the build command**
   ```bash
   npm run build
   ```
   This compiles TypeScript and builds the Vite client.

2. **Report results**
   - If successful, report build completed
   - If failed, show the error and help debug

3. **Optional: Run type check only**
   If user specifies `/build --check`, only run TypeScript type checking:
   ```bash
   npx tsc --noEmit
   ```

## Build Output

- Server code: `dist/` (TypeScript compiled)
- Client code: `dist/client/` (Vite build)
