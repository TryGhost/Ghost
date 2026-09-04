# Testing Ghost

Ghost has several test suites across the monorepo. Start with the suite closest
to the behavior you changed, then run the broader checks before submitting your
pull request.

## Default Check

From the repository root, run:

```bash
pnpm check
```

This is the default one-stop command for formatting checks, linting, and
testing. It runs `pnpm format:check`, `pnpm lint`, and then `pnpm test` across
the monorepo.

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
  Admin and the public site. They live in `e2e/`. See
  [Writing Browser E2E Tests](e2e-testing.md) for conventions and examples.
- **Smoke tests** walk a whole feature through the running product with no mocks
  and no implementation knowledge. They live in `e2e/smoke/`, are run by hand
  rather than in CI, and are covered under [Run Smoke Tests](#run-smoke-tests).
- **Ember Admin tests** cover the legacy Ember application in
  `apps/ember-admin/` and run through Ember Exam via Nx.

When a regression crosses several layers, prefer a focused test at the lowest
layer that proves the fix. Add a broader acceptance or browser E2E test when the
integration between layers is itself the behavior being protected.

For physical-device testing and URL configurations such as HTTPS,
subdirectories, or a separate Admin origin, see
[Testing development URLs and devices](testing-development-urls.md).

For provider-backed development and the test doubles used by browser tests, see
[Email testing](testing-email.md) and [Stripe testing](testing-stripe.md).

## Run Focused Tests

Nx can run a target for one workspace from the repository root:

```bash
pnpm nx test <project-name>
pnpm nx test:types <project-name>
pnpm nx test:unit <project-name>
pnpm nx test:acceptance <project-name>
```

Run all package typechecks with `pnpm test:types`. CI runs this as a dedicated
affected-project task, separately from unit tests.

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

Ghost Core's database-backed suites use MySQL locally and in CI. Start the
development services with `pnpm dev` before running them locally. Tests for
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

Run a specific file or match a test title by passing Playwright arguments. For
example, the first command runs the existing Admin sign-in test:

```bash
pnpm test:e2e tests/admin/signin.test.ts
pnpm test:e2e --grep "publish a post"
```

Use `pnpm test:e2e:debug` for Ghost E2E debug logs. See the
[E2E workspace README](../../e2e/README.md) for infrastructure modes, test
isolation, fixtures, and debugging, and
[Writing Browser E2E Tests](e2e-testing.md) for test conventions, selectors,
and Page Objects.

## Run Smoke Tests

A smoke test walks a whole feature through the real product the way a person
uses it. It uses zero mocks and zero implementation knowledge: everything is
located by role, label, text, or placeholder, never by a test id, a CSS class,
or a `data-` attribute. The Admin API may set the scene (sign in, seed a member,
flip a labs flag, fetch a member sign-in URL), but every outcome is read off the
screen. A downloaded file the product hands the user, such as a members export,
counts as the screen.

Smoke tests are never a CI gate. Run one by hand at the moments where you want
evidence that the whole feature works together: before flipping a feature flag
on, and before a release. When part of the environment is missing, such as
Stripe or a webhook tunnel, the affected steps skip with a message saying what
was not covered and the run stays green.

They live in `e2e/smoke/` and drive the long-lived development stack:

```bash
# From the repository root
pnpm smoke
```

The command reuses a stack that is already running. If nothing is listening it
starts `pnpm dev:stripe` in the background, waits for Ghost and the Admin dev
server, and names the log file if they never arrive. The stack is left running
afterwards.

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
