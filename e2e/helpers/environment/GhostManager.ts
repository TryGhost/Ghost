import Docker from 'dockerode';
import type {Container, ContainerCreateOptions} from 'dockerode';
import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {DockerCompose} from './DockerCompose';
import {TinybirdManager} from './TinybirdManager';
import type {GhostInstance} from './EnvironmentManager';
import {DOCKER_COMPOSE_CONFIG, GHOST_DEFAULTS, MAILPIT, MYSQL, PORTAL, TINYBIRD} from './constants';

const debug = baseDebug('e2e:GhostManager');

export interface GhostStartConfig {
    instanceId: string;
    siteUuid: string;
    workingDir?: string;
    command?: string[];
    portalUrl?: string;
}

export class GhostManager {
    private docker: Docker;
    private dockerCompose: DockerCompose;
    private tinybird: TinybirdManager;

    constructor(docker: Docker, dockerCompose: DockerCompose, tinybird: TinybirdManager) {
        this.docker = docker;
        this.dockerCompose = dockerCompose;
        this.tinybird = tinybird;
    }

    private async createAndStart(config: GhostStartConfig): Promise<Container> {
        try {
            const network = await this.dockerCompose.getNetwork();
            const tinyBirdConfig = this.tinybird.loadConfig();

            // Use deterministic port based on worker index (or 0 if not in parallel)
            const hostPort = 30000 + parseInt(process.env.TEST_PARALLEL_INDEX || '0', 10);

            const environment = {
                server__host: '0.0.0.0',
                server__port: String(GHOST_DEFAULTS.PORT),
                url: `http://localhost:${hostPort}`,
                NODE_ENV: 'development',
                // Db configuration
                database__client: 'mysql2',
                database__connection__host: MYSQL.HOST,
                database__connection__port: String(MYSQL.PORT),
                database__connection__user: MYSQL.USER,
                database__connection__password: MYSQL.PASSWORD,
                database__connection__database: config.instanceId,
                // Tinybird configuration
                TB_HOST: `http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                TB_LOCAL_HOST: TINYBIRD.LOCAL_HOST,
                tinybird__stats__endpoint: `http://${TINYBIRD.LOCAL_HOST}:${TINYBIRD.PORT}`,
                tinybird__stats__endpointBrowser: 'http://localhost:7181',
                tinybird__tracker__endpoint: 'http://localhost:8080/.ghost/analytics/api/v1/page_hit',
                tinybird__tracker__datasource: 'analytics_events',
                tinybird__workspaceId: tinyBirdConfig.workspaceId,
                tinybird__adminToken: tinyBirdConfig.adminToken,
                // Email configuration
                mail__transport: 'SMTP',
                mail__options__host: 'mailpit',
                mail__options__port: `${MAILPIT.PORT}`,
                mail__options__secure: 'false',
                // other services configuration
                portal__url: config.portalUrl || `http://localhost:${PORTAL.PORT}/portal.min.js`
            } as Record<string, string>;

            const containerConfig: ContainerCreateOptions = {
                Image: GHOST_DEFAULTS.IMAGE,
                Env: Object.entries(environment).map(([key, value]) => `${key}=${value}`),
                NetworkingConfig: {
                    EndpointsConfig: {
                        [network.id]: {
                            Aliases: [config.instanceId]
                        }
                    }
                },
                ExposedPorts: {
                    [`${GHOST_DEFAULTS.PORT}/tcp`]: {}
                },
                HostConfig: {
                    PortBindings: {
                        [`${GHOST_DEFAULTS.PORT}/tcp`]: [{HostPort: String(hostPort)}]
                    }
                },
                Labels: {
                    'com.docker.compose.project': DOCKER_COMPOSE_CONFIG.PROJECT,
                    'com.docker.compose.service': `ghost-${config.siteUuid}`,
                    'tryghost/e2e': 'ghost'
                },
                WorkingDir: config.workingDir || GHOST_DEFAULTS.WORKDIR,
                Cmd: config.command || ['yarn', 'dev'],
                AttachStdout: true,
                AttachStderr: true
            };

            debug('Ghost environment variables:', JSON.stringify(environment, null, 2));
            debug('Full Docker container config:', JSON.stringify(containerConfig, null, 2));
            debug('Starting Ghost container...');

            const container = await this.docker.createContainer(containerConfig);
            await container.start();

            debug('Ghost container started:', container.id);
            return container;
        } catch (error) {
            logging.error('Failed to create Ghost container:', error);
            throw new Error(`Failed to create Ghost container: ${error}`);
        }
    }

    async createAndStartInstance(instanceId: string, siteUuid: string, portalUrl?: string): Promise<GhostInstance> {
        const container = await this.createAndStart({instanceId, siteUuid, portalUrl});
        const containerInfo = await container.inspect();
        const hostPort = parseInt(containerInfo.NetworkSettings.Ports[`${GHOST_DEFAULTS.PORT}/tcp`][0].HostPort, 10);
        await this.waitReady(hostPort, 30000);

        return {
            containerId: container.id,
            instanceId,
            database: instanceId,
            port: hostPort,
            baseUrl: `http://localhost:${hostPort}`,
            siteUuid
        };
    }

    async removeAll(): Promise<void> {
        try {
            debug('Finding all Ghost containers...');
            const containers = await this.docker.listContainers({
                all: true,
                filters: {
                    label: ['tryghost/e2e=ghost']
                }
            });

            if (containers.length === 0) {
                debug('No Ghost containers found');
                return;
            }

            debug(`Found ${containers.length} Ghost container(s) to remove`);
            for (const containerInfo of containers) {
                await this.stopAndRemoveInstance(containerInfo.Id);
            }
            debug('All Ghost containers removed');
        } catch (error) {
            // Don't throw - we want to continue with setup even if cleanup fails
            logging.error('Failed to remove all Ghost containers:', error);
        }
    }

    async stopAndRemoveInstance(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId);
            try {
                await container.stop({t: 10});
            } catch (error) {
                debug('Container already stopped or stop failed, forcing removal:', containerId);
            }
            await container.remove({force: true});
            debug('Container removed:', containerId);
        } catch (error) {
            debug('Failed to remove container:', error);
        }
    }

    private async waitReady(port: number, timeoutMs: number = 60000): Promise<void> {
        const startTime = Date.now();
        const healthUrl = `http://localhost:${port}/ghost/api/admin/site/`;

        while (Date.now() - startTime < timeoutMs) {
            try {
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });
                if (response.status < 500) {
                    debug('Ghost is ready, responded with status:', response.status);
                    return;
                }
                debug('Ghost not ready yet, status:', response.status);
            } catch (error) {
                debug('Ghost health check failed, retrying...', error instanceof Error ? error.message : String(error));
            }
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 200);
            });
        }

        throw new Error(`Timeout waiting for Ghost to start on port ${port}`);
    }
}
