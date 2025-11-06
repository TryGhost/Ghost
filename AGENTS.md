# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Package Manager

**Always use `yarn` (v1) for all commands.** This repository uses yarn workspaces, not npm.

## Monorepo Structure

Ghost is a Yarn v1 + Nx monorepo with three workspace groups:

### ghost/* - Core Ghost packages
- **ghost/core** - Main Ghost application (Node.js/Express backend)
  - Core server: `ghost/core/core/server/`
  - Frontend rendering: `ghost/core/core/frontend/`
- **ghost/admin** - Ember.js admin client (legacy, being migrated to React)
- **ghost/i18n** - Centralized internationalization for all apps

### apps/* - React-based UI applications
Two categories of apps:

**Admin Apps** (embedded in Ghost Admin):
- `admin-x-settings`, `admin-x-activitypub` - Settings and integrations
- `posts`, `stats` - Post analytics and site-wide analytics
- Built with Vite + React + `@tanstack/react-query`

**Public Apps** (served to site visitors):
- `portal`, `comments-ui`, `signup-form`, `sodo-search`, `announcement-bar`
- Built as UMD bundles, loaded via CDN in site themes

**Foundation Libraries**:
- `admin-x-framework` - Shared API hooks, routing, utilities
- `admin-x-design-system` - Legacy design system (being phased out)
- `shade` - New design system (shadcn/ui + Radix UI + react-hook-form + zod)

### e2e/ - End-to-end tests
- Playwright-based E2E tests with Docker container isolation
- See `e2e/CLAUDE.md` for detailed testing guidance

## Common Commands

### Development
```bash
yarn                           # Install dependencies
yarn setup                     # First-time setup (installs deps + submodules)
yarn dev                       # Run Ghost + Admin in parallel
yarn dev:admin                 # Run only Ember admin + React apps (watch mode)
yarn dev:ghost                 # Run only Ghost backend
yarn dev:debug                 # Run with DEBUG=@tryghost*,ghost:* enabled
```

### Building
```bash
yarn build                     # Build all packages (Nx handles dependencies)
yarn build:clean               # Clean build artifacts and rebuild
```

### Testing
```bash
# Unit tests (from root)
yarn test:unit                 # Run all unit tests in all packages

# Ghost core tests (from ghost/core/)
cd ghost/core
yarn test:unit                 # Unit tests only
yarn test:integration          # Integration tests
yarn test:e2e                  # E2E API tests (not browser)
yarn test:browser              # Playwright browser tests for core
yarn test:all                  # All test types

# E2E browser tests (from root)
yarn test:e2e                  # Run e2e/ Playwright tests

# Running a single test
cd ghost/core
yarn test:single test/unit/path/to/test.test.js
```

### Linting
```bash
yarn lint                      # Lint all packages
cd ghost/core && yarn lint     # Lint Ghost core (server, shared, frontend, tests)
cd ghost/admin && yarn lint    # Lint Ember admin
```

### Database
```bash
yarn knex-migrator migrate     # Run database migrations
yarn reset:data                # Reset database with test data (1000 members, 100 posts)
yarn reset:data:empty          # Reset database with no data
```

### Docker
```bash
yarn docker:build              # Build Docker images and delete ephemeral volumes
yarn docker:dev                # Start Ghost in Docker with hot reload
yarn docker:shell              # Open shell in Ghost container
yarn docker:mysql              # Open MySQL CLI
yarn docker:test:unit          # Run unit tests in Docker
yarn docker:reset              # Reset all Docker volumes (including database) and restart
```

## Architecture Patterns

### Admin Apps Integration (Micro-Frontend)

**Build Process:**
1. Admin-x React apps build to `apps/*/dist` using Vite
2. `ghost/admin/lib/asset-delivery` copies them to `ghost/core/core/built/admin/assets/*`
3. Ghost admin serves from `/ghost/assets/{app-name}/{app-name}.js`

**Runtime Loading:**
- Ember admin uses `AdminXComponent` to dynamically import React apps
- React components wrapped in Suspense with error boundaries
- Apps receive config via `additionalProps()` method

### Public Apps Integration

- Built as UMD bundles to `apps/*/umd/*.min.js`
- Loaded via `<script>` tags in theme templates (injected by `{{ghost_head}}`)
- Configuration passed via data attributes

### i18n Architecture

**Centralized Translations:**
- Single source: `ghost/i18n/locales/{locale}/{namespace}.json`
- Namespaces: `ghost`, `portal`, `signup-form`, `comments`, `search`
- 60+ supported locales

### Build Dependencies (Nx)

Critical build order (Nx handles automatically):
1. `shade` + `admin-x-design-system` build
2. `admin-x-framework` builds (depends on #1)
3. Admin apps build (depend on #2)
4. `ghost/admin` builds (depends on #3, copies via asset-delivery)
5. `ghost/core` serves admin build

## Code Guidelines

### Commit Messages
Follow the project's commit message format:
- **1st line:** Max 80 chars, past tense, with emoji if user-facing
- **2nd line:** [blank]
- **3rd line:** `ref`, `fixes`, or `closes` with issue link
- **4th line:** Context (why this change, why now)

**Emojis for user-facing changes:**
- ✨ Feature
- 🎨 Improvement/change
- 🐛 Bug fix
- 🌐 i18n/translation
- 💡 Other user-facing changes

Example:
```
✨ Added dark mode toggle to admin settings

fixes https://github.com/TryGhost/Ghost/issues/12345
Users requested ability to switch themes for better accessibility
```

### When Working on Admin UI
- **New features:** Build in React (`apps/admin-x-*` or `apps/posts`)
- **Use:** `admin-x-framework` for API hooks (`useBrowse`, `useEdit`, etc.)
- **Use:** `shade` design system for new components (not admin-x-design-system)
- **Translations:** Add to `ghost/i18n/locales/en/ghost.json`

### When Working on Public UI
- **Edit:** `apps/portal`, `apps/comments-ui`, etc.
- **Translations:** Separate namespaces (`portal.json`, `comments.json`)
- **Build:** UMD bundles for CDN distribution

### When Working on Backend
- **Core logic:** `ghost/core/core/server/`
- **Database Schema:** `ghost/core/core/server/data/schema/`
- **API routes:** `ghost/core/core/server/api/`
- **Services:** `ghost/core/core/server/services/`
- **Models:** `ghost/core/core/server/models/`
- **Frontend & theme rendering:** `ghost/core/core/frontend/`

### Design System Usage
- **New components:** Use `shade` (shadcn/ui-inspired)
- **Legacy:** `admin-x-design-system` (being phased out, avoid for new work)

### Analytics (Tinybird)
- **Local development:** `yarn docker:dev:analytics` (starts Tinybird + MySQL)
- **Config:** Add Tinybird config to `ghost/core/config.development.json`
- **Scripts:** `ghost/core/core/server/data/tinybird/scripts/`
- **Datafiles:** `ghost/core/core/server/data/tinybird/`

### Amazon SES Email Configuration

Ghost has TWO separate email systems:

**1. Transactional Emails** (password resets, invitations, magic links):
- **Service:** `ghost/core/core/server/services/mail/`
- **Library:** `@tryghost/nodemailer` (built-in SES support via AWS SDK v3)
- **Configuration:** `ghost/core/config.development.json` → `mail.transport = "ses"`
- **Documentation:** `ai/phase-3-transactional/`

Example config:
```json
{
  "mail": {
    "transport": "ses",
    "options": {
      "region": "us-east-1",
      "accessKeyId": "YOUR_ACCESS_KEY",
      "secretAccessKey": "YOUR_SECRET_KEY"
    }
  }
}
```

**2. Bulk Newsletter Emails** (member newsletters, announcements):
- **Service:** `ghost/core/core/server/services/email-service/`
- **Library:** Custom adapter system (EmailProviderBase)
- **Configuration:** `ghost/core/config.development.json` → `adapters.email.active = "ses"`
- **Documentation:** `ai/phase-1-2-mailgun-ses/`

Example config:
```json
{
  "adapters": {
    "email": {
      "active": "ses",
      "ses": {
        "region": "us-east-1",
        "accessKeyId": "YOUR_ACCESS_KEY",
        "secretAccessKey": "YOUR_SECRET_KEY",
        "fromEmail": "noreply@yourdomain.com"
      }
    }
  }
}
```

**3. Email Analytics** (open/click/bounce tracking for newsletters):
- **Service:** `ghost/core/core/server/services/email-analytics/`
- **Provider:** EmailAnalyticsProviderSES (uses AWS SQS for event polling)
- **Configuration:** `ghost/core/config.development.json` → `emailAnalytics.ses`
- **Event Flow:** SES → SNS → SQS → Ghost polls every 5 minutes
- **Dependencies:** Requires `@aws-sdk/client-sqs` package
- **Documentation:** See Phase 4.5 SQS Integration below

Example config:
```json
{
  "emailAnalytics": {
    "ses": {
      "queueUrl": "https://sqs.us-west-1.amazonaws.com/123456789/ses-events-queue",
      "region": "us-west-1",
      "accessKeyId": "YOUR_ACCESS_KEY",
      "secretAccessKey": "YOUR_SECRET_KEY"
    }
  }
}
```

**AWS Infrastructure Requirements for SES Analytics:**
1. **SES Configuration Set**: Groups SES events (e.g., `ses-analytics`)
2. **SNS Topic**: Receives SES events (e.g., `ses-events`)
3. **SQS Queue**: Stores events for Ghost to poll (e.g., `ses-events-queue`)
4. **IAM Permissions**: User needs `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueAttributes`

**Complete Local Development Setup:**

1. **Create `ghost/core/config.development.json`** with all three configs (mail, adapters, emailAnalytics)
2. **Add `mail.from` at top level** (not nested in options) - prevents "Missing mail.from" warning
3. **Restart Ghost** - Config only loads on startup (`yarn dev`)
4. **Add newsletter subscribers** - At least 1 member must be subscribed to a newsletter for "Send as email" option to appear

**Testing SES:**
- **Transactional:** Send test email via Ghost Admin → Settings → Staff → Invite user
- **Bulk:** Create and send newsletter via Ghost Admin → Posts (requires newsletter subscribers!)
- **Analytics:** Check email analytics in Ghost Admin → Posts → Analytics
- **Test scripts:** `examples/ses-transactional-tests/`
- **AWS Console:** Check SES sending statistics, CloudWatch metrics, and SQS queue

**Verification After `yarn dev`:**
```bash
# Logs should show:
[INFO] Using Amazon SES email provider
[INFO] [EmailAnalytics] Using Amazon SES analytics provider

# Should NOT show:
[WARN] Missing mail.from config
```

**Common Issues:**
- **Admin UI shows "Mailgun" instead of "Amazon SES":** Config file is missing complete adapters object. Ghost's nconf requires ALL adapters (sso, cache, email) to be present. If only adapters.email exists, Ghost can't read it. Solution: Ensure config has all three adapters (see complete example below).
- **"Check your Mailgun configuration" on invite:** Config not loaded - restart `yarn dev`
- **"You need to set up Mailgun" when publishing:** No newsletter subscribers - add a member and subscribe them to a newsletter
- **Newsletter option missing:** Check Settings → Email newsletter shows "Amazon SES ✅"
- **emailProvider not showing in API:** Serializer at `ghost/core/core/server/api/endpoints/utils/serializers/output/config.js` must include 'emailProvider' in the keys array (line 19)

**Complete Production Config Example (config.production.json):**
```json
{
  "url": "https://yourdomain.com",
  "server": { "port": 2368, "host": "127.0.0.1" },
  "database": { ... },
  "mail": {
    "transport": "ses",
    "from": "noreply@yourdomain.com",
    "options": {
      "region": "us-west-1",
      "accessKeyId": "YOUR_KEY",
      "secretAccessKey": "YOUR_SECRET"
    }
  },
  "adapters": {
    "sso": { "active": "DefaultSSOAdapter" },
    "cache": {
      "active": "MemoryCache",
      "settings": {},
      "imageSizes": {},
      "gscan": {}
    },
    "email": {
      "active": "ses",
      "ses": {
        "region": "us-west-1",
        "accessKeyId": "YOUR_KEY",
        "secretAccessKey": "YOUR_SECRET",
        "fromEmail": "noreply@yourdomain.com",
        "configurationSet": "ses-analytics"
      }
    }
  },
  "emailAnalytics": {
    "ses": {
      "queueUrl": "https://sqs.us-west-1.amazonaws.com/ACCOUNT/QUEUE",
      "region": "us-west-1",
      "accessKeyId": "YOUR_KEY",
      "secretAccessKey": "YOUR_SECRET"
    }
  }
}
```
**CRITICAL:** The adapters object MUST include sso, cache, AND email. If any are missing, Ghost's nconf cannot read the config properly.

**Important:**
- Never commit AWS credentials to git
- `ghost/core/.gitignore` excludes `config.development.json`
- Use environment variables or IAM roles in production
- SQS polling happens every 5 minutes via scheduled job
- **Newsletter publishing requires active newsletter subscribers** - this is a Ghost requirement, not a config issue

## Pull Request Validation Workflow

When creating PRs for Ghost, follow this validation workflow to ensure code quality:

### 1. Pre-Validation: Lint and Format
```bash
# From repository root
yarn lint ghost/core/server/path/to/changed/files.js

# Fix auto-fixable issues
yarn lint --fix ghost/core/server/path/to/changed/files.js
```

**Common lint errors to fix manually:**
- Use single quotes (not double quotes)
- Use `i += 1` instead of `i++`
- Avoid variable shadowing (rename variables in nested scopes)
- Remove unused parameters
- Add parentheses around arrow function arguments with curly braces

### 2. Create PR Branches and Tags
```bash
# Create/update PR branch
git checkout -b feature/your-feature main

# Make your changes and commit
git add .
git commit -m "✨ Added feature X"

# Tag for testing
git tag -a pr-v1.0-testing -m "PR v1.0 - Feature X (ready for testing)"
```

### 3. Validate PR with ChatGPT
Before submitting to TryGhost/Ghost, get code review from ChatGPT:

1. **Prepare PR files** for review (create `ai/PR-BOT-RESPONSE.md` files)
2. **Submit all modified files** to ChatGPT with context
3. **Address all feedback** through multiple review rounds if needed
4. **Document fixes** in response files (e.g., `ai/PR5-ROUND2-RESPONSE.md`)
5. **Get final approval** before proceeding to testing

**Example ChatGPT review workflow:**
- Round 1: Initial implementation review
- Round 2-5: Address critical issues (security, functionality, edge cases)
- Final: Get "No blocking issues" approval

### 4. Local Testing
```bash
# Switch to PR branch
git checkout feature/your-feature

# Run development server
yarn dev

# Verify feature works in browser
# Check console for errors
# Test edge cases
```

### 5. Unit Test Validation
```bash
# Run relevant unit tests
cd ghost/core
yarn test:unit test/unit/path/to/feature.test.js

# If tests don't exist yet, create them before PR submission
```

### 6. VM Testing (Optional but Recommended)
Deploy to test VM to validate in production-like environment:
```bash
# SSH to test VM
ssh user@test-vm

# Pull latest changes
cd /var/www/ghost
git fetch origin
git checkout feature/your-feature
ghost restart

# Monitor logs
ghost log
```

### 7. Verify Merge Strategy
If creating multiple related PRs (e.g., PR5, PR6, PR7):
```bash
# Verify PR5 and PR6 merge cleanly into PR7
git checkout pr7-branch
git merge pr5-branch --no-commit --no-ff
git merge pr6-branch --no-commit --no-ff

# Check for conflicts
git status

# Abort test merge
git merge --abort
```

### 8. Update PR Descriptions
Ensure PR title and description accurately reflect:
- **What** was changed
- **Why** it was changed
- **How** to test it
- **Dependencies** (if any)
- **Breaking changes** (if any)

Include test results and ChatGPT review summary in description.

### 9. Final Checklist Before Submission
- ✅ All lint errors fixed (0 errors, warnings OK)
- ✅ ChatGPT code review completed with approval
- ✅ Unit tests pass (or new tests added)
- ✅ Feature tested locally
- ✅ No console errors in browser
- ✅ Commit messages follow Ghost conventions
- ✅ PR description is complete and accurate
- ✅ (Optional) Tested on VM environment

---

## Troubleshooting

### Build Issues
```bash
yarn fix                       # Clean cache + node_modules + reinstall
yarn build:clean               # Clean build artifacts
yarn nx reset                  # Reset Nx cache
```

### Test Issues
- **E2E failures:** Check `e2e/CLAUDE.md` for debugging tips
- **Docker issues:** `yarn docker:clean && yarn docker:build`

---

## Active Pull Requests (SES Integration)

This section tracks the active PR branches for Amazon SES email integration work. Keep this updated when working on these PRs.

### PR Branch Mappings

| PR # | GitHub PR | Local Branch | Status | Description |
|------|-----------|--------------|--------|-------------|
| PR5 | [#25367](https://github.com/TryGhost/Ghost/pull/25367) | `adapter/email-provider-ses` | ✅ Open | Phase 2 SES Integration (1/3) - Amazon SES email provider for bulk newsletters |
| PR6 | [#25365](https://github.com/TryGhost/Ghost/pull/25365) | `pr6/ses-analytics` | ✅ Open | Phase 2 SES Integration (2/3) - Email analytics and provider config exposure |
| PR7 | [#25366](https://github.com/TryGhost/Ghost/pull/25366) | `personalization/ses-personalization` | ✅ Open | Phase 2 SES Integration (3/3) - Newsletter personalization with config exposure |

### Important Notes

**Working Branches:**
- All PRs push to `origin` (your fork: `danielraffel/Ghost`)
- PRs target `upstream` (official repo: `TryGhost/Ghost`)
- **Do NOT push directly to upstream** - always work through your fork

**Local-Only Branches:**
- `admin/ses-ui-pr6` - Local development branch (NOT connected to GitHub PR)
- `pr5/ses-adapter-bulk` - Legacy branch name (use `adapter/email-provider-ses` instead)

**Recent Fixes Applied:**
- **Preview email validation** - Fixed optional chaining (`?.`) causing stack overflow
  - PR6: Commit d9439e80f8 (2025-01-06)
  - PR7: Commit 9558bbb180 (2025-01-06)
  - Changed from `this.config.emailProvider?.isConfigured` to `this.config.emailProvider && this.config.emailProvider.isConfigured`

**Checking PR Status:**
```bash
# List all your PRs
gh pr list --author danielraffel --repo TryGhost/Ghost --state all --limit 10

# Check specific PR
gh pr view 25365 --repo TryGhost/Ghost

# Check branch sync status
git fetch origin
git log origin/pr6/ses-analytics..pr6/ses-analytics  # Shows unpushed commits
git log pr6/ses-analytics..origin/pr6/ses-analytics  # Shows unpulled commits
```

**Pushing Updates:**
```bash
# Always push to your fork (origin), not upstream
git push origin pr6/ses-analytics
git push origin personalization/ses-personalization
git push origin adapter/email-provider-ses
```

**Last Updated:** 2025-01-06
