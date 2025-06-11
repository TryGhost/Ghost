# Commit Command

Create a commit following the contributing guidelines from CONTRIBUTING.md.

## Instructions

1. **Review all changes** on the current branch using `git status` and `git diff`
2. **Write an appropriate commit message** following these guidelines:
   - **Line 1:** Max 80 characters, past tense, with emoji for user-facing changes
   - **Line 2:** Always blank  
   - **Line 3:** `ref #123`, `fixes #456`, `closes #789` or blank if no issue
   - **Line 4:** Context explaining why this change was made

3. **User-facing emojis:**
   - ✨ Feature
   - 🎨 Improvement/change
   - 🐛 Bug fix
   - 🌐 Translation
   - 💡 Other user-facing changes

4. **Add all changes** using `git add .`
5. **Commit with the message** using `git commit -m "message"`

## Examples

```
✨ Added email validation for member registration

fixes #1234

Prevents invalid email addresses from being accepted during member signup,
reducing bounce rates and improving email deliverability metrics.
```

```
🐛 Fixed admin redirect loop on login

closes #5678

Admin users were getting stuck in redirect loop when accessing protected
routes. This resolves the session handling issue in the authentication middleware.
```

```
🎨 Improved database query performance for member analytics

ref #9012

Optimized complex queries that were causing timeouts on sites with large
member bases. Uses indexed columns and reduces unnecessary joins.
```