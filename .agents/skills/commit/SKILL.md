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
3. Always follow Ghost's commit conventions (see below) for commit messages
4. Run `git status --short` after committing and confirm the result.

## Important
- Do not push to remote unless the user explicitly asks
- Keep commits focused and avoid bundling unrelated changes
- If there are no relevant changes, do not create an empty commit
- If hooks fail, fix the issue and create a new commit. Never bypass hooks.

## Commit message format

We have a handful of simple standards for commit messages which help us to generate readable changelogs. Please follow this wherever possible and mention the associated issue number.

- **1st line:** Max 80 character summary
   - Written in past tense e.g. “Fixed the thing” not “Fixes the thing”
   - Start with one of: Fixed, Changed, Updated, Improved, Added, Removed, Reverted, Moved, Released, Bumped, Cleaned
- **2nd line:** [Always blank]
- **3rd line:** `ref <issue link>`, `fixes <issue link>`, `closes <issue link>` or blank
- **4th line:** Why this change was made - the code includes the what, the commit message should describe the context of why - why this, why now, why not something else?

If your change is **user-facing** please prepend the first line of your commit with **an emoji**.

Because emoji commits are the release notes, it's important that anything that gets an emoji is a user-facing change that's significant and relevant for end-users to see.

The first line of an emoji commit message should be from the perspective of the user. For example, 🐛 Fixed a race condition in the members service is technical and tells the user nothing, but 🐛 Fixed a bug causing active members to lose access to paid content tells the user reading the release notes “oh yeah, they fixed that bug I kept hitting.”

###  Main emojis we are using:

- ✨ Feature
- 🎨 Improvement / change
- 🐛 Bug Fix
- 🌐 i18n (translation) submissions
- 💡 Anything else flagged to users or whoever is writing release notes

### Example

```
✨ Added config flag for disabling page analytics

ref https://linear.app/tryghost/issue/ENG-1234/

- analytics are brand new under development, therefore they need to be behind a flag
- not using the developerExperiments flag as that is already in wide use and we aren't ready to deploy this anywhere yet
- using the term `pageAnalytics` as this was discussed as best reflecting what this does
```
