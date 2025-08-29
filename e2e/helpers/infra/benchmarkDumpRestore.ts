import {MySqlContainer} from '@testcontainers/mysql';
import {GenericContainer, Wait, StartedTestContainer, Network} from 'testcontainers';
import {performance} from 'node:perf_hooks';

/**
 * Global Setup:
 * 1. Create Docker network
 * 2. Start MySQL container
 * 3. Run Ghost migrations
 * 4. Create a mysqldump of the initialized database
 *
 * Run Test:
 * 1. Create new mysql database (in the already running container)
 * 2. Restore mysqldump to new database
 * 3. Boot Ghost until "Ghost booted in..." log message
 * 4. Stop Ghost
 * 5. Delete database
*/

const obs = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
        console.log(`${entry.name}: ${entry.duration} milliseconds`);
    });
});
obs.observe({entryTypes: ['measure']});

interface callback {
    (): Promise<any>
}

const execute = async (label: string, cb: callback) => {
    performance.mark(`${label}Begin`);
    const result = await cb();
    performance.mark(`${label}Complete`);
    performance.measure(label, `${label}Begin`, `${label}Complete`);
    return result;
};

export const benchmarkDumpRestore = async () => {
    console.log('Running Dump & Restore Benchmark');
    performance.mark('start');

    performance.mark('globalSetupBegin');
    const network = await execute('startNetwork', async () => {
        return await new Network().start();
    });

    const mysql = await execute('startMysql', async () => {
        return await new MySqlContainer('mysql:8.0')
            .withNetwork(network)
            .withNetworkAliases('mysql')
            .withTmpFs({'/var/lib/mysql': 'rw,noexec,nosuid,size=1024m'})
            .withDatabase('ghost-test-1')
            .start();
    });

    const ghostEnv = {
        server__host: '0.0.0.0',
        database__client: 'mysql2',
        database__connection__host: 'mysql',
        database__connection__port: '3306',
        database__connection__user: 'root',
        database__connection__password: mysql.getRootPassword(),
        database__connection__database: mysql.getDatabase()
    };

    await execute('runMigrations', async () => {
        return await new GenericContainer('ghost-monorepo')
            .withNetwork(network)
            .withNetworkAliases('ghost')
            .withWorkingDir('/home/ghost')
            .withCommand(['yarn', 'knex-migrator', 'init'])
            .withEnvironment(ghostEnv)
            .withWaitStrategy(Wait.forOneShotStartup())
            .withExposedPorts(2368)
            .start();
    });

    await execute('createMysqldump', async () => {
        await mysql.exec([
            'sh', '-c',
            `mysqldump -u root -p${mysql.getRootPassword()} --opt --single-transaction ghost-test-1 > /tmp/dump.sql`
        ]);
    });
    performance.mark('globalSetupComplete');
    performance.measure('globalSetup', 'globalSetupBegin', 'globalSetupComplete');

    const runTest = async (index: number) => {
        await execute(`runTest${index}`, async () => {
            const db = `ghost_test_${index}`;
            // Create DB and restore from dump
            await mysql.exec([
                'mysql',
                '-u', 'root',
                `-p${mysql.getRootPassword()}`,
                '-e', `CREATE DATABASE IF NOT EXISTS ${db}`
            ]);
            await mysql.exec([
                'sh', '-c',
                `mysql -u root -p${mysql.getRootPassword()} ${db} < /tmp/dump.sql`
            ]);
            // Boot Ghost, then stop it
            const ghost = await new GenericContainer('ghost-monorepo')
                .withNetwork(network)
                .withNetworkAliases('ghost')
                .withWorkingDir('/home/ghost/ghost/core')
                .withCommand(['yarn', 'dev'])
                .withEnvironment({...ghostEnv, database__connection__database: db})
                .withWaitStrategy(Wait.forLogMessage(/Ghost booted in*/))
                .withExposedPorts(2368)
                .start();
            await ghost.stop();
            // Delete DB
            await mysql.exec([
                'mysql',
                '-u', 'root',
                `-p${mysql.getRootPassword()}`,
                '-e', `DROP DATABASE ${db}`
            ]);
        });
    };

    for (let i = 0; i < 25; i++) {
        await runTest(i);
    }

    await mysql.stop();
    await network.stop();
    performance.mark('end');
    performance.measure('Total time', 'start', 'end');
};

if (require.main === module) {
    benchmarkDumpRestore();
}
