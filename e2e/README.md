# Ghost E2E Test Suite

End-to-end testing for Ghost using Playwright. This test suite runs automated browser tests against a running Ghost instance to ensure critical user journeys work correctly.

## Quick Start

From the repository root:

```bash
# Install dependencies
yarn

# Start Ghost in development mode
yarn dev

# Run the e2e tests (in a separate terminal)
yarn test:e2e
```

## Prerequisites

- **Node.js**: Version specified in `.nvmrc`
- **Ghost instance**: Running and accessible (see setup below)
- **Dependencies**: Installed via `yarn` from repository root

## Running Tests

### Locally with Development Ghost

1. **Start Ghost in development mode:**
   ```bash
   # From repository root
   yarn dev
   ```
   This starts Ghost on `http://localhost:2368`

2. **Run e2e tests:**
   ```bash
   # From repository root
   yarn test:e2e
   
   # Or directly from e2e directory
   cd e2e
   yarn test
   ```

### Locally with Custom Ghost Instance

If you have Ghost running on a different URL:

```bash
GHOST_BASE_URL=http://localhost:3000 yarn test:e2e
```

### Running Specific Tests

```bash
# Run all tests
yarn test

# Run frontend tests only
yarn test:frontend

# Run a specific test file
yarn test test/frontend/homepage.spec.ts

# Run tests matching a pattern
yarn test --grep "homepage"

# Run with browser visible (for debugging)
PLAYWRIGHT_DEBUG=1 yarn test:frontend
```

## Test Development

### Project Structure

```
e2e/
├── test/                  # Test suites organized by area
│   ├── frontend/          # Frontend/public site tests
│   │   └── homepage.spec.ts
│   └── .eslintrc.js      # Test-specific ESLint config
├── src/                  # Test utilities and helpers
│   ├── pages/            # Page Object Models
│   │   └── HomePage.ts   # Home page interactions
│   └── index.ts          # Main exports
├── playwright.config.mjs # Playwright configuration
├── package.json         # Dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

### Writing Tests

Tests use [Playwright Test](https://playwright.dev/docs/writing-tests) framework with page objects:

```typescript
import {test, expect} from '@playwright/test';
import {HomePage} from '../src/pages/HomePage';

test.describe('Ghost Homepage', () => {
    test('homepage loads correctly', async ({page}) => {
        const homePage = new HomePage(page);
        
        await homePage.goto();
        await homePage.expectToBeLoaded();
    });
});
```

#### Using Page Objects

Page objects encapsulate page interactions:

```typescript
// Create a page object for admin login
export class AdminLoginPage {
    constructor(private page: Page) {}
    
    async login(email: string, password: string) {
        await this.page.goto('/ghost/');
        await this.page.fill('[name="identification"]', email);
        await this.page.fill('[name="password"]', password);
        await this.page.click('button[type="submit"]');
    }
}
```

### Best Practices

1. **Use page object patterns** for complex interactions
2. **Add meaningful assertions** beyond just page loads
3. **Use data-testid attributes** for reliable element selection
4. **Clean up test data** when tests modify Ghost state
5. **Group related tests** in describe blocks

## CI Integration

Tests run automatically in GitHub Actions on every PR and commit to `main`.

### CI Process

1. **Setup**: Ubuntu runner with Node.js and MySQL
2. **Ghost Setup**: 
   - Install dependencies
   - Setup MySQL database
   - Run database migrations
   - Build admin interface
   - Start Ghost on port 2369
3. **Test Execution**:
   - Wait for Ghost to be ready
   - Run Playwright tests
   - Upload test artifacts

### Environment Variables in CI

- `NODE_ENV=testing-mysql` (sets Ghost port to 2369)
- `GHOST_BASE_URL=http://localhost:2369`
- `CI=true` (enables retries and specific reporters)

## Available Scripts

From the e2e directory:

```bash
# Run all tests
yarn test

# Run specific test suites
yarn test:frontend

# Run TypeScript type checking
yarn test:types

# Lint code and tests
yarn lint

# Build (for utilities)
yarn build
yarn dev           # Watch mode for TypeScript compilation
```


### Ghost Not Starting

If tests fail because Ghost isn't ready:

```bash
# Check if Ghost is running
curl http://localhost:2368

# Check Ghost logs
tail -f ghost/core/content/logs/ghost-dev.log
```

### Test Failures

1. **Screenshots**: Playwright captures screenshots on failure
2. **Traces**: Available in `test-results/` directory
3. **Debug Mode**: Run with `PLAYWRIGHT_DEBUG=1` to see browser
4. **Verbose Logging**: Check CI logs for detailed error information

### Port Conflicts

If you get port conflicts:

```bash
# Find what's using the port
lsof -i :2368
lsof -i :2369

# Kill conflicting processes
kill -9 <PID>
```

## Extending the Test Suite

The test suite is organized into separate directories for different areas/functions:

### **Current Test Suites**
- `test/frontend/` - Public-facing site tests (homepage, posts, etc.)

### **Suggested Additional Test Suites**
- `test/admin/` - Ghost admin panel tests (login, content creation, settings)
- `test/members/` - Member-related functionality (signup, login, account management)
- `test/api/` - API integration tests
- `test/themes/` - Theme switching and customization tests
- `test/analytics/` - Analytics-related tests (analytics tab, post analytics)

### **Creating New Test Suites**

1. **Create a new directory** under `test/` (e.g., `test/admin/`)
2. **Add corresponding npm script** in `package.json`:
   ```json
   "test:admin": "playwright test test/admin"
   ```
3. **Create page objects** in `src/pages/` for the new area
4. **Write tests** using the established patterns

Example structure for admin tests:
```
test/admin/
├── login.spec.ts
├── posts.spec.ts
└── settings.spec.ts
```

