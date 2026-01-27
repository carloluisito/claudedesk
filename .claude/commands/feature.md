# Feature Skill

Plan and implement a new feature for ClaudeDesk.

## Instructions

When the user runs `/feature <description>`:

1. **Product Specification**
   Use the `product-spec-designer` agent to create a detailed specification:
   - Define the problem and goals
   - Clarify requirements
   - Design API contracts
   - Define acceptance criteria

2. **UI Specification** (if UI involved)
   Use the `ui-spec-generator` agent to design:
   - Screen layouts
   - Component hierarchy
   - Interaction states
   - Accessibility requirements

3. **Implementation**
   Use the `feature-executor` agent to implement:
   - Backend changes (API routes, config, core logic)
   - Frontend changes (components, screens, routing)
   - Follow existing code patterns

4. **Build & Verify**
   - Run `npm run build` to ensure no errors
   - Test the feature manually if possible

5. **Commit**
   - Stage all changes
   - Commit with descriptive message
   - Do NOT push or release (let user decide)

## Example

```
User: /feature Add dark mode toggle to settings
Assistant: [Runs product-spec-designer, then ui-spec-generator, then feature-executor]
```

## Notes

- Always follow existing code patterns in the codebase
- Use Tailwind CSS with zinc color palette for styling
- Ensure accessibility (keyboard nav, ARIA labels)
- Don't over-engineer - keep solutions simple
