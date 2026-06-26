import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {
    BASE_GHOST_ENV,
    BUILD_GATEWAY_IMAGE,
    BUILD_IMAGE,
    CADDYFILE_PATHS,
    DEV_ENVIRONMENT,
    DEV_SHARED_CONFIG_VOLUME,
    EGRESS_MONITOR_ENABLED,
    REPO_ROOT,
    TEST_ENVIRONMENT,
    TINYBIRD
} from '@/helpers/environment/constants';
import {EgressMonitor} from '@/helpers/environment/service-managers/egress-monitor';
import {isTinybirdAvailable} from '@/helpers/environment/service-availability';
import {readFile} from 'fs/promises';
import type {Container, ContainerCreateOptions} from 'dockerode';
import type {EnvironmentMode} from '@/helpers/environment/environment-manager';
import type {GhostConfig} from '@/helpers/playwright/fixture';

const debug = baseDebug('e2e:GhostManager');

type GhostEnvOverrides = GhostConfig | Record<string, string>;
const READINESS_POLL_INTERVAL_MS = 250;

interface TinybirdConfigFile {
    workspaceId?: string;
    adminToken?: string;
    trackerToken?: string;
}
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
 * Manages Ghost and Gateway containers for E2E tests across dev/build modes.
 * Creates worker-scoped containers that persist across tests.
 */
export class GhostManager {
    private static verifiedBuildImageKey: string | null = null;
    private readonly docker: Docker;
    private readonly config: GhostManagerConfig;
    private ghostContainer: Container | null = null;
    private gatewayContainer: Container | null = null;
    private egressMonitor: EgressMonitor | null = null;

    constructor(config: GhostManagerConfig) {
        this.docker = new Docker();
        this.config = config;
    }

    get ghostContainerId(): string | null {
        return this.ghostContainer?.id ?? null;
    }

    /** Egress monitor for this worker, or null when disabled / failed to start. */
    getEgressMonitor(): EgressMonitor | null {
        return this.egressMonitor?.isActive ? this.egressMonitor : null;
    }

    private ghostImage(): string {
        return this.config.mode === 'build' ? BUILD_IMAGE : TEST_ENVIRONMENT.ghost.image;
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

        // Start the egress monitor first so Ghost can use it as its DNS server.
        // Fail-open: if it doesn't come up, Ghost keeps Docker's default resolver.
        await this.startEgressMonitor();

        // Try to reuse existing containers (handles process restarts after test failures)
        this.gatewayContainer = await this.getOrCreateContainer(gatewayName, () => this.createGatewayContainer(gatewayName, ghostName));
        this.ghostContainer = await this.getOrCreateContainer(ghostName, () => this.createGhostContainer(ghostName, database));

        debug(`Worker ${this.config.workerIndex} containers ready`);
    }

    /**
     * Verify the build image exists locally.
     * Fails early with a helpful error message if the image is not available.
     */
    async verifyBuildImageExists(): Promise<void> {
        const buildImageKey = `${BUILD_IMAGE}\n${BUILD_GATEWAY_IMAGE}`;
        if (GhostManager.verifiedBuildImageKey === buildImageKey) {
            debug(`Build images already verified: ${BUILD_IMAGE}, ${BUILD_GATEWAY_IMAGE}`);
            return;
        }

        try {
            const image = this.docker.getImage(BUILD_IMAGE);
            await image.inspect();
            debug(`Build image verified: ${BUILD_IMAGE}`);
        } catch {
            throw new Error(
                `Build image not found: ${BUILD_IMAGE}\n\n` +
                `You are running in "build" mode, which requires a pre-built Docker image.\n` +
                `For local development, "dev" mode is recommended instead.\n\n` +
                `To fix this, either:\n` +
                `  1. (Recommended) Run "pnpm dev" first, then re-run tests — dev mode is auto-detected and doesn't need this image\n` +
                `  2. Build locally: pnpm --filter @tryghost/e2e build:docker (with GHOST_E2E_BASE_IMAGE set)\n` +
                `  3. Pull from registry: docker pull ${BUILD_IMAGE}\n` +
                `  4. Use a different image: GHOST_E2E_MODE=build GHOST_E2E_IMAGE=<image> pnpm --filter @tryghost/e2e test`
            );
        }

        try {
            const gatewayImage = this.docker.getImage(BUILD_GATEWAY_IMAGE);
            await gatewayImage.inspect();
            debug(`Build gateway image verified: ${BUILD_GATEWAY_IMAGE}`);
        } catch {
            throw new Error(
                `Build gateway image not found: ${BUILD_GATEWAY_IMAGE}\n\n` +
                `To fix this, either:\n` +
                `  1. Pull gateway image: docker pull ${BUILD_GATEWAY_IMAGE}\n` +
                `  2. Use a different gateway image: GHOST_E2E_MODE=build GHOST_E2E_GATEWAY_IMAGE=<image> pnpm --filter @tryghost/e2e test`
            );
        }

        GhostManager.verifiedBuildImageKey = buildImageKey;
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
        } catch (error) {
            const statusCode = (error as {statusCode?: number})?.statusCode;
            const message = error instanceof Error ? error.message : String(error);
            const isNotFound = statusCode === 404 || /No such container/i.test(message);

            if (!isNotFound) {
                debug(`Unexpected error inspecting container ${name}:`, error);
                throw error;
            }

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
        if (this.egressMonitor) {
            await this.egressMonitor.stop();
            this.egressMonitor = null;
        }

        debug(`Worker ${this.config.workerIndex} containers removed`);
    }

    /**
     * Bring up the egress-monitoring DNS sidecar for this worker (idempotent).
     * Never throws — monitoring is best-effort and must not break the suite.
     */
    private async startEgressMonitor(): Promise<void> {
        if (!EGRESS_MONITOR_ENABLED || this.egressMonitor) {
            return;
        }
        const monitor = new EgressMonitor(this.docker, {
            workerIndex: this.config.workerIndex
        });
        await monitor.start();
        this.egressMonitor = monitor;
    }

    async restartWithDatabase(databaseName: string, extraConfig?: GhostEnvOverrides): Promise<void> {
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
     * Wait for Ghost to become reachable through the same gateway path used by tests.
     */
    async waitForReady(timeoutMs: number = 120000): Promise<void> {
        if (!this.ghostContainer) {
            throw new Error('Ghost container not initialized');
        }
        await this.waitForHostReadiness(this.ghostContainer, timeoutMs);
    }

    private async buildEnvWithSchedulerUrl(
        database: string = 'ghost_testing',
        extraConfig?: GhostEnvOverrides
    ): Promise<string[]> {
        const env = [
            ...BASE_GHOST_ENV,
            `database__connection__database=${database}`,
            `url=http://localhost:${this.getGatewayPort()}`
        ];

        if (this.config.mode === 'dev') {
            env.push('pnpm_config_verify_deps_before_run=false');
        }

        // Add Tinybird config if available
        // Static endpoints are set here; tokens are loaded from a host-generated
        // e2e/data/state/tinybird.json file when present.
        if (await isTinybirdAvailable()) {
            env.push(
                `TB_HOST=http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                `TB_LOCAL_HOST=${TINYBIRD.LOCAL_HOST}`,
                `tinybird__stats__endpoint=http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                `tinybird__stats__endpointBrowser=http://localhost:${TINYBIRD.PORT}`,
                `tinybird__tracker__endpoint=http://localhost:${this.getGatewayPort()}/.ghost/analytics/api/v1/page_hit`,
                'tinybird__tracker__datasource=analytics_events'
            );

            const tinybirdConfig = await this.loadTinybirdConfig();
            if (tinybirdConfig?.workspaceId) {
                env.push(`tinybird__workspaceId=${tinybirdConfig.workspaceId}`);
            }
            if (tinybirdConfig?.adminToken) {
                env.push(`tinybird__adminToken=${tinybirdConfig.adminToken}`);
            }
            if (tinybirdConfig?.trackerToken) {
                env.push(`TINYBIRD_TRACKER_TOKEN=${tinybirdConfig.trackerToken}`);
            }
        }

        if (extraConfig) {
            for (const [key, value] of Object.entries(extraConfig)) {
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                    env.push(`${key}=${String(value)}`);
                } else {
                    debug(`buildEnv: skipping non-scalar extraConfig key '${key}' (type: ${typeof value})`);
                }
            }
        }

        return env;
    }

    private async loadTinybirdConfig(): Promise<TinybirdConfigFile | null> {
        try {
            const raw = await readFile(TINYBIRD.JSON_PATH, 'utf8');
            const parsed = JSON.parse(raw) as TinybirdConfigFile;

            if (!parsed.workspaceId || !parsed.adminToken) {
                debug(`Tinybird config file is missing required fields: ${TINYBIRD.JSON_PATH}`);
                return null;
            }

            return parsed;
        } catch (error) {
            debug(`Tinybird config not available at ${TINYBIRD.JSON_PATH}:`, error);
            return null;
        }
    }

    private async createGhostContainer(
        name: string,
        database: string = 'ghost_testing',
        extraConfig?: GhostEnvOverrides
    ): Promise<Container> {
        const mode = this.config.mode;
        debug(`Creating Ghost container for mode: ${mode}`);

        // Determine image based on mode
        // - build: Build image (local or registry, controlled by GHOST_E2E_IMAGE)
        // - dev: Dev image from compose.dev.yaml
        const image = this.ghostImage();

        // Build volume mounts based on mode
        const binds = this.getGhostBinds();

        // Route Ghost's resolver through the egress monitor when it's running.
        // It becomes the upstream of Docker's embedded DNS, so internal service
        // names still resolve while external lookups are recorded.
        const dnsServerIp = this.egressMonitor?.dnsServerIp ?? null;

        const config: ContainerCreateOptions = {
            name,
            Image: image,
            Env: await this.buildEnvWithSchedulerUrl(database, extraConfig),
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
                ExtraHosts: ['host.docker.internal:host-gateway'],
                ...(dnsServerIp ? {Dns: [dnsServerIp]} : {})
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
     * - dev: Mount backend workspace packages for source code (hot reload)
     * - build: No source mounts, fully self-contained image
     */
    private getGhostBinds(): string[] {
        const binds: string[] = [
            // Shared config volume for Tinybird credentials (all modes)
            `${DEV_SHARED_CONFIG_VOLUME}:/mnt/shared-config:ro`
        ];

        if (this.config.mode === 'dev') {
            binds.push(
                `${REPO_ROOT}/ghost/core:/home/ghost/ghost/core`,
                `${REPO_ROOT}/ghost/i18n:/home/ghost/ghost/i18n`,
                `${REPO_ROOT}/ghost/parse-email-address:/home/ghost/ghost/parse-email-address`
            );
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

        // Build mode can use stock Caddy (no custom plugin/image build required)
        const image = mode === 'build' ? BUILD_GATEWAY_IMAGE : TEST_ENVIRONMENT.gateway.image;

        const config: ContainerCreateOptions = {
            name,
            Image: image,
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

            const results = await Promise.allSettled(
                containers.map(c => this.docker.getContainer(c.Id).remove({force: true}))
            );

            for (const [index, result] of results.entries()) {
                if (result.status === 'rejected') {
                    debug('cleanupAllContainers: failed to remove container', containers[index]?.Id, result.reason);
                }
            }
        } catch (error) {
            debug('cleanupAllContainers: failed to list/remove containers', error);
        }
    }

    private async waitForHostReadiness(container: Container, timeoutMs: number): Promise<void> {
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            const info = await container.inspect();
            const health = info.State.Health;
            const status = health?.Status;

            if (info.State.Running && await this.probeHostReadiness()) {
                debug('Host readiness probe passed');
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
                setTimeout(r, READINESS_POLL_INTERVAL_MS);
            });
        }

        // Timeout
        const logs = await container.logs({stdout: true, stderr: true, tail: 100});
        logging.error(`Timeout waiting for container. Last logs:\n${logs.toString()}`);
        throw new Error('Timeout waiting for Ghost to become ready');
    }

    private async probeHostReadiness(): Promise<boolean> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 500);

        try {
            const response = await fetch(`http://localhost:${this.getGatewayPort()}/ghost/api/admin/authentication/setup`, {
                method: 'GET',
                headers: {Accept: 'application/json'},
                signal: controller.signal
            });
            const body = await response.json().catch(() => null) as {setup?: Array<{status?: unknown}>} | null;

            return response.ok && Array.isArray(body?.setup) && typeof body.setup[0]?.status === 'boolean';
        } catch (error) {
            debug('Host readiness probe failed:', error);
            return false;
        } finally {
            clearTimeout(timeout);
        }
    }
}
