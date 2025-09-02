import {Network, GenericContainer, StartedNetwork, Wait} from 'testcontainers';
import {MySqlContainer, StartedMySqlContainer} from '@testcontainers/mysql';
import debug from 'debug';

const log = debug('e2e:EnvironmentManager');

export class EnvironmentManager {
    private network: StartedNetwork | null = null;
    private mysql: StartedMySqlContainer | null = null;
    public constructor() {}

    public setup = async () => {
        log('Setting up test environment...');
        // Create Docker network
        this.network = await new Network().start();
        log('Docker network created.');
        // Start MySQL container
        this.mysql = await new MySqlContainer('mysql:8.0')
            .withNetwork(this.network)
            .withNetworkAliases('mysql')
            .withTmpFs({'/var/lib/mysql': 'rw,noexec,nosuid,size=1024m'})
            .withDatabase('ghost-test-1')
            .start();
        const ghostEnv = {
            server__host: '0.0.0.0',
            database__client: 'mysql2',
            database__connection__host: 'mysql',
            database__connection__port: '3306',
            database__connection__user: 'root',
            database__connection__password: this.mysql.getRootPassword(),
            database__connection__database: this.mysql.getDatabase()
        };
        log('MySQL container started.');
        await new GenericContainer('ghost-monorepo')
            .withNetwork(this.network)
            .withNetworkAliases('ghost')
            .withWorkingDir('/home/ghost')
            .withCommand(['yarn', 'knex-migrator', 'init'])
            .withEnvironment(ghostEnv)
            .withWaitStrategy(Wait.forOneShotStartup())
            .withExposedPorts(2368)
            .start();
        log('Ghost migrations completed.');
        await this.mysql.exec([
            'sh', '-c',
            `mysqldump -u root -p${this.mysql.getRootPassword()} --opt --single-transaction ghost-test-1 > /tmp/dump.sql`
        ]);
        log('Database dump created.');
    };

    public teardown = async () => {
        log('Tearing down test environment...');
        if (this.mysql) {
            await this.mysql.stop();
            this.mysql = null;
            log('MySQL container stopped.');
        }
        if (this.network) {
            await this.network.stop();
            this.network = null;
            log('Docker network stopped.');
        }
    };
};

