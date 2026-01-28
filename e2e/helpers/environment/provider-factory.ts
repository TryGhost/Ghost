import baseDebug from '@tryghost/debug';
import {DockerProvider} from './providers';
import {EnvironmentProvider, ProviderType} from './types';

const debug = baseDebug('e2e:ProviderFactory');

/**
 * Singleton instance of the environment provider
 *
 * We use a singleton because:
 * 1. Playwright workers run in separate processes, but each process should use the same provider
 * 2. The provider may maintain state (like the instanceMap in DockerProvider)
 * 3. Global setup/teardown should use the same provider instance as tests
 */
let providerInstance: EnvironmentProvider | null = null;

/**
 * Get the provider type from environment variable or use default
 */
function getProviderType(): ProviderType {
    const envProvider = process.env.E2E_PROVIDER;
    if (envProvider && ['docker', 'external', 'dev-forward'].includes(envProvider)) {
        return envProvider as ProviderType;
    }
    return 'docker';
}

/**
 * Create a new provider instance based on the specified type
 */
function createProviderInstance(type: ProviderType): EnvironmentProvider {
    debug('Creating provider instance of type:', type);

    switch (type) {
    case 'docker':
        return new DockerProvider();

    case 'external':
        // Phase 2: Will be implemented as ExternalProvider
        throw new Error('External provider not yet implemented. Use E2E_PROVIDER=docker or wait for Phase 2.');

    case 'dev-forward':
        // Phase 3: Will be implemented as DevForwardProvider
        throw new Error('DevForward provider not yet implemented. Use E2E_PROVIDER=docker or wait for Phase 3.');

    default:
        throw new Error(`Unknown provider type: ${type}`);
    }
}

/**
 * Get the environment provider singleton
 *
 * Creates a new instance on first call, returns cached instance on subsequent calls.
 * The provider type is determined by the E2E_PROVIDER environment variable,
 * defaulting to 'docker' for backward compatibility.
 *
 * @param type - Optional provider type override. If not specified, uses E2E_PROVIDER env var or defaults to 'docker'.
 * @returns The environment provider instance
 */
export function getProvider(type?: ProviderType): EnvironmentProvider {
    if (!providerInstance) {
        const providerType = type || getProviderType();
        providerInstance = createProviderInstance(providerType);
        debug('Provider instance created:', providerType);
    }
    return providerInstance;
}

/**
 * Reset the provider singleton (for testing purposes)
 */
export function resetProvider(): void {
    providerInstance = null;
    debug('Provider instance reset');
}
