---
allowed-tools: Bash(git diff:*), Bash(git log:*), Bash(git status:*), Bash(git show:*), Glob, Grep, Read, Task
description: Review changes in the current branch against origin/main for security, performance, and style issues
---

## Context
- Current branch: !`git branch --show-current`
- Commits on this branch not in origin/main: !`git log origin/main..HEAD --oneline`
- Changed files with stats: !`git diff --stat origin/main...HEAD`

## Your task

Review the changes in the current branch against origin/main. Follow these steps:

1. **Gather the changes**: Use `git diff origin/main...HEAD` to see all changes. For large diffs, review file by file.

2. **Understand existing patterns**: For each modified file, read the surrounding code to understand the existing patterns and conventions used in that area of the codebase.

3. **Security Review**: Check for potential security vulnerabilities:
   - Command injection (unsanitized input passed to shell commands)
   - XSS (unsanitized user input rendered in HTML/templates)
   - SQL injection (string concatenation in queries instead of parameterized queries)
   - Path traversal (unsanitized paths used in file operations)
   - Sensitive data exposure (credentials, tokens in logs or responses)
   - Authentication/authorization bypasses
   - SSRF (server-side request forgery)

4. **Performance Review**: Check for potential performance issues:
   - N+1 query problems (queries in loops)
   - Missing database indexes for new queries
   - Inefficient algorithms (O(n^2) when O(n) is possible)
   - Memory leaks (event listeners not cleaned up, growing caches)
   - Unnecessary database queries or API calls
   - Large payloads or missing pagination
   - Blocking operations in async contexts

5. **Style Review**: Check if the code follows existing patterns:
   - Does it follow the conventions used elsewhere in the codebase?
   - Does it introduce new patterns when existing ones would work?
   - Is the code consistent with surrounding code style?
   - Are naming conventions followed?
   - Is error handling consistent with the rest of the codebase?

6. **Simplification suggestions**: Look for opportunities to simplify:
   - Duplicate code that could be extracted
   - Overly complex logic that could be simplified
   - Unnecessary abstractions or indirection
   - Code that could use existing utilities/helpers
   - Dead code or unused variables

7. **Output your review** in this format:

   ### Security Issues
   List any security concerns found, with file:line references and severity (Critical/High/Medium/Low)

   ### Performance Issues
   List any performance concerns found, with file:line references

   ### Style Issues
   List any deviations from existing codebase patterns

   ### Simplification Suggestions
   List opportunities to simplify the code

   ### Summary
   Brief overall assessment of the changes

Important:
- Be specific with file paths and line numbers
- Reference existing code patterns when suggesting style changes
- Prioritize issues by severity
- If no issues found in a category, say "None found"
