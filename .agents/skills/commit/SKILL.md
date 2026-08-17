---
name: commit
description: Commit message formatting and guidelines
---

# Commit

Use this skill whenever the user asks you to create a git commit for the current work.

## Instructions

1. Review the current git state before committing:
   - `git status`
   - `git diff`
   - `git log -5 --oneline`
2. Only stage files relevant to the requested change. Do not include unrelated untracked files, generated files, or likely-local artifacts.
3. Read and follow `.github/CONTRIBUTING.md#commit-messages`. It is the
   source of truth for Ghost's commit conventions.
4. Run `git status --short` after committing and confirm the result.

## Important
- Do not push to remote unless the user explicitly asks
- Keep commits focused and avoid bundling unrelated changes
- If there are no relevant changes, do not create an empty commit
- If hooks fail, fix the issue and create a new commit. Never bypass hooks.
