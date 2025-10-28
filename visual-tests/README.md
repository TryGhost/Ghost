# Visual Regression Tests

Visual regression tests for Ghost using Playwright.

## Setup

Install dependencies:
```bash
yarn install
```

## Running Tests

Run all visual regression tests:
```bash
yarn test
```

Run tests in headed mode (see browser):
```bash
yarn test --headed
```

Run a specific test:
```bash
yarn test tests/visual-regression.test.ts
```

## Authentication

Tests automatically use a setup project that logs in once before all tests run. The authentication state is saved and reused across all tests. **The setup appears in Playwright UI mode**, making it easy to debug authentication issues.

### Default User Role

By default, tests run as an **admin** user with credentials:
- Email: `support@ghost.org`
- Password: `abc1234567`

### Adding New User Roles

To add additional user roles (e.g., editor, author):

1. Edit `helpers/auth-roles.ts` and uncomment/add new roles:

```typescript
export const USER_ROLES = {
    admin: {
        name: 'Admin User',
        email: 'support@ghost.org',
        password: 'abc1234567',
        storageStatePath: '.auth/admin-storage-state.json'
    },
    editor: {
        name: 'Editor User',
        email: 'editor@ghost.org',
        password: 'abc1234567',
        storageStatePath: '.auth/editor-storage-state.json'
    }
} as const;
```

2. Update the type in `playwright.config.ts` (line 15):
```typescript
const userRole = (process.env.USER_ROLE || 'admin') as 'admin' | 'editor';
```

3. Update the type in `tests/auth.setup.ts` (line 7):
```typescript
const userRole = (process.env.USER_ROLE || 'admin') as 'admin' | 'editor';
```

### Switching Between User Roles

Run tests with a different user role:
```bash
USER_ROLE=editor yarn test
```

### Debugging Authentication

The authentication setup now runs as a regular test in a special "setup" project. This means:

1. **Visible in UI mode**: When you run `yarn test --ui`, you'll see "Authentication Setup" as a test
2. **Debuggable**: You can step through the authentication process, see screenshots, and inspect the page
3. **Traceable**: If authentication fails, you get full trace information just like any other test

To debug authentication issues:
```bash
yarn test --ui --project=setup
```

### How It Works

1. **Setup Project** (`tests/auth.setup.ts`):
   - Runs as a test before all other tests
   - Logs in the specified user
   - Saves authentication state to `.auth/` directory
   - Visible in Playwright UI mode for debugging

2. **Storage State**:
   - Each test project (chromium, firefox, webkit) depends on the setup project
   - Tests automatically load the saved authentication state
   - No need to log in within individual tests
   - Tests start already authenticated

3. **Configuration** (`playwright.config.ts`):
   - Setup project runs first (matches `*.setup.ts` files)
   - Other projects depend on setup and use `storageState`
   - If storage state doesn't exist, setup runs automatically

## Project Structure

```
visual-tests/
├── tests/
│   ├── auth.setup.ts               # Authentication setup (runs first)
│   └── visual-regression.test.ts   # Visual regression test suite
├── helpers/
│   ├── auth-roles.ts               # User role definitions
│   └── global-setup.ts             # Legacy file (no longer used)
├── .auth/                          # Saved authentication states (gitignored)
└── playwright.config.ts            # Playwright configuration
```

## Screenshots

Visual regression screenshots are stored in `tests/visual-regression.test.ts-snapshots/` and are automatically compared on each test run.

To update baseline screenshots:
```bash
yarn test --update-snapshots
```
