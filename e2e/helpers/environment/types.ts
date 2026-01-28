/**
 * Provider-agnostic types for e2e test environment management
 *
 * These interfaces decouple tests from specific environment implementations
 * (Docker, external Ghost, dev:forward, etc.)
 */

/**
 * Provider-agnostic representation of a test context
 * No Docker-specific fields - just what tests need
 */
export interface TestContext {
    /** Unique identifier for this test context */
    id: string;
    /** Ghost URL for this test */
    baseUrl: string;
    /** Site UUID for analytics isolation */
    siteUuid: string;
    /** Database name (if applicable for isolation) */
    database?: string;
}

/**
 * URLs for services that tests may need to interact with
 */
export interface ServiceUrls {
    ghost: string;
    /** Mailpit web UI URL */
    mailpit?: string;
    /** Mailpit API URL */
    mailpitApi?: string;
    /** Tinybird API URL */
    tinybird?: string;
    /** Portal script URL */
    portal?: string;
}

/**
 * Configuration passed to the provider for per-test setup
 */
export interface ProviderConfig {
    /** Per-test Ghost configuration (env vars) */
    ghostConfig?: Record<string, string>;
    /** Labs flags to enable */
    labs?: Record<string, boolean>;
}

/**
 * Abstract interface for environment providers
 *
 * Implementations:
 * - DockerProvider: Current behavior, creates containers per test
 * - ExternalProvider: Connects to running Ghost instance
 * - DevForwardProvider: For yarn dev:forward hybrid setup
 */
export interface EnvironmentProvider {
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

/**
 * Provider type identifier
 */
export type ProviderType = 'docker' | 'external' | 'dev-forward';
