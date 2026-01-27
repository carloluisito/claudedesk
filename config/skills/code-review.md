---
id: code-review
name: Code Review
description: Performs a comprehensive code review focusing on best practices, security, and maintainability
version: "1.0.0"
type: prompt
inputs:
  - name: focus
    type: select
    description: Area to focus the review on
    options: ["security", "performance", "readability", "all"]
    default: "all"
  - name: severity
    type: select
    description: Minimum severity level to report
    options: ["low", "medium", "high"]
    default: "medium"
tags:
  - review
  - quality
  - best-practices
---

# Code Review Task

You are performing a code review for the repository **{{repo.id}}**.

## Focus Area: {{inputs.focus}}
## Minimum Severity: {{inputs.severity}}

## Review Guidelines

Please analyze the codebase with focus on the following areas:

### 1. Security
- Check for vulnerabilities (injection, XSS, CSRF)
- Identify exposed secrets or credentials
- Verify proper input validation
- Check authentication/authorization patterns

### 2. Performance
- Identify potential bottlenecks
- Check for unnecessary computations or memory usage
- Look for N+1 query patterns
- Verify proper caching strategies

### 3. Readability & Maintainability
- Assess naming conventions
- Check code organization and structure
- Verify proper error handling
- Look for code duplication

### 4. Best Practices
- Verify proper testing coverage
- Check for edge case handling
- Ensure consistent coding patterns
- Validate documentation adequacy

## Output Format

For each issue found, provide:

```
## [SEVERITY] Issue Title

**File:** `path/to/file.ts`
**Line:** 42

**Description:**
Brief description of the issue.

**Recommendation:**
How to fix it with code example if applicable.
```

Start by examining the recent changes or the most critical files in the repository.
