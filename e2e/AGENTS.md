# AGENTS.md

E2E testing guidance for AI assistants (Claude, Codex, etc.) working with Ghost tests.

**IMPORTANT**: `README.md` is the canonical human documentation for E2E testing.
When creating or modifying E2E tests, follow it first. Use
`./.claude/E2E_TEST_WRITING_GUIDE.md` for additional agent-oriented examples.

## Critical Rules
1. **Always use pnpm**, never npm
2. **Always run after changes**: `pnpm lint` and `pnpm test:types`
3. **Prefer semantic locators**, then stable test IDs
4. **Keep reusable UI structure and interactions in Page Objects**
5. **Avoid selectors coupled to styling or DOM position**
6. **Prefer clear names and structure over explanatory comments**; add a
   comment when an AAA boundary would otherwise be unclear

## Running E2E Tests

For normal development, start `pnpm dev` before running E2E tests. The runner
auto-detects whether the Admin dev server is reachable at
`http://127.0.0.1:5174`: when it is, tests use **dev mode**, which is the fastest
feedback loop and does not require a prebuilt Ghost E2E image.

The suite also supports **build mode** for local CI-like testing without dev
servers. Build mode requires a prepared `ghost-e2e:local` image; follow the
commands in the canonical README's [Build Mode](./README.md#build-mode-prebuilt-image)
section. If `Build image not found: ghost-e2e:local` appears unexpectedly, either
start `pnpm dev` to use dev mode or prepare the build-mode image.

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
- Put reusable page and major-component behavior in `helpers/pages/`
- Direct semantic locators are acceptable for small, one-off test interactions or assertions
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

3. **Structural fallback**: stable attributes when semantic locators are unavailable

Avoid XPath, `nth-child`, styling classes, and other selectors coupled to DOM
position or presentation. Keep necessary structural selectors in Page Objects where
practical.

### Playwright MCP Usage
- Use `mcp__playwright__browser_snapshot` to find elements
- Use `mcp__playwright__browser_click` with semantic descriptions
- If no good locator exists, suggest `data-testid` addition to Ghost

## Test Data

### Factory Pattern (Required)
```typescript
import {createPostFactory} from '@/data-factory';

const postFactory = createPostFactory(page.request);
const post = await postFactory.create({title: 'Test Post'});
```

Import through the `@/` path aliases in `tsconfig.json` (`@/data-factory`,
`@/helpers/playwright`, `@/admin-pages`), never relative paths.

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
5. Uses Page Objects for reusable UI behavior
6. Prefers semantic locators, then stable test IDs
7. Has no hard-coded waits or selectors coupled to styling/DOM position
