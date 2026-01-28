import baseDebug from '@tryghost/debug';
import {EnvironmentManager} from '../environment-manager';
import {GhostInstance} from '../service-managers';
import {EnvironmentProvider, ProviderConfig, ServiceUrls, TestContext} from '../types';

const debug = baseDebug('e2e:DockerProvider');

/**
 * Docker-based environment provider
 *
 * Wraps the existing EnvironmentManager to provide the EnvironmentProvider interface.
 * This maintains full backward compatibility with the current Docker-based test setup.
 *
 * Each test gets its own Ghost container with a cloned database, providing
 * complete isolation and enabling parallel test execution.
 */
export class DockerProvider implements EnvironmentProvider {
    private environmentManager: EnvironmentManager;
    /**
     * Maps TestContext.id to GhostInstance for teardown
     * This is needed because TestContext doesn't contain Docker-specific fields
     */
    private instanceMap: Map<string, GhostInstance> = new Map();

    constructor() {
        this.environmentManager = new EnvironmentManager();
    }

    supportsIsolation(): boolean {
        return true;
    }

    async globalSetup(): Promise<void> {
        debug('DockerProvider: Starting global setup');
        await this.environmentManager.globalSetup();
        debug('DockerProvider: Global setup complete');
    }

    async globalTeardown(): Promise<void> {
        debug('DockerProvider: Starting global teardown');
        await this.environmentManager.globalTeardown();
        debug('DockerProvider: Global teardown complete');
    }

    async createTestContext(options?: ProviderConfig): Promise<TestContext> {
        debug('DockerProvider: Creating test context', options);

        const ghostInstance = await this.environmentManager.perTestSetup({
            config: options?.ghostConfig
        });

        const context: TestContext = {
            id: ghostInstance.instanceId,
            baseUrl: ghostInstance.baseUrl,
            siteUuid: ghostInstance.siteUuid,
            database: ghostInstance.database
        };

        // Store the full GhostInstance for teardown
        this.instanceMap.set(context.id, ghostInstance);

        debug('DockerProvider: Test context created', context);
        return context;
    }

    async destroyTestContext(context: TestContext): Promise<void> {
        debug('DockerProvider: Destroying test context', context.id);

        const ghostInstance = this.instanceMap.get(context.id);
        if (!ghostInstance) {
            debug('DockerProvider: No instance found for context, skipping teardown');
            return;
        }

        await this.environmentManager.perTestTeardown(ghostInstance);
        this.instanceMap.delete(context.id);

        debug('DockerProvider: Test context destroyed');
    }

    getServiceUrls(): ServiceUrls {
        // These are the default Docker network URLs exposed to the host
        return {
            ghost: 'http://localhost:2368',
            mailpit: 'http://localhost:8025',
            mailpitApi: 'http://localhost:8025/api',
            tinybird: 'http://localhost:7181',
            portal: 'http://localhost:4175/portal.min.js'
        };
    }
}
