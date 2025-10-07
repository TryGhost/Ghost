# Ghost Architecture

This document provides an overview of Ghost's architecture, monorepo structure, and key design decisions.

## Table of Contents

- [Overview](#overview)
- [Monorepo Structure](#monorepo-structure)
- [Core Components](#core-components)
- [Frontend Applications](#frontend-applications)
- [Package Dependencies](#package-dependencies)
- [Database Architecture](#database-architecture)
- [API Architecture](#api-architecture)
- [Design Patterns](#design-patterns)

## Overview

Ghost is built as a **monorepo** using **Nx** and **Yarn Workspaces**. This allows multiple related packages and applications to be developed, tested, and versioned together while maintaining clear boundaries between components.

### Technology Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL 8.0+ / SQLite
- **Frontend**: React, TypeScript, Tailwind CSS
- **Build Tools**: Nx, Webpack, Vite, TypeScript
- **Testing**: Mocha, Playwright, c8 (coverage)
- **ORM**: Bookshelf.js / Knex.js

## Monorepo Structure

```
Ghost/
├── apps/                    # Frontend applications
│   ├── admin/              # Legacy Ember-based admin (being phased out)
│   ├── admin-x-activitypub/   # ActivityPub admin section
│   ├── admin-x-design-system/ # Shared design system
│   ├── admin-x-framework/     # Admin framework/utilities
│   ├── admin-x-settings/      # New React-based settings
│   ├── announcement-bar/      # Announcement bar widget
│   ├── comments-ui/           # Member comments widget
│   ├── portal/                # Member portal (signup/signin)
│   ├── posts/                 # Posts management
│   ├── shade/                 # Shade design system
│   ├── signup-form/           # Embeddable signup forms
│   ├── sodo-search/           # Search widget
│   └── stats/                 # Analytics dashboard
│
├── ghost/                   # Core Ghost packages
│   ├── core/               # Main Ghost application
│   ├── admin/              # Built admin assets
│   └── i18n/               # Internationalization
│
├── e2e/                    # End-to-end tests
├── adr/                    # Architecture Decision Records
├── .docker/                # Docker configuration
└── .github/                # CI/CD and GitHub config
```

## Core Components

### Ghost Core (`ghost/core/`)

The main Ghost application, containing:

```
ghost/core/
├── core/                   # Core application code
│   ├── server/            # Express server and API
│   │   ├── api/          # API endpoints (v3, v4, admin, content)
│   │   ├── data/         # Database models and migrations
│   │   ├── services/     # Business logic services
│   │   ├── web/          # Web layer (routing, middleware)
│   │   └── ...
│   ├── frontend/         # Frontend rendering and themes
│   └── shared/           # Shared utilities
├── test/                 # Tests (unit, integration, e2e)
├── content/              # Default content directory
└── index.js              # Application entry point
```

#### Key Directories

- **`core/server/api/`**: REST API endpoints (Content API, Admin API)
- **`core/server/data/`**: Database schema, models (Bookshelf), migrations
- **`core/server/services/`**: Business logic (members, email, themes, etc.)
- **`core/server/web/`**: Web layer, routing, middleware, SSR
- **`core/frontend/`**: Theme rendering, handlebars helpers
- **`core/shared/`**: Utilities shared across the application

### Internal Packages

Ghost uses internal packages scoped under `@tryghost` for modularity:

- `@tryghost/errors` - Error handling
- `@tryghost/logging` - Logging utilities
- `@tryghost/config` - Configuration management
- `@tryghost/tpl` - Template string handling
- And many more...

These packages live in `ghost/core/core/` or as separate npm packages.

## Frontend Applications

### Admin Applications

Ghost's admin interface is transitioning from Ember.js to React:

#### Legacy Admin (`apps/admin/`)
- Ember.js-based admin application
- Being gradually replaced by Admin-X

#### Admin-X (React-based)
- **admin-x-settings**: New settings interface
- **admin-x-framework**: Shared framework code
- **admin-x-design-system**: Shared React components and design tokens
- **admin-x-activitypub**: ActivityPub integration

### Member-facing Applications

#### Portal (`apps/portal/`)
- Member signup, signin, and account management
- Embeddable widget for websites
- React-based

#### Comments UI (`apps/comments-ui/`)
- Member commenting system
- Embeddable widget
- React-based

#### Signup Form (`apps/signup-form/`)
- Standalone embeddable signup forms
- Highly customizable
- React-based

#### Sodo Search (`apps/sodo-search/`)
- Embeddable search widget
- Fast client-side search

### Design Systems

#### Shade (`apps/shade/`)
- New design system for Ghost
- Shared components and utilities

#### Admin-X Design System
- React components for Admin-X
- Tailwind CSS-based
- Storybook documentation

## Package Dependencies

### Workspace Structure

The monorepo uses Yarn workspaces defined in the root `package.json`:

```json
{
  "workspaces": [
    "ghost/*",
    "e2e",
    "apps/*"
  ]
}
```

### Nx for Task Running

Nx orchestrates builds, tests, and development tasks:

- **Caching**: Speeds up repeated tasks
- **Parallel execution**: Runs independent tasks simultaneously
- **Dependency graph**: Understands package relationships

## Database Architecture

### Schema Management

- **Migrations**: Managed via `knex-migrator`
- **Version control**: Migrations are versioned and tracked
- **Database**: Supports MySQL 8.0+ and SQLite

### ORM Layer

- **Bookshelf.js**: Object-relational mapping
- **Knex.js**: Query builder underneath Bookshelf

### Key Models

Located in `ghost/core/core/server/data/models/`:

- **Post**: Blog posts and pages
- **User**: Authors and administrators
- **Member**: Subscribers/members
- **Tag**: Content taxonomy
- **Settings**: Site configuration
- **Email**: Newsletter emails
- **Offer**: Membership offers
- **Product**: Membership tiers

## API Architecture

Ghost provides multiple APIs:

### Content API
- **Public read-only API**
- For fetching published content
- Used by themes and external applications
- Versioned (currently v3/v4)

### Admin API
- **Authenticated API** for admin operations
- Full CRUD operations
- Used by admin applications
- Versioned (currently v3/v4)

### Members API
- **Authentication and member management**
- Handles signup, signin, subscriptions
- Integration with Stripe for payments

### API Structure

APIs are structured as:

```
core/server/api/
├── endpoints/          # API endpoint definitions
├── shared/            # Shared API utilities
└── [version]/         # Version-specific implementations
```

## Design Patterns

### Service Pattern

Business logic is organized into services:

```
core/server/services/
├── members/           # Member management
├── email/            # Email sending
├── themes/           # Theme handling
├── routing/          # Dynamic routing
├── settings/         # Settings management
└── ...
```

Each service encapsulates related functionality and can be tested independently.

### Event-Driven Architecture

Ghost uses events for decoupling:

- **DomainEvents**: Internal event bus
- Services emit events when actions occur
- Other services listen and react to events

### Repository Pattern

Data access is abstracted through models and repositories, separating business logic from data persistence.

### Dependency Injection

Services receive dependencies through constructor injection, improving testability.

## Analytics Integration

Ghost integrates with **Tinybird** for analytics:

- Located in `ghost/core/core/server/data/tinybird/`
- Provides real-time analytics
- Separate data pipeline from main application

## Testing Architecture

See [TESTING.md](./TESTING.md) for detailed testing information.

### Test Organization

- **Unit tests**: `test/unit/` - Test individual functions/classes
- **Integration tests**: `test/integration/` - Test API endpoints and service interactions
- **E2E tests**: `test/e2e-*` and `e2e/` - Test complete user flows
- **Browser tests**: `test/e2e-browser/` - Playwright browser tests

## Architecture Decision Records

The [adr/](../adr/) directory contains Architecture Decision Records documenting significant architectural choices:

- [ADR-0001: Test Structure](../adr/0001-aaa-test-structure.md)
- [ADR-0002: Page Objects Pattern](../adr/0002-page-objects-pattern.md)

## Further Reading

- [Development Guide](./DEVELOPMENT.md) - Development workflow and setup
- [Testing Guide](./TESTING.md) - Running and writing tests
- [Official Docs](https://ghost.org/docs/) - User and developer documentation
- [API Docs](https://ghost.org/docs/content-api/) - API reference
