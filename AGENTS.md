# AGENTS.md

Guidance for AI agents working with code in this repository.

## Package Manager

**Always use `yarn` (v1).** This repository uses yarn workspaces, not npm.

## Monorepo Structure

Ghost is a Yarn v1 + Nx monorepo with three workspace groups:

### ghost/* - Core Ghost packages
- **ghost/core** - Main Ghost application (Node.js/Express backend)
- **ghost/admin** - Ember.js admin client (legacy, being migrated to React)
- **ghost/i18n** - Centralized internationalization

### apps/* - React-based UI applications
**Admin Apps** (embedded in Ghost Admin):
- `admin` - New React admin shell (migrating from Ember)
- `admin-x-settings`, `activitypub`, `posts`, `stats`
- Built with Vite + React + `@tanstack/react-query`

**Public Apps** (served to site visitors):
- `portal`, `comments-ui`, `signup-form`, `sodo-search`, `announcement-bar`

**Foundation Libraries:**
- `admin-x-framework` - Shared API hooks, routing, utilities
- `shade` - New design system (shadcn/ui + Radix UI)

### e2e/ - End-to-end tests
See `e2e/AGENTS.md` for E2E testing guidance.

## Essential Commands

```bash
yarn setup                     # First-time setup (deps + submodules)
yarn dev                       # Local development
yarn build                     # Build all packages
yarn test:unit                 # Run unit tests
yarn lint                      # Lint all packages
yarn fix                       # Clean + reinstall if things break
yarn knex-migrator migrate     # Run database migrations
```

## Documentation

For detailed guidance, see `agent-docs/`:
- `architecture.md` - Build process, micro-frontends, i18n
- `docker-development.md` - Docker setup and services
- `testing.md` - Test commands and organization
- `analytics.md` - Tinybird integration
- `react-query.md` - React Query patterns and best practices

## Code Guidelines

### When Working on Admin UI
- **New features:** Build in React (`apps/admin-x-*` or `apps/posts`)
- **Use:** `admin-x-framework` for API hooks
- **Use:** `shade` design system for new components
- **Translations:** Add to `ghost/i18n/locales/en/ghost.json`

### When Working on Backend
- **Core logic:** `ghost/core/core/server/`
- **API routes:** `ghost/core/core/server/api/`
- **Services:** `ghost/core/core/server/services/`
- **Models:** `ghost/core/core/server/models/`

### Commit Messages

Commit messages should explain *why* the change was made, not just list what changed. The reader can see the diff—they need context on the reasoning and motivation.

Format: max 80 char summary (past tense, emoji if user-facing), blank line, then `fixes`/`closes` with issue link, then a paragraph explaining the context.

**Emojis:** ✨ Feature | 🎨 Improvement | 🐛 Bug fix | 🌐 i18n

### Pull Requests

When creating PRs, use `gh pr create --draft` for work-in-progress. Always follow the PR template in `.github/PULL_REQUEST_TEMPLATE.md` and the contributor guide in `.github/CONTRIBUTING.md`.

The PR template asks three questions—answer them directly:
1. **Why** are you making this change?
2. **What** does it do?
3. **Why** do Ghost users or developers need this?

### Agent Attribution

Do not add AI attribution (co-authored-by, generated-by, etc.) to commits or PRs. The work is the team's work.

### Git Best Practices

When staging files, never use `git add -A` as it can add unexpected untracked files. Instead, explicitly add the files you intend to commit.
