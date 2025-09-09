import Docker from 'dockerode';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';

const debug = baseDebug('e2e:DockerManager');

export interface ContainerExecResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface GhostContainerConfig {
    networkId: string;
    networkAlias: string;
    database: string;
    mysqlHost: string;
    mysqlPort: string;
    mysqlUser: string;
    mysqlPassword: string;
    exposedPort: number;
    siteUuid: string;
    workingDir?: string;
    command?: string[];
    tinybird: {
        workspaceId: string;
        adminToken: string;
        trackerToken: string;
    };
}

export class DockerManager {
    private docker: Docker;

    constructor() {
        this.docker = new Docker();
    }

    /**
     * Create and start a Ghost container
     */
    async createGhostContainer(config: GhostContainerConfig): Promise<string> {
        try {
            const environment = {
                server__host: '0.0.0.0',
                server__port: '2368',
                database__client: 'mysql2',
                database__connection__host: config.mysqlHost,
                database__connection__port: config.mysqlPort,
                database__connection__user: config.mysqlUser,
                database__connection__password: config.mysqlPassword,
                database__connection__database: config.database,
                NODE_ENV: 'development',
                // Tinybird configuration
                TB_HOST: 'http://tinybird-local:7181',
                TB_LOCAL_HOST: 'tinybird-local',
                tinybird__stats__endpoint: 'http://tinybird-local:7181',
                tinybird__stats__endpointBrowser: 'http://localhost:7181',
                tinybird__tracker__endpoint: 'http://localhost/.ghost/analytics/api/v1/page_hit',
                tinybird__workspaceId: config.tinybird.workspaceId,
                tinybird__adminToken: config.tinybird.adminToken
            };

            const containerConfig = {
                Image: process.env.GHOST_IMAGE_TAG || 'ghost-monorepo',
                Env: Object.entries(environment).map(([key, value]) => `${key}=${value}`),
                NetworkingConfig: {
                    EndpointsConfig: {
                        [config.networkId]: {
                            Aliases: [config.networkAlias]
                        }
                    }
                },
                ExposedPorts: {
                    '2368/tcp': {}
                },
                HostConfig: {
                    PortBindings: {
                        '2368/tcp': [{HostPort: config.exposedPort.toString()}]
                    }
                },
                Labels: {
                    'com.docker.compose.project': 'ghost-e2e',
                    'com.docker.compose.service': `ghost-${config.siteUuid}`,
                    'tryghost/e2e': 'ghost'
                },
                WorkingDir: config.workingDir || '/home/ghost/ghost/core',
                Cmd: config.command || ['yarn', 'dev'],
                AttachStdout: true,
                AttachStderr: true
            };

            debug('Creating Ghost container with config:', {
                networkId: config.networkId,
                alias: config.networkAlias,
                database: config.database,
                port: config.exposedPort
            });

            debug('Ghost environment variables:', JSON.stringify(environment, null, 2));

            debug('Full Docker container config:', JSON.stringify(containerConfig, null, 2));

            const container = await this.docker.createContainer(containerConfig);
            await container.start();

            // Inspect the container to see actual port mappings
            const containerInfo = await container.inspect();
            debug('Container port mappings:', containerInfo.NetworkSettings.Ports);

            // Wait for Ghost to be ready by checking HTTP health
            await this.waitForGhostReady(config.exposedPort);

            debug('Ghost container started successfully:', container.id);
            return container.id;
        } catch (error) {
            logging.error('Failed to create Ghost container:', error);
            throw new Error(`Failed to create Ghost container: ${error}`);
        }
    }

    /**
     * Wait for Ghost to be ready by checking HTTP health
     */
    private async waitForGhostReady(port: number, timeoutMs: number = 60000): Promise<void> {
        const startTime = Date.now();
        const healthUrl = `http://localhost:${port}/ghost/api/admin/site/`;

        while (Date.now() - startTime < timeoutMs) {
            try {
                // Simple HTTP check to see if Ghost API responds
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000) // 5 second timeout per request
                });

                // If we get any response (even 401/404), Ghost is ready
                if (response.status < 500) {
                    debug('Ghost is ready, responded with status:', response.status);
                    return;
                }

                debug('Ghost not ready yet, status:', response.status);
            } catch (error) {
                debug('Ghost health check failed, retrying...', error instanceof Error ? error.message : String(error));
            }

            // Wait 200ms before next check
            await new Promise<void>((resolve) => {
                setTimeout(resolve, 200);
            });
        }

        throw new Error(`Timeout waiting for Ghost to start on port ${port}`);
    }

    /**
     * Stop and remove a container
     */
    async removeContainer(containerId: string): Promise<void> {
        try {
            const container = this.docker.getContainer(containerId);

            // Stop the container (with force if needed)
            try {
                await container.stop({t: 10}); // 10 second timeout
            } catch (error) {
                debug('Container already stopped or stop failed, forcing removal:', containerId);
            }

            // Remove the container
            await container.remove({force: true});
            debug('Container removed:', containerId);
        } catch (error) {
            debug('Failed to remove container:', error);
            // Don't throw - container might already be removed
        }
    }
}
