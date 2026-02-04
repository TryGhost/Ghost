import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {
    BASE_GHOST_ENV,
    BUILD_IMAGE,
    CADDYFILE_PATHS,
    DEV_ENVIRONMENT,
    LOCAL_ASSET_URLS,
    REPO_ROOT,
    TEST_ENVIRONMENT,
    TINYBIRD
} from '@/helpers/environment/constants';
import {isTinybirdAvailable} from '@/helpers/environment/service-availability';
import type {Container, ContainerCreateOptions} from 'dockerode';
import type {EnvironmentMode} from '@/helpers/environment/environment-manager';

const debug = baseDebug('e2e:GhostManager');

/**
 * Represents a running Ghost instance for E2E tests.
 */
export interface GhostInstance {
    containerId: string;
    instanceId: string;
    database: string;
    port: number;
    baseUrl: string;
    siteUuid: string;
}

export interface GhostManagerConfig {
    workerIndex: number;
    mode: EnvironmentMode;
}

/**
 * Manages Ghost and Gateway containers for dev environment mode.
 * Creates worker-scoped containers that persist across tests.
 */
export class GhostManager {
    private readonly docker: Docker;
    private readonly config: GhostManagerConfig;
    private ghostContainer: Container | null = null;
    private gatewayContainer: Container | null = null;

    constructor(config: GhostManagerConfig) {
        this.docker = new Docker();
        this.config = config;
    }

    get ghostContainerId(): string | null {
        return this.ghostContainer?.id ?? null;
    }

    getGatewayPort(): number {
        return 30000 + this.config.workerIndex;
    }

    /**
     * Set up Ghost and Gateway containers for this worker.
     * 
     * @param database Optional database name to use. If not provided, uses 'ghost_testing'.
     */
    async setup(database?: string): Promise<void> {
        debug(`Setting up containers for worker ${this.config.workerIndex}...`);

        // For build mode, verify the image exists before proceeding
        if (this.config.mode === 'build') {
            await this.verifyBuildImageExists();
        }

        const ghostName = `ghost-e2e-worker-${this.config.workerIndex}`;
        const gatewayName = `ghost-e2e-gateway-${this.config.workerIndex}`;

        // Try to reuse existing containers (handles process restarts after test failures)
        this.ghostContainer = await this.getOrCreateContainer(ghostName, () => this.createGhostContainer(ghostName, database));
        this.gatewayContainer = await this.getOrCreateContainer(gatewayName, () => this.createGatewayContainer(gatewayName, ghostName));

        debug(`Worker ${this.config.workerIndex} containers ready`);
    }

    /**
     * Verify the build image exists locally.
     * Fails early with a helpful error message if the image is not available.
     */
    async verifyBuildImageExists(): Promise<void> {
        try {
            const image = this.docker.getImage(BUILD_IMAGE);
            await image.inspect();
            debug(`Build image verified: ${BUILD_IMAGE}`);
        } catch {
            throw new Error(
                `Build image not found: ${BUILD_IMAGE}\n\n` +
                `To fix this, either:\n` +
                `  1. Build locally: yarn build:e2e-image\n` +
                `  2. Pull from registry: docker pull ${BUILD_IMAGE}\n` +
                `  3. Use a different image: GHOST_E2E_IMAGE=<image> yarn test:build`
            );
        }
    }

    /**
     * Get existing container if running, otherwise create new one.
     * This handles Playwright respawning processes after test failures.
     */
    private async getOrCreateContainer(name: string, create: () => Promise<Container>): Promise<Container> {
        try {
            const existing = this.docker.getContainer(name);
            const info = await existing.inspect();
            
            if (info.State.Running) {
                debug(`Reusing running container: ${name}`);
                return existing;
            }
            
            // Exists but stopped - start it
            debug(`Starting stopped container: ${name}`);
            await existing.start();
            return existing;
        } catch {
            // Doesn't exist - create new
            debug(`Creating new container: ${name}`);
            const container = await create();
            await container.start();
            return container;
        }
    }

    async teardown(): Promise<void> {
        debug(`Tearing down worker ${this.config.workerIndex} containers...`);

        if (this.gatewayContainer) {
            await this.removeContainer(this.gatewayContainer);
            this.gatewayContainer = null;
        }
        if (this.ghostContainer) {
            await this.removeContainer(this.ghostContainer);
            this.ghostContainer = null;
        }

        debug(`Worker ${this.config.workerIndex} containers removed`);
    }

    async restartWithDatabase(databaseName: string, extraConfig?: Record<string, string>): Promise<void> {
        if (!this.ghostContainer) {
            throw new Error('Ghost container not initialized');
        }

        debug('Restarting Ghost with database:', databaseName);

        const info = await this.ghostContainer.inspect();
        const containerName = info.Name.replace(/^\//, '');

        // Remove old and create new with updated database
        await this.removeContainer(this.ghostContainer);
        this.ghostContainer = await this.createGhostContainer(containerName, databaseName, extraConfig);
        await this.ghostContainer.start();

        debug('Ghost restarted with database:', databaseName);
    }

    /**
     * Wait for Ghost container to become healthy.
     * Uses Docker's built-in health check mechanism.
     */
    async waitForReady(timeoutMs: number = 120000): Promise<void> {
        if (!this.ghostContainer) {
            throw new Error('Ghost container not initialized');
        }
        await this.waitForHealthy(this.ghostContainer, timeoutMs);
    }

    private async buildEnv(database: string = 'ghost_testing', extraConfig?: Record<string, string>): Promise<string[]> {
        const env = [
            ...BASE_GHOST_ENV,
            `database__connection__database=${database}`,
            `url=http://localhost:${this.getGatewayPort()}`
        ];

        // For dev mode, add local asset URLs (served via gateway proxying to host dev servers)
        // Registry mode uses production CDN URLs (no override needed)
        // Local mode has asset URLs baked into the E2E image via ENV vars
        if (this.config.mode === 'dev') {
            env.push(...LOCAL_ASSET_URLS);
        }

        // Add Tinybird config if available
        // Static endpoints are set here; workspaceId and adminToken are sourced from
        // /mnt/shared-config/.env.tinybird by development.entrypoint.sh
        if (await isTinybirdAvailable()) {
            env.push(
                `TB_HOST=http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                `TB_LOCAL_HOST=${TINYBIRD.LOCAL_HOST}`,
                `tinybird__stats__endpoint=http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                `tinybird__stats__endpointBrowser=http://localhost:${TINYBIRD.PORT}`,
                `tinybird__tracker__endpoint=http://localhost:${this.getGatewayPort()}/.ghost/analytics/api/v1/page_hit`,
                'tinybird__tracker__datasource=analytics_events'
            );
        }

        if (extraConfig) {
            for (const [key, value] of Object.entries(extraConfig)) {
                env.push(`${key}=${value}`);
            }
        }

        return env;
    }

    private async createGhostContainer(
        name: string,
        database: string = 'ghost_testing',
        extraConfig?: Record<string, string>
    ): Promise<Container> {
        const mode = this.config.mode;
        debug(`Creating Ghost container for mode: ${mode}`);

        // Determine image based on mode
        // - build: Build image (local or registry, controlled by GHOST_E2E_IMAGE)
        // - dev: Dev image from compose.dev.yaml
        const image = mode === 'build' ? BUILD_IMAGE : TEST_ENVIRONMENT.ghost.image;

        // Build volume mounts based on mode
        const binds = this.getGhostBinds();

        const config: ContainerCreateOptions = {
            name,
            Image: image,
            Env: await this.buildEnv(database, extraConfig),
            ExposedPorts: {[`${TEST_ENVIRONMENT.ghost.port}/tcp`]: {}},
            Healthcheck: {
                // Same health check as compose.dev.yaml - Ghost is ready when it responds
                Test: ['CMD', 'node', '-e', `fetch('http://localhost:${TEST_ENVIRONMENT.ghost.port}',{redirect:'manual'}).then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))`],
                Interval: 1000000000, // 1s in nanoseconds
                Timeout: 5000000000, // 5s in nanoseconds
                Retries: 60,
                StartPeriod: 5000000000 // 5s in nanoseconds
            },
            HostConfig: {
                Binds: binds,
                ExtraHosts: ['host.docker.internal:host-gateway']
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [DEV_ENVIRONMENT.networkName]: {Aliases: [name]}
                }
            },
            Labels: {
                'com.docker.compose.project': TEST_ENVIRONMENT.projectNamespace,
                'tryghost/e2e': `ghost-${mode}`
            }
        };

        return this.docker.createContainer(config);
    }

    /**
     * Get volume binds for Ghost container based on mode.
     * - dev: Mount ghost directory for source code (hot reload)
     * - build: No source mounts, fully self-contained image
     */
    private getGhostBinds(): string[] {
        const binds: string[] = [
            // Shared config volume for Tinybird credentials (all modes)
            'ghost-dev_shared-config:/mnt/shared-config:ro'
        ];

        if (this.config.mode === 'dev') {
            binds.push(`${REPO_ROOT}/ghost:/home/ghost/ghost`);
        }

        return binds;
    }

    private async createGatewayContainer(name: string, ghostBackend: string): Promise<Container> {
        const mode = this.config.mode;
        debug(`Creating Gateway container for mode: ${mode}`);

        // Use caddy image and mount appropriate Caddyfile based on mode
        // - dev: Proxies to host dev servers for HMR
        // - build: Minimal passthrough (assets served by Ghost or default CDN)
        const caddyfilePath = mode === 'dev' ? CADDYFILE_PATHS.dev : CADDYFILE_PATHS.build;
        
        const binds: string[] = [
            `${caddyfilePath}:/etc/caddy/Caddyfile:ro`
        ];

        // Environment variables for Caddy
        const env = [
            `GHOST_BACKEND=${ghostBackend}:${TEST_ENVIRONMENT.ghost.port}`,
            'ANALYTICS_PROXY_TARGET=ghost-dev-analytics:3000'
        ];

        const config: ContainerCreateOptions = {
            name,
            Image: TEST_ENVIRONMENT.gateway.image,
            Env: env,
            ExposedPorts: {'80/tcp': {}},
            HostConfig: {
                Binds: binds,
                PortBindings: {'80/tcp': [{HostPort: String(this.getGatewayPort())}]},
                ExtraHosts: ['host.docker.internal:host-gateway']
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [DEV_ENVIRONMENT.networkName]: {Aliases: [name]}
                }
            },
            Labels: {
                'com.docker.compose.project': TEST_ENVIRONMENT.projectNamespace,
                'tryghost/e2e': `gateway-${mode}`
            }
        };

        return this.docker.createContainer(config);
    }

    private async removeContainer(container: Container): Promise<void> {
        try {
            await container.remove({force: true});
        } catch {
            debug('Failed to remove container:', container.id);
        }
    }

    /**
     * Remove all e2e containers by project label.
     */
    async cleanupAllContainers(): Promise<void> {
        try {
            const containers = await this.docker.listContainers({
                all: true,
                filters: {
                    label: [`com.docker.compose.project=${TEST_ENVIRONMENT.projectNamespace}`]
                }
            });

            await Promise.all(
                containers.map(c => this.docker.getContainer(c.Id).remove({force: true}))
            );
        } catch {
            // Ignore - no containers to remove or removal failed
        }
    }

    /**
     * Wait for a container to become healthy according to Docker's health check.
     */
    private async waitForHealthy(container: Container, timeoutMs: number): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const info = await container.inspect();
            const health = info.State.Health;
            const status = health?.Status;

            if (status === 'healthy') {
                debug('Container is healthy');
                return;
            }

            if (status === 'unhealthy') {
                const logs = await container.logs({stdout: true, stderr: true, tail: 100});
                logging.error(`Container became unhealthy:\n${logs.toString()}`);
                throw new Error('Ghost container became unhealthy during initialization');
            }

            if (!info.State.Running) {
                const logs = await container.logs({stdout: true, stderr: true, tail: 100});
                logging.error(`Container stopped unexpectedly:\n${logs.toString()}`);
                throw new Error('Ghost container stopped during initialization');
            }

            // Still starting - wait and check again
            await new Promise((r) => {
                setTimeout(r, 1000);
            });
        }

        // Timeout
        const logs = await container.logs({stdout: true, stderr: true, tail: 100});
        logging.error(`Timeout waiting for container. Last logs:\n${logs.toString()}`);
        throw new Error('Timeout waiting for Ghost to become healthy');
    }
}
