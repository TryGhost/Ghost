import {test as setup} from '@playwright/test';
import {Network, GenericContainer, Wait} from 'testcontainers';
import {MySqlContainer} from '@testcontainers/mysql';
import {ContainerState} from './helpers/environment/ContainerState';
import {DockerManager} from './helpers/environment/DockerManager';
import * as path from 'path';
import debug from 'debug';

const log = debug('e2e:global-setup');

setup('global environment setup', async () => {
    log('Starting global environment setup...');

    const containerState = new ContainerState();
    const dockerManager = new DockerManager();

    // Clean up any existing state
    containerState.cleanupAll();

    try {
        // 1. Create Docker network
        log('Creating Docker network...');
        const network = await new Network().start();

        const networkState = {
            networkId: network.getId(),
            networkName: network.getName()
        };
        containerState.saveNetworkState(networkState);
        log('Network created and state saved:', networkState);

        // 2. Start MySQL container
        log('Starting MySQL container...');
        const mysql = await new MySqlContainer('mysql:8.0')
            .withNetwork(network)
            .withNetworkAliases('mysql')
            .withReuse()
            .withTmpFs({'/var/lib/mysql': 'rw,noexec,nosuid,size=1024m'})
            .withDatabase('ghost-test-initial')
            .start();

        const mysqlState = {
            containerId: mysql.getId(),
            rootPassword: mysql.getRootPassword(),
            mappedPort: mysql.getMappedPort(3306),
            database: mysql.getDatabase(),
            host: 'localhost'
        };
        containerState.saveMySQLState(mysqlState);
        log('MySQL container started and state saved:', {
            containerId: mysqlState.containerId,
            mappedPort: mysqlState.mappedPort,
            database: mysqlState.database
        });

        // 3. Run Ghost migrations in temporary container
        log('Running Ghost migrations...');
        const ghostEnv = {
            server__host: '0.0.0.0',
            database__client: 'mysql2',
            database__connection__host: 'mysql',
            database__connection__port: '3306',
            database__connection__user: 'root',
            database__connection__password: mysqlState.rootPassword,
            database__connection__database: mysqlState.database,
            NODE_ENV: 'development'
        };

        const migrationContainer = await new GenericContainer('ghost-monorepo')
            .withNetwork(network)
            .withWorkingDir('/home/ghost')
            .withCommand(['yarn', 'knex-migrator', 'init'])
            .withEnvironment(ghostEnv)
            .withWaitStrategy(Wait.forOneShotStartup())
            .start();

        log('Ghost migrations completed successfully');

        // 4. Create database dump inside MySQL container
        log('Creating database dump...');
        await dockerManager.executeInContainer(mysqlState.containerId, [
            'sh', '-c',
            `mysqldump -u root -p${mysqlState.rootPassword} --opt --single-transaction ${mysqlState.database} > /tmp/dump.sql`
        ]);
        log('Database dump created inside MySQL container');

        // 5. Stop migration container (we don't need it anymore)
        await migrationContainer.stop();

        // 6. Setup Tinybird Local for analytics
        log('Setting up Tinybird Local for analytics...');
        const tinybirdContainer = await new GenericContainer('tinybirdco/tinybird-local:latest')
            .withNetwork(network)
            .withNetworkAliases('tinybird-local')
            .withReuse()
            .withExposedPorts(7181)
            .withWaitStrategy(Wait.forHttp('/v0/health', 7181))
            .start();

        const tinybirdState = {
            containerId: tinybirdContainer.getId(),
            workspaceId: 'placeholder_workspace_id', // Will be updated after schema deployment
            adminToken: 'placeholder_admin_token',
            trackerToken: 'placeholder_tracker_token',
            mappedPort: tinybirdContainer.getMappedPort(7181),
            host: 'localhost'
        };
        containerState.saveTinybirdState(tinybirdState);

        // 7. Deploy Tinybird schema using tb-cli
        const tinybirdDataPath = path.resolve(process.cwd(), '../ghost/core/core/server/data/tinybird');
        log('Deploying Tinybird schema from:', tinybirdDataPath);

        const tbCliContainer = await new GenericContainer('ghost-tb-cli:latest')
            .withNetwork(network)
            .withBindMounts([
                {
                    source: tinybirdDataPath,
                    target: '/home/tinybird',
                    mode: 'ro'
                },
                {
                    source: '/var/run/docker.sock',
                    target: '/var/run/docker.sock',
                    mode: 'rw'
                }
            ])
            .withWorkingDir('/home/tinybird')
            .withEnvironment({
                'TB_HOST': 'http://tinybird-local:7181',
                'TB_LOCAL_HOST': 'tinybird-local'
            })
            .withLabels({'ghost-e2e': 'tb-cli-deploy'})
            .withAutoRemove(true)
            .withEntrypoint(['sh'])
            .withCommand(['-c', 'ls -la /home/tinybird && tb --local build'])
            .withWaitStrategy(Wait.forOneShotStartup())
            .start();

        log('Tinybird schema deployment completed');

        // 8. Extract Tinybird configuration using tb-cli
        log('Extracting Tinybird configuration...');
        const tbInfoContainer = await new GenericContainer('ghost-tb-cli:latest')
            .withNetwork(network)
            .withBindMounts([
                {
                    source: tinybirdDataPath,
                    target: '/home/tinybird',
                    mode: 'ro'
                },
                {
                    source: '/var/run/docker.sock',
                    target: '/var/run/docker.sock',
                    mode: 'rw'
                }
            ])
            .withWorkingDir('/home/tinybird')
            .withEnvironment({
                'TB_HOST': 'http://tinybird-local:7181',
                'TB_LOCAL_HOST': 'tinybird-local'
            })
            .withLabels({'ghost-e2e': 'tb-cli-info'})
            .withAutoRemove(true)
            .withEntrypoint(['sh'])
            .withCommand(['-c', 'tb --output json info'])
            .withWaitStrategy(Wait.forOneShotStartup())
            .start();

        // Get workspace info from container logs
        const tbInfoLogs = await tbInfoContainer.logs();
        let tbInfoString = '';

        // Handle Docker stream format
        if (tbInfoLogs && typeof tbInfoLogs.on === 'function') {
            // It's a stream
            await new Promise((resolve) => {
                tbInfoLogs.on('data', (chunk: Buffer) => {
                    tbInfoString += chunk.toString();
                });
                tbInfoLogs.on('end', resolve);
            });
        } else {
            // It's already a string or buffer
            tbInfoString = tbInfoLogs.toString();
        }

        // Clean up any extra characters and parse JSON
        const cleanJson = tbInfoString.replace(/^.*?{/, '{').replace(/}.*$/, '}');
        const tbInfo = JSON.parse(cleanJson);

        const workspaceId = tbInfo.local.workspace_id;
        const workspaceToken = tbInfo.local.token;

        // Get admin and tracker tokens via API call
        const tokensResult = await dockerManager.executeInContainer(tinybirdState.containerId, [
            'curl', '-s', '-H', `Authorization: Bearer ${workspaceToken}`,
            'http://localhost:7181/v0/tokens'
        ]);

        const tokensData = JSON.parse(tokensResult.stdout);
        const adminToken = tokensData.tokens.find((t: any) => t.name === 'admin token')?.token;
        const trackerToken = tokensData.tokens.find((t: any) => t.name === 'tracker')?.token;

        if (!adminToken || !trackerToken) {
            throw new Error('Failed to extract admin or tracker tokens');
        }

        // Update Tinybird state with real values
        const updatedTinybirdState = {
            ...tinybirdState,
            workspaceId,
            adminToken,
            trackerToken
        };
        containerState.saveTinybirdState(updatedTinybirdState);
        log('Tinybird setup completed and state saved');

        log('Global environment setup completed successfully');

    } catch (error) {
        log('Global environment setup failed:', error);
        // Clean up on failure
        try {
            containerState.cleanupAll();
        } catch (cleanupError) {
            log('Cleanup after setup failure also failed:', cleanupError);
        }
        throw error;
    }
});
