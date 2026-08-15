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
3. Read and follow `docs/contributing/workflow.md#commit-messages`. It is the
   source of truth for Ghost's commit conventions.
4. Run `git status --short` after committing and confirm the result.

## Important
- Do not push to remote unless the user explicitly asks
- Keep commits focused and avoid bundling unrelated changes
- If there are no relevant changes, do not create an empty commit
- If hooks fail, fix the issue and create a new commit. Never bypass hooks.

## Agent-specific guidance

- Treat the pull request title and final squash commit as the durable mainline
  history. Intermediate commits should still be clear and focused, but hook
  warnings are advisory.
- Decide whether a change is significant and user-facing from the diff and task
  context before adding a release-note emoji. Do not add one merely to silence
  a warning.
- Do not invent an issue relationship. Use the real issue URL when one exists;
  otherwise follow the documented `no ref` or blank-line options.
