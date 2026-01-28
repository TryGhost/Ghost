# E2E Test Environment Decoupling Plan

## Problem Statement

The current e2e test infrastructure is tightly coupled to a specific Docker-based environment setup. This makes it challenging to:
1. Run tests against the new `yarn dev:forward` hybrid environment
2. Run tests against a manually started Ghost instance for debugging
3. Adapt to future environment changes without modifying test code
4. Support different isolation strategies (per-test containers vs shared instance)

## Current Architecture Analysis

### Coupling Points Identified

| Component | Coupling Issue |
|-----------|----------------|
| `EnvironmentManager` | Creates/manages Docker containers directly |
| `GhostManager` | Hardcoded Docker network hostnames (`mysql`, `mailpit`, `tinybird-local`) |
| `MySQLManager` | Executes commands inside Docker container, hardcoded snapshot paths |
| `GhostInstance` interface | Contains `containerId` - Docker-specific field |
| `constants.ts` | Hardcoded Docker network hostnames and ports |
| `fixture.ts` | Creates new `EnvironmentManager` per test (Docker-centric lifecycle) |
| `compose.yml` | Tests assume specific e2e Docker Compose configuration |

### What Tests Actually Need

Tests don't care about Docker - they need:
1. A `baseUrl` to connect to Ghost
2. Database isolation/reset between tests
3. Authentication capabilities
4. Optional services (Tinybird, Stripe, Mailpit)
5. A way to configure labs flags and settings

## Proposed Solution: Environment Provider Abstraction

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Playwright Tests                         │
│                    (unchanged test code)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        fixture.ts                                │
│              (uses EnvironmentProvider interface)                │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EnvironmentProvider (interface)                │
│  - globalSetup(): Promise<void>                                  │
│  - globalTeardown(): Promise<void>                               │
│  - createTestContext(options): Promise<TestContext>              │
│  - destroyTestContext(context): Promise<void>                    │
│  - getServiceUrls(): ServiceUrls                                 │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ DockerProvider   │  │ ExternalProvider │  │ DevForwardProvider│
│ (current behavior)│  │ (connect to      │  │ (hybrid Docker   │
│                  │  │  running Ghost)  │  │  + host setup)   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### New Interfaces

```typescript
// helpers/environment/types.ts

/**
 * Provider-agnostic representation of a test context
 * No Docker-specific fields - just what tests need
 */
interface TestContext {
    id: string;           // Unique identifier for this test context
    baseUrl: string;      // Ghost URL for this test
    siteUuid: string;     // Site UUID for analytics isolation
    database?: string;    // Database name (if applicable for isolation)
}

/**
 * URLs for services that tests may need to interact with
 */
interface ServiceUrls {
    ghost: string;
    mailpit?: string;      // Mailpit web UI URL
    mailpitApi?: string;   // Mailpit API URL
    tinybird?: string;     // Tinybird API URL
    portal?: string;       // Portal script URL
}

/**
 * Configuration passed to the provider
 */
interface ProviderConfig {
    // Per-test Ghost configuration (env vars)
    ghostConfig?: Record<string, string>;
    // Labs flags to enable
    labs?: Record<string, boolean>;
}

/**
 * Abstract interface for environment providers
 */
interface EnvironmentProvider {
    /**
     * One-time setup before all tests run
     * For Docker: start compose services, create DB snapshot
     * For External: verify Ghost is running, maybe reset DB
     */
    globalSetup(): Promise<void>;

    /**
     * One-time teardown after all tests complete
     */
    globalTeardown(): Promise<void>;

    /**
     * Create an isolated test context
     * For Docker: spawn new Ghost container with cloned DB
     * For External: reset DB to known state, return existing Ghost URL
     */
    createTestContext(options?: ProviderConfig): Promise<TestContext>;

    /**
     * Clean up a test context
     * For Docker: stop container, drop database
     * For External: maybe reset DB state
     */
    destroyTestContext(context: TestContext): Promise<void>;

    /**
     * Get URLs for auxiliary services
     */
    getServiceUrls(): ServiceUrls;

    /**
     * Check if the environment supports true isolation per test
     * (affects parallel execution strategy)
     */
    supportsIsolation(): boolean;
}
```

### Provider Implementations

#### 1. DockerProvider (Current Behavior)

Wraps existing `EnvironmentManager` with the new interface. This maintains backward compatibility.

```typescript
// helpers/environment/providers/docker-provider.ts

class DockerProvider implements EnvironmentProvider {
    private environmentManager: EnvironmentManager;

    supportsIsolation(): boolean {
        return true; // Each test gets its own container + database
    }

    async createTestContext(options?: ProviderConfig): Promise<TestContext> {
        const ghostInstance = await this.environmentManager.perTestSetup({
            config: options?.ghostConfig
        });
        return {
            id: ghostInstance.instanceId,
            baseUrl: ghostInstance.baseUrl,
            siteUuid: ghostInstance.siteUuid,
            database: ghostInstance.database
        };
    }
    // ... other methods wrap existing functionality
}
```

#### 2. ExternalProvider (New - Connect to Running Ghost)

Connects to a Ghost instance that's already running (e.g., `yarn dev:forward`).

```typescript
// helpers/environment/providers/external-provider.ts

class ExternalProvider implements EnvironmentProvider {
    private baseUrl: string;
    private mysqlConnection: mysql.Connection;

    constructor(config: ExternalProviderConfig) {
        this.baseUrl = config.ghostUrl || process.env.GHOST_URL || 'http://localhost:2368';
        // Connect to MySQL directly (localhost:3306 in dev:forward)
    }

    supportsIsolation(): boolean {
        return false; // Single Ghost instance, sequential tests recommended
    }

    async createTestContext(options?: ProviderConfig): Promise<TestContext> {
        // Option A: Reset database to known state via direct MySQL connection
        // Option B: Use Ghost Admin API to reset data
        // Option C: Use transaction-based isolation

        await this.resetDatabase();

        // Apply labs flags via Admin API if needed
        if (options?.labs) {
            await this.applyLabsFlags(options.labs);
        }

        return {
            id: randomUUID(),
            baseUrl: this.baseUrl,
            siteUuid: await this.getSiteUuid()
        };
    }

    async destroyTestContext(context: TestContext): Promise<void> {
        // Optionally clean up test data
        // For external provider, this might be a no-op if next test resets anyway
    }
}
```

#### 3. DevForwardProvider (New - Hybrid Support)

Specialized for `yarn dev:forward` with knowledge of its specific setup.

```typescript
// helpers/environment/providers/dev-forward-provider.ts

class DevForwardProvider implements EnvironmentProvider {
    // Similar to ExternalProvider but with dev:forward specific knowledge:
    // - Knows Caddy is at localhost:2368
    // - Knows MySQL is exposed at localhost:3306
    // - Knows Mailpit is at localhost:8025
    // - Can optionally manage database isolation via cloning

    supportsIsolation(): boolean {
        // Could support isolation by creating per-test databases
        // and using a custom Ghost config to point to them
        return process.env.DEV_FORWARD_ISOLATION === 'true';
    }
}
```

### Provider Selection

```typescript
// helpers/environment/provider-factory.ts

type ProviderType = 'docker' | 'external' | 'dev-forward';

function createProvider(type?: ProviderType): EnvironmentProvider {
    const providerType = type || process.env.E2E_PROVIDER || 'docker';

    switch (providerType) {
        case 'docker':
            return new DockerProvider();
        case 'external':
            return new ExternalProvider({
                ghostUrl: process.env.GHOST_URL,
                mysqlHost: process.env.MYSQL_HOST || 'localhost',
                mysqlPort: parseInt(process.env.MYSQL_PORT || '3306'),
                // ... other config from env vars
            });
        case 'dev-forward':
            return new DevForwardProvider();
        default:
            throw new Error(`Unknown provider type: ${providerType}`);
    }
}
```

### Updated Fixture

```typescript
// helpers/playwright/fixture.ts

export const test = base.extend<GhostInstanceFixture>({
    config: [undefined, {option: true}],
    labs: [undefined, {option: true}],
    stripeConnected: [false, {option: true}],

    testContext: async ({config, labs}, use, testInfo: TestInfo) => {
        const provider = createProvider();

        const context = await provider.createTestContext({
            ghostConfig: config,
            labs: labs
        });

        await use(context);
        await provider.destroyTestContext(context);
    },

    baseURL: async ({testContext}, use) => {
        await use(testContext.baseUrl);
    },

    // ... rest remains similar but uses testContext instead of ghostInstance
});
```

## Implementation Phases

### Phase 1: Interface Extraction (Non-Breaking)

1. Create the new interface definitions in `helpers/environment/types.ts`
2. Create `DockerProvider` that wraps existing `EnvironmentManager`
3. Update `fixture.ts` to use `DockerProvider` via factory
4. All existing tests continue to work unchanged

**Files to create:**
- `helpers/environment/types.ts`
- `helpers/environment/providers/docker-provider.ts`
- `helpers/environment/provider-factory.ts`

**Files to modify:**
- `helpers/playwright/fixture.ts` (use provider factory)
- `tests/global.setup.ts` (use provider factory)
- `tests/global.teardown.ts` (use provider factory)

### Phase 2: External Provider Implementation

1. Create `ExternalProvider` implementation
2. Add MySQL client dependency for direct database access
3. Implement database reset strategy for external Ghost
4. Add environment variable configuration

**Files to create:**
- `helpers/environment/providers/external-provider.ts`
- `helpers/environment/database/mysql-client.ts` (direct MySQL, not Docker exec)

**New dependencies:**
- `mysql2` package for direct MySQL connection

### Phase 3: DevForward Provider Implementation

1. Create `DevForwardProvider` with dev:forward specific configuration
2. Add optional database isolation support
3. Document how to run tests with dev:forward

**Files to create:**
- `helpers/environment/providers/dev-forward-provider.ts`

### Phase 4: Configuration & Documentation

1. Update `playwright.config.mjs` to support provider configuration
2. Add new npm scripts for different provider modes
3. Update CLAUDE.md and other documentation
4. Add CI configuration for different provider modes

**Changes to package.json:**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:docker": "E2E_PROVIDER=docker playwright test",
    "test:e2e:external": "E2E_PROVIDER=external playwright test",
    "test:e2e:dev-forward": "E2E_PROVIDER=dev-forward playwright test"
  }
}
```

## Database Isolation Strategies

### Strategy A: Per-Test Database Clone (Current Docker Approach)
- **Pros:** Complete isolation, parallel execution safe
- **Cons:** Slow setup per test, requires container management
- **Best for:** Full test suite runs, CI

### Strategy B: Database Reset Between Tests
- **Pros:** Fast, works with any Ghost instance
- **Cons:** Sequential only, shared state risk
- **Best for:** Development, debugging single tests

### Strategy C: Transaction-Based Isolation
- **Pros:** Very fast, automatic rollback
- **Cons:** Complex to implement, may not work with all tests
- **Best for:** Future optimization

### Strategy D: No Isolation (External Ghost)
- **Pros:** Fastest, simplest
- **Cons:** Tests may interfere with each other
- **Best for:** Smoke tests, manual verification

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `E2E_PROVIDER` | Provider type: `docker`, `external`, `dev-forward` | `docker` |
| `GHOST_URL` | Ghost base URL for external providers | `http://localhost:2368` |
| `MYSQL_HOST` | MySQL host for direct connection | `localhost` |
| `MYSQL_PORT` | MySQL port for direct connection | `3306` |
| `MYSQL_USER` | MySQL user | `root` |
| `MYSQL_PASSWORD` | MySQL password | `root` |
| `MYSQL_DATABASE` | MySQL database name | `ghost` or `ghost_dev` |
| `MAILPIT_URL` | Mailpit web UI URL | `http://localhost:8025` |
| `TINYBIRD_URL` | Tinybird API URL | `http://localhost:7181` |
| `PORTAL_URL` | Portal script URL | Auto-detected |
| `PRESERVE_ENV` | Skip teardown for debugging | `false` |
| `E2E_ISOLATION` | Enable per-test isolation | `true` for docker, `false` for external |

## Migration Path

1. **No breaking changes** - Existing `yarn test:e2e` continues to work
2. **Gradual adoption** - Teams can opt-in to new providers
3. **CI compatibility** - Default behavior unchanged in CI
4. **Local development** - New providers enable faster local testing

## Testing the Implementation

```bash
# Test with current Docker setup (default, unchanged)
yarn test:e2e

# Test with dev:forward (start dev:forward first, then run tests)
yarn dev:forward  # Terminal 1
E2E_PROVIDER=dev-forward yarn test:e2e  # Terminal 2

# Test with external Ghost (any running Ghost instance)
E2E_PROVIDER=external GHOST_URL=http://localhost:2368 yarn test:e2e
```

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Tests fail with external provider due to lack of isolation | Document which tests require isolation, skip them for external |
| Performance regression with database reset | Optimize reset queries, consider transaction-based isolation |
| Configuration complexity | Sensible defaults, clear documentation, validation on startup |
| Parallel test interference | Detect provider isolation support, adjust worker count automatically |

## Success Criteria

1. All existing tests pass with `docker` provider (no regression)
2. Core smoke tests pass with `external` provider against `yarn dev:forward`
3. Configuration via environment variables works correctly
4. Documentation is clear and complete
5. Local development workflow is faster with new providers

## Appendix: File Structure After Implementation

```
e2e/
├── helpers/
│   ├── environment/
│   │   ├── types.ts                    # New: Interface definitions
│   │   ├── provider-factory.ts         # New: Provider factory
│   │   ├── providers/
│   │   │   ├── docker-provider.ts      # New: Wraps EnvironmentManager
│   │   │   ├── external-provider.ts    # New: External Ghost support
│   │   │   └── dev-forward-provider.ts # New: dev:forward support
│   │   ├── database/
│   │   │   └── mysql-client.ts         # New: Direct MySQL client
│   │   ├── service-managers/           # Existing (used by DockerProvider)
│   │   ├── environment-manager.ts      # Existing (internal to DockerProvider)
│   │   ├── docker-compose.ts           # Existing (internal to DockerProvider)
│   │   └── constants.ts                # Existing + new external defaults
│   └── playwright/
│       └── fixture.ts                  # Modified: uses provider factory
├── tests/
│   ├── global.setup.ts                 # Modified: uses provider factory
│   └── global.teardown.ts              # Modified: uses provider factory
└── package.json                        # Modified: new scripts
```
