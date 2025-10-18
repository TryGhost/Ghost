---
description: Generate a Ghost-style commit message and optionally commit changes
---

Create a commit message following Ghost's commit conventions:

1. Run `git status` and `git diff` to see all staged and unstaged changes
2. Analyze the changes and draft a commit message with:
   - First line: Past tense summary (max 80 chars)
   - Second line: [blank]
   - Following lines: Bullet points with context (what changed and why)
   - Use emoji ONLY if the change is user-facing (✨ Feature, 🎨 Improvement, 🐛 Bug fix, 🌐 i18n)
3. Show the commit message to the user
4. Ask: "Would you like me to commit these changes? (yes/no)"
5. If user says yes:
   - Stage all modified files with `git add`
   - Commit using the generated message
   - Run `git status` to confirm
6. If user says no, just stop

Important:
- DO NOT push to remote unless explicitly asked
- Follow the exact Ghost commit format 
