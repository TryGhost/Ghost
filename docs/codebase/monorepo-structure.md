# Monorepo structure

Ghost is a pnpm workspace. Nx runs build, lint, test, and development tasks
across the workspace dependency graph.

## Top-level directories

| Directory     | Contains                                                                      |
| ------------- | ----------------------------------------------------------------------------- |
| `apps/`       | Admin applications, public browser apps, and frontend libraries               |
| `ghost/core/` | The Ghost server, frontend rendering, migrations, and server tests            |
| `koenig/`     | The Koenig editor and packages for storing, converting, and rendering content |
| `packages/`   | Shared libraries, schemas, translations, test data, and adapter contracts     |
| `configs/`    | Shared ESLint, TypeScript, Vite, and Vitest configuration                     |
| `e2e/`        | Playwright tests for complete Admin and public-site journeys                  |
| `docker/`     | Containers and supporting services for local development and CI               |
| `scripts/`    | Repository setup, validation, build, and release tooling                      |

[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) is the source of truth for
which directories are workspaces. Read the README beside an app, package, or
service before changing it.

## Frontend applications

`apps/` contains several types of frontend project:

- `admin/` is the React Admin application.
- `ember-admin/` is the legacy Ember Admin application. Routes are moving from
  Ember to React over time.
- `activitypub/` is a React application included in Admin.
- `portal/`, `comments-ui/`, `signup-form/`, `sodo-search/`,
  `announcement-bar/`, and `admin-toolbar/` are public apps published to npm
  and loaded through the CDN.
- `shade/` is the current Admin design system.
- `admin-x-framework/` provides shared Admin API hooks, routing, and utilities.

The public apps build browser bundles loaded with script tags and read runtime
configuration from data attributes. Ghost Core renders these integrations
through theme helpers such as `{{ghost_head}}` and `{{comments}}`.

Admin combines the React and Ember applications into one interface. See
[`apps/admin/README.md`](../../apps/admin/README.md) for the current integration
boundary.

## Ghost Core

`ghost/core/` is the main `ghost` package. The most common paths are:

| Path                        | Contains                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `ghost/core/core/server/`   | APIs, models, services, data access, and server startup         |
| `ghost/core/core/frontend/` | Theme rendering, helpers, middleware, and public assets         |
| `ghost/core/core/shared/`   | Configuration and code shared across server boundaries          |
| `ghost/core/content/`       | Default themes, adapters, settings, images, and runtime content |
| `ghost/core/test/`          | Unit, integration, and server E2E tests                         |

Built Admin assets are copied into `ghost/core/core/built/admin/` for the Ghost
release. Treat `built/`, `build/`, `dist/`, and `umd/` as generated output unless
a nearby README says otherwise.

For conventions used when adding a Ghost Core service, see the
[services README](../../ghost/core/core/server/services/README.md).

## Koenig

`koenig/` contains the Lexical editor UI and the `kg-*` packages used to store,
convert, and render Ghost content. These packages were moved into this monorepo
and are local workspace dependencies during development and CI.

The editor is bundled into Admin. Ghost Core also consumes server-side Koenig
packages for content conversion and rendering. See
[`koenig/README.md`](../../koenig/README.md) for the package map and development
commands.

## Shared packages and configuration

`packages/` contains shared libraries used by Ghost Core and the apps. Adapter
base packages define contracts for storage, scheduling, redirects, caching, and
other replaceable services.

Read [`packages/README.md`](../../packages/README.md) before adding or
modernizing an internal package. New internal packages start from
`packages/_template/`; the template itself is excluded from the workspace.

`configs/` contains shared configuration packages. Workspaces depend on them by
package name instead of copying configuration into each project.
The [shared ESLint README](../../configs/eslint/README.md) explains the Node and
React factories, standalone exceptions, and plugin dependency rules.

## Workspace dependencies

Workspace packages declare local dependencies with `workspace:` versions. pnpm
links those packages from this checkout, so development and CI do not install a
separate npm copy.

External dependency versions are managed in the catalog in
[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml). Use `catalog:` in workspace
manifests rather than adding the same version in several packages.

## Nx tasks

Nx reads the package dependency graph and runs tasks in the required order. For
example, a build runs dependency builds before the project that consumes them.
Nx also caches declared task outputs.

Useful commands from the repository root are:

```bash
pnpm nx show projects
pnpm nx show project <project-name>
pnpm nx graph
pnpm nx run <project-name>:<target>
```

The root `pnpm build`, `pnpm lint`, and `pnpm test` commands use Nx to run the
matching targets across the monorepo.

## Source and production builds

Some TypeScript packages expose a `source` export condition alongside their
compiled output. Ghost Core's development server and tests enable this
condition, so they can load raw TypeScript from packages such as
`@tryghost/kg-default-nodes` without rebuilding after every change.

Production does not enable the `source` condition. It uses the compiled files
from `build/`, and the Ghost release contains those production files rather than
package source. Browser applications also use their normal build outputs.

Koenig's published `kg-*` packages retain separate ESM and CommonJS outputs as
part of their existing public package contract: `import` resolves from
`build/esm/` and `require` resolves from `build/cjs/`. Their package `files`
lists include `build/` but not `src/`, so the raw TypeScript used by the source
condition is never published. New internal packages use the ESM-only contract
documented in [`packages/README.md`](../../packages/README.md).

This means a source edit may work immediately in development while a production
build still needs `pnpm build`. Run the build when changing package exports,
build configuration, or code included in a release artifact.

## Related repositories

Some parts of Ghost live in separate repositories:

- [`TryGhost/gscan`](https://github.com/TryGhost/gscan) validates Ghost themes.
- [`TryGhost/Ghost-CLI`](https://github.com/TryGhost/Ghost-CLI) installs and
  manages production Ghost sites.
- [`TryGhost/Source`](https://github.com/TryGhost/Source),
  [`TryGhost/Casper`](https://github.com/TryGhost/Casper), and
  [`TryGhost/Themes`](https://github.com/TryGhost/Themes) contain official
  themes.
- [`TryGhost/framework`](https://github.com/TryGhost/framework) contains shared
  Node.js packages used by Ghost.
- [`TryGhost/SDK`](https://github.com/TryGhost/SDK) contains tools for working
  with Ghost's APIs.
