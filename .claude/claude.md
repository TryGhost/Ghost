# Ghost Project Context

## Overview
Ghost is an open-source headless CMS and publishing platform built with Node.js. This is the main monorepo containing the core server, admin interfaces, and various supporting packages.

## Key Directories

- `/ghost/core/` - Main Ghost server (Express.js, Node.js)
  - `core/` - Server bootstrapping and business logic
  - `content/` - User content (themes, images, data)
  - `test/` - Comprehensive test suites
  
- `/ghost/admin/` - Legacy Ember.js admin panel (being migrated)

- `/apps/` - Modern applications
  - **Admin Apps** (served inside Ember admin):
    - `admin-x-framework/` - Core framework for React apps in Ember admin
    - `admin-x-settings/` - Settings UI (uses legacy admin-x-design-system)
    - `admin-x-activitypub/` - ActivityPub integration
    - `shade/` - New standard design system
    - `admin-x-design-system/` - Legacy design system (settings only)
    - `stats/` - Analytics dashboard
    - `posts/` - Post management
  - **Frontend Apps** (served on Ghost frontend):
    - `portal/` - Member signup/signin portal
    - `comments-ui/` - Comments interface
    - `sodo-search/` - Site search functionality
    - `signup-form/` - Embeddable signup forms
    - `announcement-bar/` - Site-wide announcements
  
- `/e2e/` - End-to-end tests (Playwright)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL/SQLite (Bookshelf.js ORM, Knex.js)
- **Frontend**: 
  - Legacy: Ember.js
  - Modern: React, TypeScript, Vite, Tailwind CSS
- **Build**: Nx monorepo, Yarn workspaces
- **Testing**: Mocha, Playwright, Vitest

## Common Commands

### Development
- `yarn dev` - Start development server (http://localhost:2368)
- `yarn dev:admin` - Admin panel only
- `yarn setup` - Initial project setup

### Testing
- `yarn test` - Run all tests
- `yarn test:unit` - Unit tests only
- `yarn test:e2e` - End-to-end tests

### Database
- `yarn reset:data` - Reset with sample data
- `yarn knex-migrator` - Run migrations

### Docker
- `yarn docker:dev` - Run in Docker
- `yarn docker:test:all` - Test in Docker

## Testing Strategy

Ghost uses multiple testing layers:
- Unit tests: `/test/unit/`
- Integration tests: `/test/integration/`
- E2E API tests: `/test/e2e-api/`
- E2E Browser tests: `/test/e2e-browser/`
- E2E Frontend tests: `/test/e2e-frontend/`

## Development Notes

- The project is migrating from Ember.js to React for admin interfaces
- New admin components are in `/apps/admin-x-*`
- Use TypeScript for new code when possible
- Follow existing patterns and conventions in each module
- Git branch `main` is the primary development branch

## Code Quality

- ESLint for linting
- TypeScript for type safety in newer components
- Pre-commit hooks via Husky
- Nx for build caching and optimization
