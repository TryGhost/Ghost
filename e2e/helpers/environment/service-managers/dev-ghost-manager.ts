import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import path from 'path';
import {DEV_ENVIRONMENT, TINYBIRD} from '@/helpers/environment/constants';
import {fileURLToPath} from 'url';
import {isTinybirdAvailable} from '@/helpers/environment/service-availability';
import type {Container, ContainerCreateOptions} from 'dockerode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const debug = baseDebug('e2e:DevGhostManager');

export interface DevGhostConfig {
    networkName: string;
    projectNamespace: string;
    workerIndex: number;
    mysql: {host: string; port: number; user: string; password: string};
    redis: {host: string; port: number};
    images: {ghost: string; gateway: string};
}

// Base environment matching compose.dev.yaml - only set what Ghost needs
const BASE_GHOST_ENV = [
    'NODE_ENV=development',
    'server__host=0.0.0.0',
    `server__port=${DEV_ENVIRONMENT.ghost.port}`,
    // Public assets via gateway (same as compose.dev.yaml)
    'portal__url=/ghost/assets/portal/portal.min.js',
    'comments__url=/ghost/assets/comments-ui/comments-ui.min.js',
    'sodoSearch__url=/ghost/assets/sodo-search/sodo-search.min.js',
    'sodoSearch__styles=/ghost/assets/sodo-search/main.css',
    'signupForm__url=/ghost/assets/signup-form/signup-form.min.js',
    'announcementBar__url=/ghost/assets/announcement-bar/announcement-bar.min.js'
];

/**
 * Manages Ghost and Gateway containers for dev environment mode.
 * Creates worker-scoped containers that persist across tests.
 */
export class DevGhostManager {
    private readonly docker: Docker;
    private readonly config: DevGhostConfig;
    private ghostContainer: Container | null = null;
    private gatewayContainer: Container | null = null;

    constructor(config: DevGhostConfig) {
        this.docker = new Docker();
        this.config = config;
    }

    get ghostContainerId(): string | null {
        return this.ghostContainer?.id ?? null;
    }

    get gatewayContainerId(): string | null {
        return this.gatewayContainer?.id ?? null;
    }

    getGatewayPort(): number {
        return 30000 + this.config.workerIndex;
    }

    async setup(): Promise<void> {
        debug(`Setting up containers for worker ${this.config.workerIndex}...`);

        const ghostName = `ghost-e2e-worker-${this.config.workerIndex}`;
        const gatewayName = `ghost-e2e-gateway-${this.config.workerIndex}`;

        // Try to reuse existing containers (handles process restarts after test failures)
        this.ghostContainer = await this.getOrCreateContainer(ghostName, () => this.createGhostContainer(ghostName));
        this.gatewayContainer = await this.getOrCreateContainer(gatewayName, () => this.createGatewayContainer(gatewayName, ghostName));

        debug(`Worker ${this.config.workerIndex} containers ready`);
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

    async waitForReady(timeoutMs: number = 60000): Promise<void> {
        const port = this.getGatewayPort();
        const healthUrl = `http://localhost:${port}/ghost/api/admin/site/`;
        const startTime = Date.now();

        while (Date.now() - startTime < timeoutMs) {
            try {
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                if (response.status < 500) {
                    debug('Ghost is ready');
                    return;
                }
            } catch {
                // Keep trying
            }
            await new Promise((r) => {
                setTimeout(r, 500);
            });
        }

        throw new Error(`Timeout waiting for Ghost on port ${port}`);
    }

    private async buildEnv(database: string = 'ghost_testing', extraConfig?: Record<string, string>): Promise<string[]> {
        const {mysql, redis} = this.config;
        
        const env = [
            ...BASE_GHOST_ENV,
            // Database connection
            'database__client=mysql2',
            `database__connection__host=${mysql.host}`,
            `database__connection__port=${mysql.port}`,
            `database__connection__user=${mysql.user}`,
            `database__connection__password=${mysql.password}`,
            `database__connection__database=${database}`,
            // URL for this worker
            `url=http://localhost:${this.getGatewayPort()}`,
            // Redis
            `adapters__cache__Redis__host=${redis.host}`,
            `adapters__cache__Redis__port=${redis.port}`,
            // Mail
            'mail__transport=SMTP',
            'mail__options__host=ghost-dev-mailpit',
            'mail__options__port=1025'
        ];

        // Add Tinybird config if available
        // Static endpoints are set here; workspaceId and adminToken are sourced from
        // /mnt/shared-config/.env.tinybird by development.entrypoint.sh
        if (await isTinybirdAvailable()) {
            env.push(
                `TB_HOST=http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                `TB_LOCAL_HOST=${TINYBIRD.LOCAL_HOST}`,
                `tinybird__stats__endpoint=http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                'tinybird__stats__endpointBrowser=http://localhost:7181',
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
        const repoRoot = path.resolve(__dirname, '../../../..');

        // Mount only the ghost subdirectory, matching compose.dev.yaml
        // The image has node_modules and package.json at /home/ghost/ (installed at build time)
        // We mount source code at /home/ghost/ghost/ for hot-reload
        // Also mount shared-config volume to access Tinybird tokens (created by tb-cli)
        const config: ContainerCreateOptions = {
            name,
            Image: this.config.images.ghost,
            Env: await this.buildEnv(database, extraConfig),
            ExposedPorts: {[`${DEV_ENVIRONMENT.ghost.port}/tcp`]: {}},
            HostConfig: {
                Binds: [
                    `${repoRoot}/ghost:/home/ghost/ghost`,
                    // Mount shared-config volume from the ghost-dev project (not ghost-dev-e2e)
                    // This gives e2e tests access to Tinybird credentials created by yarn dev:forward
                    'ghost-dev_shared-config:/mnt/shared-config:ro'
                ],
                ExtraHosts: ['host.docker.internal:host-gateway']
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [this.config.networkName]: {Aliases: [name]}
                }
            },
            Labels: {
                'com.docker.compose.project': this.config.projectNamespace,
                'tryghost/e2e': 'ghost-dev'
            }
        };

        return this.docker.createContainer(config);
    }

    private async createGatewayContainer(name: string, ghostBackend: string): Promise<Container> {
        // Gateway just needs to know where Ghost is - everything else uses defaults from the image
        const config: ContainerCreateOptions = {
            name,
            Image: this.config.images.gateway,
            Env: [`GHOST_BACKEND=${ghostBackend}:${DEV_ENVIRONMENT.ghost.port}`],
            ExposedPorts: {'80/tcp': {}},
            HostConfig: {
                PortBindings: {'80/tcp': [{HostPort: String(this.getGatewayPort())}]},
                ExtraHosts: ['host.docker.internal:host-gateway']
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [this.config.networkName]: {Aliases: [name]}
                }
            },
            Labels: {
                'com.docker.compose.project': this.config.projectNamespace,
                'tryghost/e2e': 'gateway-dev'
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
                    label: [`com.docker.compose.project=${this.config.projectNamespace}`]
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
     * Run knex-migrator init on a database.
     * Creates a temporary container to run migrations, matching how compose.yml does it.
     */
    async runMigrations(database: string): Promise<void> {
        debug('Running migrations for database:', database);

        const repoRoot = path.resolve(__dirname, '../../../..');
        const {mysql} = this.config;

        const containerName = `ghost-e2e-migrations-${Date.now()}`;
        const container = await this.docker.createContainer({
            name: containerName,
            Image: this.config.images.ghost,
            Cmd: ['yarn', 'knex-migrator', 'init'],
            WorkingDir: '/home/ghost',
            Env: [
                'database__client=mysql2',
                `database__connection__host=${mysql.host}`,
                `database__connection__port=${mysql.port}`,
                `database__connection__user=${mysql.user}`,
                `database__connection__password=${mysql.password}`,
                `database__connection__database=${database}`
            ],
            HostConfig: {
                Binds: [`${repoRoot}/ghost:/home/ghost/ghost`],
                AutoRemove: false
            },
            NetworkingConfig: {
                EndpointsConfig: {
                    [this.config.networkName]: {}
                }
            },
            Labels: {
                'com.docker.compose.project': this.config.projectNamespace,
                'tryghost/e2e': 'migrations'
            }
        });

        await container.start();

        // Wait for container to finish
        const result = await container.wait();
        
        if (result.StatusCode !== 0) {
            try {
                const logs = await container.logs({stdout: true, stderr: true});
                debug('Migration logs:', logs.toString());
            } catch {
                debug('Could not retrieve migration logs');
            }
            await this.removeContainer(container);
            throw new Error(`Migrations failed with exit code ${result.StatusCode}`);
        }

        await this.removeContainer(container);
        debug('Migrations completed successfully');
    }
}
