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
- **Ember Admin tests** cover the legacy Ember application in
  `apps/ember-admin/` and run through Ember Exam via Nx.

When a regression crosses several layers, prefer a focused test at the lowest
layer that proves the fix. Add a broader acceptance or browser E2E test when the
integration between layers is itself the behavior being protected.

## Write Useful Tests

- Test observable behaviour rather than private implementation details. A
  refactor that preserves behaviour should not require unrelated test changes.
- Use the smallest test boundary that provides confidence. Unit tests should
  not boot Ghost or use a database; use an integration or server E2E test when
  the database, HTTP boundary, or interaction between modules is the behaviour.
- Set up only the data relevant to the scenario. Prefer existing fixtures and
  factories over large shared datasets or dependencies on another test.
- Never call a real external service from an automated test. Use the suite's
  existing fake service, mock, or request interceptor and make its expectations
  specific enough to catch the wrong method, path, payload, or request count.
- Keep time, randomness, environment, and ordering deterministic. Restore
  modified globals, timers, mocks, configuration, and singleton state.
- Assert the result a user or caller depends on, including important side
  effects. Avoid assertions that merely repeat how the implementation works.

Snapshot tests are useful for stable, structured output, but a generated
snapshot is not proof that the output is correct. Review every changed snapshot
before committing it and add focused assertions for behaviour that should be
obvious to a reader.

## Coverage

Coverage helps find code that a test never exercises; it does not replace
meaningful assertions. Ghost Core uses Vitest's V8 coverage provider. CI applies
separate thresholds to the integration and server E2E lanes and uploads their
reports, together with Admin coverage, to Codecov. The current thresholds and
excluded files live in the relevant Vitest configuration rather than in this
guide.

Do not work towards an assumed repository-wide percentage. Add the tests needed
to protect the changed behaviour and treat an unexpected coverage reduction as
a prompt to inspect what is missing.

To inspect Ghost Core unit coverage locally, run:

```bash
cd ghost/core
pnpm test:unit --coverage
```

The HTML report is written to `ghost/core/coverage/index.html`.

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

## Diagnose Flaky Tests

A test is flaky when the same code and inputs can produce different results.
Do not assume a passing retry means the test is harmless: the nondeterminism can
come from application code as well as the test.

Common causes include:

- state shared between tests through a database, file, port, global, mock, or
  singleton;
- tests that depend on execution order or data created by another test;
- fixed delays and assertions that run before an asynchronous operation has
  reached an observable state;
- uncontrolled time, randomness, timezone, network access, or external
  services;
- parallel tests competing for the same resource; and
- a race or other nondeterminism in the application code itself.

1. Re-run the smallest affected file or test, then run its containing group to
   check for leaked state or order dependence.
2. Read the first failure rather than relying on a later retry. Browser E2E
   tests have retries disabled and retain a Playwright trace on failure.
3. Reproduce with the same concurrency, timezone, service availability, and
   isolation mode as the failing environment where those factors are relevant.
4. Replace fixed delays with an observable state change. Use fake clocks for
   time-dependent code and explicit fixtures for random or environment-derived
   values.
5. Check that each test owns its data and restores mocks, timers, globals, and
   configuration. Cleanup belongs in suite hooks that still run when an
   assertion fails.
6. Fix the underlying race or isolation failure. Do not add a retry or increase
   a timeout unless the operation is genuinely allowed to take longer.

For browser failures, use `pnpm test:e2e --debug`, the retained Playwright trace,
or the preserved-environment workflow in the E2E documentation. Ember Admin
tests can temporarily use `await this.pauseTest()` as described in its README.
Remove debugging changes before committing.

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
