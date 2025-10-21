---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git diff:*), Bash(git commit:*)
description: Generate a Ghost-style commit message and optionally commit changes
---

## Context
- Current git status: !`git status`
- Current git diff (staged and unstaged changes): !`git diff HEAD`
- Stage modified files: !`git add`

## Your task

Create a commit message following Ghost's commit conventions:

1. Based on the uncommitted changes shown above, draft a commit message following the format and style described in @.github/CONTRIBUTING.md
2. Show the commit message to the user
3. Ask: "Would you like me to commit these changes? (yes/no)"
4. If the user says yes:
   - Stage all modified files 
   - Commit using the generated message
   - Run current git status to confirm
5. If a user says no, just stop

Important:
- DO NOT push to remote unless explicitly asked
- Follow the exact Ghost commit format 
