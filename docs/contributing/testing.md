# Testing Ghost

Ghost has several test suites across the monorepo. Start with the suite closest
to the behavior you changed, then run the broader checks before submitting your
pull request.

## Default Check

From the repository root, run:

```bash
pnpm check
```

This is the default one-stop command for linting and testing. It runs
`pnpm lint` followed by `pnpm test` across the monorepo.

`pnpm check` does not run the Playwright browser end-to-end suite or Ember
Admin's test suite. Run those separately when your change affects those areas.

## Choose a Test Suite

Put tests as close as possible to the code and behavior under test:

- **Unit tests** cover a function, component, or package in isolation. Most
  workspaces use Vitest and expose a `test` or `test:unit` target.
- **Ghost Core integration tests** cover interactions between server modules
  and live against a test database. They live in `ghost/core/test/integration/`.
- **Ghost Core server E2E tests** exercise the server, frontend rendering,
  webhooks, and APIs against a running Ghost instance and test database. They
  live under `ghost/core/test/e2e-*/`. These are Vitest suites, not browser
  tests. See the [Ghost Core E2E guide](../../ghost/core/test/README.md) for the
  request agents, fixtures, mocks, and snapshot helpers.
- **App acceptance tests** exercise an individual app through its UI. The
  framework and command vary by app, so use that workspace's
  `test:acceptance` target.
- **Browser E2E tests** use Playwright to cover complete journeys across Ghost
  Admin and the public site. They live in `e2e/`.
- **Ember Admin tests** cover the legacy Ember application in
  `apps/ember-admin/` and run through Ember Exam via Nx.

When a regression crosses several layers, prefer a focused test at the lowest
layer that proves the fix. Add a broader acceptance or browser E2E test when the
integration between layers is itself the behavior being protected.

## Run Focused Tests

Nx can run a target for one workspace from the repository root:

```bash
pnpm nx test <project-name>
pnpm nx test:unit <project-name>
pnpm nx test:acceptance <project-name>
```

Check the workspace's `package.json` or list its Nx targets when you are unsure
which targets it provides:

```bash
pnpm nx show project <project-name>
```

For Ghost Core, run its suites from `ghost/core/`:

```bash
cd ghost/core

pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test:all
```

`test:all` runs Ghost Core's unit, integration, server E2E, and lint targets. To
run one Ghost Core test file, use:

```bash
pnpm test:single test/unit/path/to/test.test.js
pnpm test:single test/integration/path/to/test.test.js
```

Watch mode at the repository root covers unit tests across the workspace:

```bash
pnpm test:watch
```

To watch a single database-backed Ghost Core file, point Vitest at the database
configuration explicitly:

```bash
cd ghost/core
pnpm exec vitest -c vitest.config.db.ts test/integration/path/to/test.test.js
```

Ghost Core's database-backed suites use SQLite by default locally. Tests for
optional Redis and object-storage adapters skip when their services are not
available; start the relevant development services when you need to exercise
those adapters.

## Run Browser E2E Tests

The browser suite needs its test infrastructure running. For the normal
development flow, keep `pnpm dev` running in one terminal and run the suite from
another:

```bash
# Terminal 1, from the repository root
pnpm dev

# Terminal 2, from the repository root
pnpm test:e2e
```

Run a specific file or match a test title by passing Playwright arguments:

```bash
pnpm test:e2e tests/admin/posts.spec.ts
pnpm test:e2e --grep "publish a post"
```

Use `pnpm test:e2e:debug` for Ghost E2E debug logs. See the
[browser E2E guide](../../e2e/README.md) for infrastructure modes, test
isolation, fixtures, selectors, and debugging.

## Run Ember Admin Tests

Always run Ember Admin tests through Nx so its dependency graph is built first:

```bash
# From the repository root
pnpm nx run ghost-admin:test
```

For one file, pass the numeric parallel value required by the Ember Admin test
script before the Ember Exam arguments:

```bash
pnpm nx run ghost-admin:test -- 1 \
  --file-path=tests/acceptance/editor/publish-flow-test.js
```

Do not run `ember test` or `ember exam` directly from `apps/ember-admin/`.
Doing so bypasses Nx's dependency builds and can leave required Admin and
Koenig outputs missing.

## Before Opening a Pull Request

Run `pnpm check` to ensure everything works. Also run the relevant browser E2E,
app acceptance, or Ember Admin suite when your change affects those areas.

If a full suite is impractical locally, run the most relevant focused tests and
state exactly what you ran in the pull request.
