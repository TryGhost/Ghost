import Docker from 'dockerode';
import type {MySQLState} from './ContainerState';
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
    tinybirdConfig: {
        workspaceId: string;
        adminToken: string;
        trackerToken: string;
    };
    workingDir?: string;
    command?: string[];
}

export class DockerManager {
    private docker: Docker;

    constructor() {
        this.docker = new Docker();
    }

    /**
     * Execute a command inside a container
     */
    async executeInContainer(containerId: string, command: string[]): Promise<ContainerExecResult> {
        try {
            const container = this.docker.getContainer(containerId);

            const exec = await container.exec({
                Cmd: command,
                AttachStdout: true,
                AttachStderr: true,
                AttachStdin: false
            });

            const stream = await exec.start({hijack: true, stdin: false});

            return new Promise((resolve, reject) => {
                let stdout = '';
                let stderr = '';

                // Docker multiplexes stdout/stderr in a single stream
                // First byte indicates stream type: 1=stdout, 2=stderr
                stream.on('data', (chunk: Buffer) => {
                    const header = chunk.readUInt8(0);
                    const data = chunk.subarray(8).toString(); // Skip 8-byte header

                    if (header === 1) {
                        stdout += data;
                    } else if (header === 2) {
                        stderr += data;
                    }
                });

                stream.on('end', async () => {
                    try {
                        const inspectResult = await exec.inspect();
                        resolve({
                            exitCode: inspectResult.ExitCode || 0,
                            stdout: stdout.trim(),
                            stderr: stderr.trim()
                        });
                    } catch (error) {
                        reject(error);
                    }
                });

                stream.on('error', reject);
            });
        } catch (error) {
            logging.error('Failed to execute command in container:', error);
            throw new Error(`Failed to execute command in container: ${error}`);
        }
    }

    /**
     * Execute MySQL command in MySQL container
     */
    async executeMySQLCommand(mysqlState: MySQLState, command: string): Promise<ContainerExecResult> {
        const cmd = [
            'mysql',
            '-u', 'root',
            `-p${mysqlState.rootPassword}`,
            '-e', command
        ];

        debug('Executing MySQL command:', command);
        return await this.executeInContainer(mysqlState.containerId, cmd);
    }

    /**
     * Create a database dump using mysqldump
     */
    async createMySQLDump(mysqlState: MySQLState, database: string): Promise<string> {
        const cmd = [
            'mysqldump',
            '-u', 'root',
            `-p${mysqlState.rootPassword}`,
            '--opt',
            '--single-transaction',
            '--routines',
            '--triggers',
            database
        ];

        debug('Creating MySQL dump for database:', database);
        const result = await this.executeInContainer(mysqlState.containerId, cmd);

        if (result.exitCode !== 0) {
            throw new Error(`mysqldump failed: ${result.stderr}`);
        }

        return result.stdout;
    }

    /**
     * Restore database from the existing dump file inside the MySQL container
     */
    async restoreDatabaseFromDump(mysqlState: MySQLState, database: string): Promise<void> {
        // Create the database first
        await this.executeMySQLCommand(mysqlState, `CREATE DATABASE IF NOT EXISTS ${database}`);

        // Restore from the existing dump file (created during global setup)
        const result = await this.executeInContainer(mysqlState.containerId, [
            'sh', '-c', `mysql -u root -p${mysqlState.rootPassword} ${database} < /tmp/dump.sql`
        ]);

        if (result.exitCode !== 0) {
            throw new Error(`MySQL restore failed: ${result.stderr}`);
        }

        debug('Database restored successfully:', database);
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
                tinybird__workspaceId: config.tinybirdConfig.workspaceId,
                tinybird__adminToken: config.tinybirdConfig.adminToken,
                tinybird__trackerToken: config.tinybirdConfig.trackerToken
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

    /**
     * Get all containers connected to a network
     */
    async getNetworkContainers(networkId: string): Promise<string[]> {
        try {
            const network = this.docker.getNetwork(networkId);
            const networkInfo = await network.inspect();

            const containerIds = Object.keys(networkInfo.Containers || {});
            debug('Found containers on network:', containerIds);
            return containerIds;
        } catch (error) {
            debug('Failed to get network containers:', error);
            return [];
        }
    }

    /**
     * Remove a network
     */
    async removeNetwork(networkId: string): Promise<void> {
        try {
            const network = this.docker.getNetwork(networkId);
            await network.remove();
            debug('Network removed:', networkId);
        } catch (error) {
            logging.error('Failed to remove network:', error);
            // Don't throw - network might already be removed
        }
    }

    /**
     * Clean up all containers on a network and remove the network
     */
    async cleanupNetwork(networkId: string): Promise<void> {
        try {
            // Get all containers on the network
            const containerIds = await this.getNetworkContainers(networkId);

            // Remove all containers
            await Promise.all(
                containerIds.map(containerId => this.removeContainer(containerId))
            );

            // Remove the network
            await this.removeNetwork(networkId);

            debug('Network cleanup completed:', networkId);
        } catch (error) {
            logging.error('Network cleanup failed:', error);
            throw new Error(`Network cleanup failed: ${error}`);
        }
    }

    /**
     * Create and start a Tinybird Local container
     */
    async createTinybirdContainer(networkId: string): Promise<string> {
        try {
            const containerConfig = {
                Image: 'tinybirdco/tinybird-local:latest',
                NetworkingConfig: {
                    EndpointsConfig: {
                        [networkId]: {
                            Aliases: ['tinybird-local']
                        }
                    }
                },
                ExposedPorts: {
                    '7181/tcp': {}
                },
                HostConfig: {
                    PortBindings: {
                        '7181/tcp': [{HostPort: '7181'}]
                    }
                },
                Healthcheck: {
                    Test: ['CMD', 'curl', '-f', 'http://localhost:7181/v0/health'],
                    Interval: 1000000000, // 1 second in nanoseconds
                    Timeout: 5000000000, // 5 seconds in nanoseconds
                    Retries: 120
                }
            };

            debug('Creating Tinybird Local container...');
            const container = await this.docker.createContainer(containerConfig);
            await container.start();

            // Wait for health check to pass
            await this.waitForTinybirdReady(7181);

            debug('Tinybird Local container started successfully:', container.id);
            return container.id;
        } catch (error) {
            logging.error('Failed to create Tinybird container:', error);
            throw new Error(`Failed to create Tinybird container: ${error}`);
        }
    }

    /**
     * Deploy Tinybird schema using tb-cli container
     */
    async deployTinybirdSchema(networkId: string, tinybirdPath: string): Promise<void> {
        try {
            const containerConfig = {
                Image: 'ghost-tb-cli', // Assumes we've built this image
                NetworkingConfig: {
                    EndpointsConfig: {
                        [networkId]: {}
                    }
                },
                Env: [
                    'TB_HOST=http://tinybird-local:7181',
                    'TB_LOCAL_HOST=tinybird-local'
                ],
                HostConfig: {
                    Binds: [
                        `${tinybirdPath}:/home/tinybird:ro`
                    ]
                },
                WorkingDir: '/home/tinybird',
                Cmd: ['tb', '--local', 'build']
            };

            debug('Deploying Tinybird schema...');
            const container = await this.docker.createContainer(containerConfig);
            await container.start();

            // Wait for container to complete
            await container.wait();

            // Get logs to check for errors
            await container.logs({
                stdout: true,
                stderr: true
            });

            debug('Tinybird schema deployment completed');
            await container.remove();
        } catch (error) {
            logging.error('Failed to deploy Tinybird schema:', error);
            throw new Error(`Failed to deploy Tinybird schema: ${error}`);
        }
    }

    /**
     * Extract Tinybird tokens using tb-cli
     */
    async extractTinybirdTokens(networkId: string, tinybirdPath: string): Promise<{workspaceId: string, adminToken: string, trackerToken: string}> {
        try {
            const containerConfig = {
                Image: 'ghost-tb-cli',
                NetworkingConfig: {
                    EndpointsConfig: {
                        [networkId]: {}
                    }
                },
                Env: [
                    'TB_HOST=http://tinybird-local:7181',
                    'TB_LOCAL_HOST=tinybird-local'
                ],
                HostConfig: {
                    Binds: [
                        `${tinybirdPath}:/home/tinybird:ro`
                    ]
                },
                WorkingDir: '/home/tinybird',
                Cmd: ['tb', '--output', 'json', 'info']
            };

            debug('Extracting Tinybird configuration...');
            const container = await this.docker.createContainer(containerConfig);
            await container.start();
            await container.wait();

            // Get the tb info output
            const logs = await container.logs({
                stdout: true,
                stderr: false
            });

            const tbInfoJson = logs.toString();
            const tbInfo = JSON.parse(tbInfoJson);

            const workspaceId = tbInfo.local.workspace_id;
            const workspaceToken = tbInfo.local.token;

            await container.remove();

            // Now get admin and tracker tokens via API
            const tokensResult = await this.executeInContainer('tinybird-local', [
                'curl', '-s', '-H', `Authorization: Bearer ${workspaceToken}`,
                'http://localhost:7181/v0/tokens'
            ]);

            const tokensData = JSON.parse(tokensResult.stdout);
            const adminToken = tokensData.tokens.find((t: {name: string; token: string}) => t.name === 'admin token')?.token;
            const trackerToken = tokensData.tokens.find((t: {name: string; token: string}) => t.name === 'tracker')?.token;

            if (!adminToken || !trackerToken) {
                throw new Error('Failed to extract admin or tracker tokens');
            }

            debug('Tinybird tokens extracted successfully');
            return {workspaceId, adminToken, trackerToken};
        } catch (error) {
            logging.error('Failed to extract Tinybird tokens:', error);
            throw new Error(`Failed to extract Tinybird tokens: ${error}`);
        }
    }

    /**
     * Wait for Tinybird to be ready by checking health endpoint
     */
    private async waitForTinybirdReady(port: number, timeoutMs: number = 60000): Promise<void> {
        const startTime = Date.now();
        const healthUrl = `http://localhost:${port}/v0/health`;

        while (Date.now() - startTime < timeoutMs) {
            try {
                const response = await fetch(healthUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                });

                if (response.ok) {
                    debug('Tinybird is ready, responded with status:', response.status);
                    return;
                }

                debug('Tinybird not ready yet, status:', response.status);
            } catch (error) {
                debug('Tinybird health check failed, retrying...', error instanceof Error ? error.message : String(error));
            }

            await new Promise<void>((resolve) => {
                setTimeout(resolve, 200);
            });
        }

        throw new Error(`Timeout waiting for Tinybird to start on port ${port}`);
    }
}
