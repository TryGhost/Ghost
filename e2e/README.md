# Ghost End-To-End Test Suite

This test suite runs automated browser tests against a running Ghost instance to ensure critical user journeys work correctly.

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js installed (pnpm is managed via corepack — run `corepack enable pnpm` first)

### Running Tests
To run the test, within this `e2e` folder run:

```bash
# Install dependencies
pnpm

# All tests
pnpm test
```

### Dev Environment Mode (Recommended for Development)

If `GHOST_E2E_MODE` is unset, the e2e shell entrypoints auto-select:
- `dev` when the local admin dev server is reachable on `http://127.0.0.1:5174`
- `build` otherwise

To use dev mode, start `pnpm dev` before running tests:

```bash
# Terminal 1: Start dev environment (from repository root)
pnpm dev

# Terminal 2: Run e2e tests (from e2e folder)
pnpm test
```

If infra is already running, `pnpm infra:up` is safe to run again.
For dev-mode test runs, `infra:up` also ensures required local Ghost/gateway dev images exist.
If you want to force a mode, set `GHOST_E2E_MODE=dev` or `GHOST_E2E_MODE=build` explicitly.

### Analytics Development Flow

When working on analytics locally, use:

```bash
# Terminal 1 (repo root)
pnpm dev:analytics

# Terminal 2
pnpm test:analytics
```

E2E test scripts automatically sync Tinybird tokens when Tinybird is running.

### Build Mode (Prebuilt Image)

Use build mode when you don’t want to run dev servers. It uses a prebuilt Ghost image and serves public assets from `/content/files`.

```bash
# From repository root
pnpm build
pnpm --filter @tryghost/e2e build:apps
GHOST_E2E_BASE_IMAGE=<ghost-image> pnpm --filter @tryghost/e2e build:docker
GHOST_E2E_MODE=build pnpm --filter @tryghost/e2e infra:up

# Run tests
GHOST_E2E_MODE=build GHOST_E2E_IMAGE=ghost-e2e:local pnpm --filter @tryghost/e2e test
```

For a CI-like local preflight (pulls Playwright + gateway images and starts infra), run:

```bash
pnpm --filter @tryghost/e2e preflight:build
```


### Running Specific Tests

```bash
# Specific test file
pnpm test specific/folder/testfile.spec.ts

# Matching a pattern
pnpm test --grep "homepage"

# With browser visible (for debugging)
pnpm test --debug
```

## Tests Development

The test suite is organized into separate directories for different areas/functions:

### **Current Test Suites**
- `tests/public/` - Public-facing site tests (homepage, posts, etc.)
- `tests/admin/` - Ghost admin panel tests (login, content creation, settings)

We can decide whether to add additional sub-folders as we add more tests.

Example structure for admin tests:
```text
tests/admin/
├── login.spec.ts
├── posts.spec.ts
└── settings.spec.ts
```

Project folder structure can be seen below: 

```text
e2e/
├── tests/                      # All the tests
│   ├── public/                 # Public site tests
│   │   └── testname.spec.ts    # Test cases
│   ├── admin/                  # Admin site tests
│   │   └── testname.spec.ts    # Test cases
│   ├── global.setup.ts         # Global setup script
│   ├── global.teardown.ts      # Global teardown script
│   └── .eslintrc.js            # Test-specific ESLint config
├── helpers/                    # All helpers that support the tests, utilities, fixtures, page objects etc.
│   ├── playwright/             # Playwright specific helpers
│   │   └── fixture.ts          # Playwright fixtures
│   ├── pages/                  # Page Object Models
│   │   └── HomePage.ts         # Page Object
│   ├── utils/                  # Utils
│   │   └── math.ts             # Math related utils   
│   └── index.ts                # Main exports
├── playwright.config.mjs       # Playwright configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

### Writing Tests

Tests use [Playwright Test](https://playwright.dev/docs/writing-tests) framework with page objects.
Aim to format tests in Arrange Act Assert style - it will help you with directions when writing your tests.

```typescript
test.describe('Ghost Homepage', () => {
    test('loads correctly', async ({page}) => {
        // ARRANGE - setup fixtures, create helpers, prepare things that helps will need to be executed
        const homePage = new HomePage(page);
        
        // ACT - do the actions you need to do, to verify certain behaviour
        await homePage.goto();
        
        // ASSERT
        await expect(homePage.title).toBeVisible();
    });
});
```

### Using Page Objects

Page objects encapsulate page elements, and interactions. To read more about them, check [this link out](https://www.selenium.dev/documentation/test_practices/encouraged/page_object_models/) and [this link](https://martinfowler.com/bliki/PageObject.html).

```typescript
// Create a page object for admin login
export class AdminLoginPage {
    private pageUrl:string;
    
    constructor(private page: Page) {
        this.pageUrl = '/ghost'
    }

    async goto(urlToVisit = this.pageUrl) {
        await this.page.goto(urlToVisit);
    }
    
    async login(email: string, password: string) {
        await this.page.fill('[name="identification"]', email);
        await this.page.fill('[name="password"]', password);
        await this.page.click('button[type="submit"]');
    }
}
```

### Global Setup and Teardown

Tests use [Project Dependencies](https://playwright.dev/docs/test-global-setup-teardown#option-1-project-dependencies) to define special tests as global setup and teardown tests:

- Global Setup: `tests/global.setup.ts` - runs once before all tests
- Global Teardown: `tests/global.teardown.ts` - runs once after all tests

### Playwright Fixtures

[Playwright Fixtures](https://playwright.dev/docs/test-fixtures) are defined in `helpers/playwright/fixture.ts` and provide reusable test setup/teardown logic.
The fixture resolves isolation mode per test file:
- Default: per-file isolation (one Ghost environment cycle per file)
- Opt-in per-test: call `usePerTestIsolation()` from `@/helpers/playwright/isolation` at the root of the file
- Forced per-test: any run with `fullyParallel: true`

### Test Isolation

Test isolation is still automatic, but no longer always per-test.

Infrastructure (MySQL, Redis, Mailpit, Tinybird) must already be running before tests start. Use `pnpm dev` or `pnpm --filter @tryghost/e2e infra:up`.

Global setup (`tests/global.setup.ts`) does:
- Cleans up e2e containers and test databases
- Creates a base database, starts Ghost, waits for health, snapshots the DB

Per-file mode (`helpers/playwright/fixture.ts`) does:
- Clones a new database from snapshot at file boundary
- Restarts Ghost with the new database and waits for readiness
- Reuses that environment for tests in the file

Per-test mode (`helpers/playwright/fixture.ts`) does:
- Clones a new database from snapshot for each test
- Restarts Ghost with the new database and waits for readiness

Environment identity for per-file reuse:
- `config` participates in the environment identity.
- `labs` participates in the environment identity.
- If either changes between tests in the same file, the shared per-file Ghost environment is recycled before reuse.
- `stripeEnabled` does not participate in per-file reuse. It always forces per-test isolation because Ghost must boot against a per-test fake Stripe server.

Fixture option behavior:
- `config`: use for boot-time Ghost config that should get a fresh environment when it changes.
- `labs`: use for labs flags that should get a fresh environment when they change.
- `stripeEnabled`: use for Stripe-backed tests; this always runs each test with a fully isolated Ghost environment.

Escape hatch:
- `resetEnvironment()` is supported only in `beforeEach` hooks for per-file tests.
- Use it only before resolving stateful fixtures such as `baseURL`, `page`, `pageWithAuthenticatedUser`, or `ghostAccountOwner`.
- Safe hook pattern: `test.beforeEach(async ({resetEnvironment}) => { ... })`
- Unsupported pattern: calling `resetEnvironment()` after `page` or an authenticated session has already been created.
- ESLint catches the obvious misuse cases, but the runtime guard in the fixture remains the hard safety check.

Opting into per-test isolation:
- Use `usePerTestIsolation()` from `@/helpers/playwright/isolation` at the root of the file.
- This configures both Playwright parallel mode and the fixture isolation in one call.

Global teardown (`tests/global.teardown.ts`) does:
- Cleans up e2e containers and test databases (infra services stay running)

Modes:
- Dev mode: Ghost mounts source code and proxies assets to host dev servers
- Build mode: Ghost uses a prebuilt image and serves assets from `/content/files`

### Best Practices

1. **Use page object patterns** to separate page elements, actions on the pages, complex logic from tests. They should help you make them more readable and UI elements reusable.
2. **Add meaningful assertions** beyond just page loads. Keep assertions in tests.
3. **Use `data-testid` attributes** for reliable element selection, in case you **cannot** locate elements in a simple way. Example: `page.getByLabel('User Name')`. Avoid, css, xpath locators - they make tests brittle. 
4. **Clean up test data** when tests modify Ghost state
5. **Group related tests** in describe blocks
6. **Do not use should to describe test scenarios**

## CI Integration

Tests run automatically in GitHub Actions on every PR and commit to `main`.

### CI Process

1. **Setup**: Ubuntu runner with Node.js and Docker
2. **Build Assets**: Build server/admin assets and public app UMD bundles
3. **Build E2E Image**: `pnpm --filter @tryghost/e2e build:docker` (layers public apps into `/content/files`)
4. **Prepare E2E Runtime**: Pull Playwright/gateway images in parallel, start infra, and sync Tinybird state (`pnpm --filter @tryghost/e2e preflight:build`)
5. **Test Execution**: Run Playwright E2E tests inside the official Playwright container
6. **Artifacts**: Upload Playwright traces and reports on failure

## Available Scripts

Within the e2e directory:

```bash
# Run all tests
pnpm test

# Start/stop test infra (MySQL/Redis/Mailpit/Tinybird)
pnpm infra:up
pnpm infra:down

# CI-like preflight for build mode (pulls images + starts infra)
pnpm preflight:build

# Debug failed tests (keeps containers)
PRESERVE_ENV=true pnpm test

# Run TypeScript type checking
pnpm test:types

# Lint code and tests
pnpm lint

# Build (for utilities)
pnpm build
pnpm dev           # Watch mode for TypeScript compilation
```

## Resolving issues

### Test Failures

1. **Screenshots**: Playwright captures screenshots on failure
2. **Traces**: Available in `test-results/` directory
3. **Debug Mode**: Run with `pnpm test --debug` or `pnpm test --ui` to see browser
4. **Verbose Logging**: Check CI logs for detailed error information
