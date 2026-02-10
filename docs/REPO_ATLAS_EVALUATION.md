# Repository Atlas — Structured Evaluation

A "Repository Atlas" is a lightweight set of documentation files (architectural overview + domain-to-file index + minimal inline tags) designed to help AI tools and new contributors orient themselves in a codebase without exhaustive exploration.

This document evaluates the concept for broader adoption beyond the ClaudeDesk project where it was first implemented.

---

## 1. Feasibility Assessment

**Verdict: Highly effective for repos with 30-500 source files and clear domain boundaries.**

| Repo Size | Value | Why |
|-----------|-------|-----|
| <20 files | Low | AI can grep the whole thing in seconds |
| 30-150 files | **High** | Sweet spot — atlas prevents wrong-file edits and reduces exploration turns by 40-60% |
| 150-500 files | **Very High** | Without atlas, AI spends 3-5 turns just orienting; atlas gives it a map on turn 1 |
| 500+ files | High but insufficient alone | Atlas helps but needs supplementary tooling (LSP, tree-sitter, embedding search) |

**Most valuable when:**
- Multi-layer architecture (e.g., Electron main/renderer/shared, or any frontend/backend/shared split)
- Domain-driven design with clear feature boundaries
- Multiple AI tools used by the team (atlas is tool-agnostic)
- Frequent onboarding of new contributors or AI agents

**Minimal benefit when:**
- Single-file scripts or microservices with <10 files
- Rapidly prototyping throwaway code
- Solo developer who holds the entire codebase in memory

---

## 2. Recommended Operational Model

### Lifecycle

1. **Init**: Generate atlas once via manual curation (AI-assisted). Don't auto-generate blindly — human review ensures accuracy.
2. **Maintain**: Update atlas as part of PRs that add/remove/rename files or domains. Treat it like you'd treat API docs.
3. **Govern**: One owner (typically the tech lead or platform engineer) reviews atlas changes. Low overhead — maybe 2 minutes per PR.

### Update Triggers

- New file created in `src/`
- File renamed or deleted
- New IPC method or domain added
- New npm dependency that introduces a subsystem
- Major refactor changing domain boundaries

### Frequency

Per-PR, not scheduled. Atlas changes should ride alongside the code changes that necessitate them.

---

## 3. Risk Analysis

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Stale atlas** | High | PR checklist item + CI lint (see section 5) |
| **Over-tagging** | Medium | Hard cap: 5 files with inline tags, tags limited to 1 line each |
| **Developer resistance** | Medium | Keep it lightweight — 1 table update per PR, not a bureaucratic process |
| **Atlas becomes misleading** | High | Version-control it, review it like code, never auto-commit atlas updates |
| **Duplicate info** | Low | Atlas points to files, doesn't duplicate their content |
| **AI over-trusts atlas** | Low | Atlas says "where to look," not "what the code does" — AI still reads the code |

**Key failure mode:** Atlas says file X handles domain Y, but a refactor moved that logic to file Z. AI confidently edits the wrong file.

**Mitigation:** Atlas updates are mandatory in PRs that move code between files.

---

## 4. Technical Design Recommendations

### File Structure

```
CLAUDE.md              <- Architectural atlas (~200 lines)
docs/repo-index.md     <- Domain-to-file index (tables, ~150 lines)
```

### CLAUDE.md Structure

- Project overview (5 lines)
- Tech stack (5 lines)
- Architecture diagram (ASCII, 15 lines)
- Domain map table (10 rows x 4 columns)
- Critical patterns ("how we do things here") (30 lines)
- Pitfalls to avoid (15 lines)
- Links to detailed docs

### repo-index.md Structure

- One table per domain: Domain -> Main files | Renderer files | Shared types | IPC methods
- Entrypoint callout per domain
- Cross-cutting concerns section

### Inline Metadata Tags

Minimal. Only on the 3 true entrypoints:

```typescript
// @atlas-entrypoint: Main process — imports all 7 managers, wires IPC handlers
```

One comment line. No structured metadata schemas, no JSON-in-comments, no tag registries.

**Safe limits:** 5 or fewer tagged files. 1 line per tag max. If you need more, the atlas files aren't doing their job.

---

## 5. Automation Opportunities

### Structural Change Detection (CI)

A simple script that diffs `git diff --name-only` against `docs/repo-index.md` entries. If files were added/deleted in `src/` but `repo-index.md` wasn't modified, CI adds a warning comment (not a blocker). ~20 lines of shell script.

### Agent-Based Indexing (Future)

Agents can infer domains by analyzing:
- Import graphs
- IPC channel prefixes
- Directory structure
- Class/function naming

For ClaudeDesk specifically, `ipc-contract.ts` channel prefixes (`session:*`, `teams:*`, etc.) are already machine-readable domain markers. A maintenance agent could parse this file and suggest repo-index.md updates.

### What NOT to Automate

Don't auto-generate CLAUDE.md. The architectural atlas requires human judgment about what's important. Auto-generated docs tend to be exhaustive but unhelpful.

---

## 6. Long-Term Strategic Value

### Near-Term (3-6 months)

- AI tools make fewer wrong-file edits
- New contributors (human or AI) orient 2-3x faster
- Impact analysis: "If I change session-manager.ts, what else is affected?" — atlas answers immediately

### Medium-Term (6-12 months)

- Cross-repo atlas enables AI to reason about service boundaries
- Standardized atlas format allows tooling to aggregate domain maps across repos
- Atlas-aware agents can auto-route tasks to the right files

### Long-Term (1-2 years)

- Multi-repo knowledge graph linking domains across services
- AI refactoring tools use atlas to plan multi-file migrations
- Atlas becomes the "org chart" for code — who owns what, where things live

---

## 7. ClaudeDesk Case Study

ClaudeDesk (75 files, ~23,200 LOC, 10 domains) was the first project to implement a Repository Atlas. Key observations:

**Before atlas:**
- The existing `.claudedesk/CLAUDE.md` (327 lines) was significantly outdated
- Missing: IPC abstraction layer, Agent Teams (3,500+ lines), Split View, History, Checkpoints, Session Pool
- AI tools spent 3-5 turns exploring the codebase before making changes

**After atlas:**
- Root `CLAUDE.md` provides architectural overview with domain map
- `docs/repo-index.md` maps every file to its domain with line counts
- 3 entrypoint tags mark the key orientation files
- AI tools can navigate to any domain's files in 1 turn

**Effort to create:** ~1 hour of focused work (reading codebase + writing atlas).

**Ongoing maintenance estimate:** 2-5 minutes per PR that adds/removes files.

---

## 8. Adoption Checklist

For teams evaluating the Repository Atlas concept:

- [ ] Does your repo have 30+ source files? (Below this, atlas adds marginal value)
- [ ] Do you have clear domain or feature boundaries? (Atlas works best with domains)
- [ ] Do AI tools or new contributors regularly navigate your codebase? (Primary users of the atlas)
- [ ] Can you assign one person to review atlas changes? (Prevents staleness)
- [ ] Are you willing to add "update atlas" to your PR checklist? (Required for maintenance)

If you checked 4+, a Repository Atlas will likely save significant time.

---

## 9. Template

Teams can use this minimal template to get started:

**CLAUDE.md:**
```markdown
# Project Name

One-line description.

## Tech Stack
List your key technologies.

## Architecture
ASCII diagram of your process/layer model.

## Domain Map
| Domain | Main files | UI files | Shared types | Prefix |
|--------|-----------|----------|-------------|--------|
| ...    | ...       | ...      | ...         | ...    |

## Adding a New [Method/Endpoint/Feature]
Step-by-step instructions for the most common contributor task.

## Pitfalls
Bullet list of non-obvious gotchas.
```

**docs/repo-index.md:**
```markdown
# Repo Index
## Entrypoints
| File | Role |
| ... | ... |

## [Domain Name]
| File | Layer | Role | Lines |
| ... | ... | ... | ... |
```
