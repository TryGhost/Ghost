import {test as setup} from '@playwright/test';
import {Network, GenericContainer, Wait} from 'testcontainers';
import {MySqlContainer} from '@testcontainers/mysql';
import {ContainerState} from './helpers/environment/ContainerState';
import {DockerManager} from './helpers/environment/DockerManager';
import debug from 'debug';

const log = debug('e2e:global-setup');

setup('global environment setup', async ({}) => {
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

