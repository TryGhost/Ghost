# AGENTS.md

E2E testing guidance for AI assistants (Claude, Codex, etc.) working with Ghost tests.

**IMPORTANT**: When creating or modifying E2E tests, always refer to `.claude/E2E_TEST_WRITING_GUIDE.md` for comprehensive testing guidelines and patterns.

## Critical Rules
1. **Always follow ADRs** in `../adr/` folder (ADR-0001: AAA pattern, ADR-0002: Page Objects)
2. **Always use pnpm**, never npm
3. **Always run after changes**: `pnpm lint` and `pnpm test:types`
4. **Never use CSS/XPath selectors** - only semantic locators or data-testid
5. **Prefer less comments and giving things clear names**

## Running E2E Tests

**`pnpm dev` must be running before you run E2E tests.** The E2E test runner auto-detects
whether the admin dev server is reachable at `http://127.0.0.1:5174`. If it is, tests run
in **dev mode** (fast, no pre-built Docker image required). If not, tests fall back to
**build mode** which requires a `ghost-e2e:local` Docker image that is only built in CI.

**If you see the error `Build image not found: ghost-e2e:local`, it means `pnpm dev` is
not running.** Start it first, wait for the admin dev server to be ready, then re-run tests.

```bash
# Terminal 1 (or background): Start dev environment from the repo root
pnpm dev

# Wait for the admin dev server to be reachable (http://127.0.0.1:5174)

# Terminal 2: Run e2e tests from the e2e/ directory
pnpm test                                       # Run all tests
pnpm test tests/path/to/test.ts                 # Run specific test
pnpm lint                                       # Required after writing tests
pnpm test:types                                 # Check TypeScript errors
pnpm build                                      # Required after factory changes
pnpm test --debug                               # See browser during execution, for debugging
PRESERVE_ENV=true pnpm test                     # Debug failed tests (keeps containers)
```
## Test Structure

### Naming Conventions
- **Test suites**: `Ghost Admin - Feature` or `Ghost Public - Feature`
- **Test names**: `what is tested - expected outcome` (lowercase)
- **One test = one scenario** (never mix multiple scenarios)

### AAA Pattern
```typescript
test('action performed - expected result', async ({page}) => {
    const analyticsPage = new AnalyticsGrowthPage(page);
    const postFactory = createPostFactory(page.request);
    const post = await postFactory.create({status: 'published'});
    
    await analyticsPage.goto();
    await analyticsPage.topContent.postsButton.click();
    
    await expect(analyticsPage.topContent.contentCard).toContainText('No conversions');
});
```

## Page Objects

### Structure
```typescript
export class AnalyticsPage extends AdminPage {
    // Public readonly locators only
    public readonly saveButton = this.page.getByRole('button', {name: 'Save'});
    public readonly emailInput = this.page.getByLabel('Email');

    // Semantic action methods
    async saveSettings() {
        await this.saveButton.click();
    }
}
```

### Rules
- Page Objects are located in `helpers/pages/`
- Expose locators as `public readonly` when used with assertions
- Methods use semantic names (`login()` not `clickLoginButton()`)
- Use `waitFor()` for guards, never `expect()` in page objects
- Keep all assertions in test files

## Locators (Strict Priority)

1. **Semantic** (always prefer):
   - `getByRole('button', {name: 'Save'})`
   - `getByLabel('Email')`
   - `getByText('Success')`

2. **Test IDs** (when semantic unavailable):
   - `getByTestId('analytics-card')`
   - Suggest adding `data-testid` to Ghost codebase when needed

3. **Never use**: CSS selectors, XPath, nth-child, class names

### Playwright MCP Usage
- Use `mcp__playwright__browser_snapshot` to find elements
- Use `mcp__playwright__browser_click` with semantic descriptions
- If no good locator exists, suggest `data-testid` addition to Ghost

## Test Data

### Factory Pattern (Required)
```typescript
import {PostFactory, UserFactory} from '../data-factory';

const postFactory = createPostFactory(page.request);
const post = await postFactory.create({userId: user.id});
```

## Best Practices

### DO ✅
- Use `usePerTestIsolation()` from `@/helpers/playwright/isolation` if a file needs per-test isolation
- Treat `config` and `labs` as environment-identity inputs: changing them should be an intentional part of test setup
- Use `resetEnvironment()` only in `beforeEach` hooks when you need a forced recycle inside per-file mode
- Keep `stripeEnabled` tests in per-test mode; the fixture forces this automatically
- Use factories for all test data
- Use Playwright's auto-waiting
- Run tests multiple times to ensure stability
- Use `test.only()` for debugging single tests

### DON'T ❌
- Use `test.describe.parallel(...)` or `test.describe.serial(...)` in e2e tests
- Use nested `test.describe.configure({mode: ...})` (mode toggles are root-level only)
- Call `resetEnvironment()` after resolving `baseURL`, `page`, `pageWithAuthenticatedUser`, or `ghostAccountOwner`
- Hard-coded waits (`waitForTimeout`)
- networkidle in waits (`networkidle`)
- Test dependencies (Test B needs Test A)
- Direct database manipulation
- Multiple scenarios in one test
- Assertions in page objects
- Manual login (auto-authenticated via fixture)

## Project Structure
- `tests/admin/` - Admin area tests
- `tests/public/` - Public site tests
- `helpers/pages/` - Page objects
- `helpers/environment/` - Container management
- `data-factory/` - Test data factories

## Validation Checklist
After writing tests, verify:
1. Test passes: `pnpm test path/to/test.ts`
2. Linting passes: `pnpm lint`
3. Types check: `pnpm test:types`
4. Follows AAA pattern with clear sections
5. Uses page objects appropriately
6. Uses semantic locators or data-testid only
7. No hard-coded waits or CSS selectors
