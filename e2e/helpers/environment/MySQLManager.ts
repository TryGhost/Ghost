import type {Container} from 'dockerode';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import {DockerCompose} from './DockerCompose';
import {PassThrough} from 'stream';

const debug = baseDebug('e2e:MySQLManager');

interface ContainerWithModem extends Container {
    modem: {
        demuxStream(stream: NodeJS.ReadableStream, stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream): void;
    };
}

/**
 * Encapsulates MySQL operations within the docker-compose environment.
 * Responsible for creating snapshots, creating/restoring/dropping databases, and
 * updating database settings needed by tests.
 */
export class MySQLManager {
    private readonly dockerCompose: DockerCompose;
    constructor(dockerCompose: DockerCompose) {
        this.dockerCompose = dockerCompose;
    }

    /**
     * Create a snapshot of a source database inside the MySQL container.
     * Default path is written within the container filesystem.
     */
    async createSnapshot(sourceDatabase: string = 'ghost_testing', outputPath: string = '/tmp/dump.sql'): Promise<void> {
        console.log(outputPath);
        logging.info('Creating database snapshot...');
        const mysqlContainer = await this.dockerCompose.getContainerForService('mysql');

        // Debug: Check what tables exist before taking snapshot
        try {
            logging.info(`[DEBUG] Checking tables in ${sourceDatabase} before snapshot...`);
            const tables = await this.execInContainer(
                mysqlContainer,
                `mysql -uroot -proot ${sourceDatabase} -e "SHOW TABLES;"`
            );
            logging.info(`[DEBUG] Tables in ${sourceDatabase}:\n${tables}`);

            // Also check settings table specifically
            const settingsCount = await this.execInContainer(
                mysqlContainer,
                `mysql -uroot -proot ${sourceDatabase} -e "SELECT COUNT(*) as count FROM settings;" 2>&1`
            );
            logging.info(`[DEBUG] Settings table row count: ${settingsCount}`);
        } catch (error) {
            logging.error(`[DEBUG] Failed to check tables before snapshot:`, error);
            throw new Error(`Database ${sourceDatabase} does not appear to be ready for snapshot: ${error}`);
        }

        await this.execInContainer(
            mysqlContainer,
            `mysqldump -uroot -proot --opt --single-transaction ${sourceDatabase} > ${outputPath}`
        );
        logging.info('Database snapshot created');
    }

    /** Create a database if it does not already exist. */
    async createDatabase(database: string): Promise<void> {
        debug('Creating database:', database);
        const mysqlContainer = await this.dockerCompose.getContainerForService('mysql');
        await this.execInContainer(
            mysqlContainer,
            'mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS \\`' + database + '\\`;"'
        );
        debug('Database created:', database);
    }

    /** Restore a database from an existing snapshot file in the container. */
    async restoreDatabaseFromSnapshot(database: string, snapshotPath: string = '/tmp/dump.sql'): Promise<void> {
        console.log(snapshotPath);
        debug('Restoring database from snapshot:', database);
        const mysqlContainer = await this.dockerCompose.getContainerForService('mysql');
        await this.execInContainer(
            mysqlContainer,
            'mysql -uroot -proot ' + database + ' < ' + snapshotPath
        );
        debug('Database restored from snapshot:', database);
    }

    /** Update site_uuid within the settings table for a given database. */
    async updateSiteUuid(database: string, siteUuid: string): Promise<void> {
        debug('Updating site_uuid in database settings:', database, siteUuid);
        const mysqlContainer = await this.dockerCompose.getContainerForService('mysql');
        await this.execInContainer(
            mysqlContainer,
            'mysql -uroot -proot -e "UPDATE \\`' + database + '\\`.settings SET value=\'' + siteUuid + '\' WHERE \\`key\\`=\'site_uuid\';"'
        );
        debug('site_uuid updated in database settings:', siteUuid);
    }

    /** Drop a database if it exists. */
    async dropDatabase(database: string): Promise<void> {
        debug('Dropping database if exists:', database);
        const mysqlContainer = await this.dockerCompose.getContainerForService('mysql');
        await this.execInContainer(
            mysqlContainer,
            'mysql -uroot -proot -e "DROP DATABASE IF EXISTS \\`' + database + '\\`;"'
        );
        debug('Database dropped (if existed):', database);
    }

    /**
     * High-level helper used by tests: create DB, restore snapshot, apply settings.
     */
    async setupTestDatabase(database: string, siteUuid: string): Promise<void> {
        try {
            await this.createDatabase(database);
            await this.restoreDatabaseFromSnapshot(database);
            await this.updateSiteUuid(database, siteUuid);
            debug('Test database setup completed:', database, 'with site_uuid:', siteUuid);
        } catch (error) {
            logging.error('Failed to setup test database:', error);
            throw new Error(`Failed to setup test database: ${error}`);
        }
    }

    /** High-level helper used by tests: drop the DB. */
    async cleanupTestDatabase(database: string): Promise<void> {
        try {
            await this.dropDatabase(database);
            debug('Test database cleanup completed:', database);
        } catch (error) {
            logging.warn('Failed to cleanup test database:', error);
            // Don't throw - cleanup failures shouldn't break tests
        }
    }

    /**
     * Execute a command in a container and wait for completion
     *
     * This is primarily needed to run CLI commands like mysqldump inside the container
     *
     * Dockerode's exec API is a bit low-level and requires some boilerplate to handle the streams
     * and detect errors, so we encapsulate that complexity here.
     *
     * @param container - The Docker container to execute the command in
     * @param command - The shell command to execute
     * @returns The command output
     * @throws Error if the command fails
     */
    private async execInContainer(container: Container, command: string): Promise<string> {
        const exec = await container.exec({
            Cmd: ['sh', '-c', command],
            AttachStdout: true,
            AttachStderr: true,
            Tty: false
        });

        const stream = await exec.start({
            hijack: true,
            stdin: false
        });

        // Demultiplex the stream into separate stdout and stderr
        const stdoutChunks: Buffer[] = [];
        const stderrChunks: Buffer[] = [];

        const stdoutStream = new PassThrough();
        const stderrStream = new PassThrough();

        stdoutStream.on('data', (chunk: Buffer) => stdoutChunks.push(chunk));
        stderrStream.on('data', (chunk: Buffer) => stderrChunks.push(chunk));

        // Use Docker modem's demuxStream to separate stdout and stderr
        (container as ContainerWithModem).modem.demuxStream(stream, stdoutStream, stderrStream);

        // Wait for the stream to end
        await new Promise<void>((resolve, reject) => {
            stream.on('end', () => resolve());
            stream.on('error', reject);
        });

        // Get the exit code from exec inspection
        const execInfo = await exec.inspect();
        const exitCode = execInfo.ExitCode;

        const stdout = Buffer.concat(stdoutChunks).toString('utf8').trim();
        const stderr = Buffer.concat(stderrChunks).toString('utf8').trim();

        if (exitCode !== 0) {
            throw new Error(
                `Command failed with exit code ${exitCode}: ${command}\n` +
                `STDOUT: ${stdout}\n` +
                `STDERR: ${stderr}`
            );
        }

        return stdout;
    }
}
