# Ghost End-To-End Test Suite

This test suite runs automated browser tests against a running Ghost instance to ensure critical user journeys work correctly.

## Prerequisites

- **Node.js**: Version specified in `.nvmrc`
- **Ghost instance**: Running and accessible (see setup below)
- **Dependencies**: Installed via `yarn` from repository root

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

## Running Tests

### Locally - with Development Ghost

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

### Locally - with Custom Ghost Instance

If you have Ghost running on a different URL:

```bash
# From repository root
GHOST_BASE_URL=http://localhost:3000 yarn test:e2e
```

### Running Specific Tests

Within `e2e` folder, run one of the following commands: 

```bash
# All tests
yarn test

# Specific test file
yarn test specific/folder/testfile.spec.ts

# Matching a pattern
yarn test --grep "homepage"

# With browser visible (for debugging)
yarn test --debug
```

## Tests Development

The test suite is organized into separate directories for different areas/functions:

### **Current Test Suites**
- `tests/public/` - Public-facing site tests (homepage, posts, etc.)

### **Suggested Additional Test Suites**
- `tests/admin/` - Ghost admin panel tests (login, content creation, settings)

We can decide on additional sub-folders as we go.

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
│   └── .eslintrc.js            # Test-specific ESLint config
├── helpers/                    # All helpers that support the tests, utilities, fixtures, page objects etc.
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

### Best Practices

1. **Use page object patterns** to separate page elements, actions on the pages, complex logic from tests. They should help you make them more readable and UI elements reusable.
2. **Add meaningful assertions** beyond just page loads. Keep assertions in tests.
3. **Use `data-testid` attributes** for reliable element selection, in case you **cannot** locate elements in a simple way. Example: `page.getByLabel('User Name')`. Avoid, css, xpath locators - they make tests brittle. 
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

# Run TypeScript type checking
yarn test:types

# Lint code and tests
yarn lint

# Build (for utilities)
yarn build
yarn dev           # Watch mode for TypeScript compilation
```

## Resolving issues

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
3. **Debug Mode**: Run with `yarn test --debug` or `yarn test --ui` to see browser
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

