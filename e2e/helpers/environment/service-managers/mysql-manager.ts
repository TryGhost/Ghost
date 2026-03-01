import Docker from 'dockerode';
import baseDebug from '@tryghost/debug';
import logging from '@tryghost/logging';
import {DEV_PRIMARY_DATABASE} from '@/helpers/environment/constants';
import {PassThrough} from 'stream';
import type {Container} from 'dockerode';

const debug = baseDebug('e2e:MySQLManager');

interface ContainerWithModem extends Container {
    modem: {
        demuxStream(stream: NodeJS.ReadableStream, stdout: NodeJS.WritableStream, stderr: NodeJS.WritableStream): void;
    };
}

/**
 * Manages MySQL operations for E2E tests.
 * Handles creating snapshots, creating/restoring/dropping databases, and
 * updating database settings needed by tests.
 */
export class MySQLManager {
    private readonly docker: Docker;
    private readonly containerName: string;

    constructor(containerName: string = 'ghost-dev-mysql') {
        this.docker = new Docker();
        this.containerName = containerName;
    }

    async setupTestDatabase(databaseName: string, siteUuid: string): Promise<void> {
        debug('Setting up test database:', databaseName);
        try {
            await this.createDatabase(databaseName);
            await this.restoreDatabaseFromSnapshot(databaseName);
            await this.updateSiteUuid(databaseName, siteUuid);

            debug('Test database setup completed:', databaseName, 'with site_uuid:', siteUuid);
        } catch (error) {
            logging.error('Failed to setup test database:', error);
            throw error instanceof Error ? error : new Error(`Failed to setup test database: ${String(error)}`);
        }
    }

    async cleanupTestDatabase(databaseName: string): Promise<void> {
        try {
            await this.dropDatabase(databaseName);

            debug('Test database cleanup completed:', databaseName);
        } catch (error) {
            // Don't throw - cleanup failures shouldn't break tests
            logging.warn('Failed to cleanup test database:', error);
        }
    }

    async createDatabase(databaseName: string): Promise<void> {
        debug('Creating database:', databaseName);

        await this.exec('mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS \\`' + databaseName + '\\`;"');

        debug('Database created:', databaseName);
    }

    async dropDatabase(database: string): Promise<void> {
        debug('Dropping database if exists:', database);

        await this.exec('mysql -uroot -proot -e "DROP DATABASE IF EXISTS \\`' + database + '\\`;"');

        debug('Database dropped (if existed):', database);
    }

    async dropDatabases(databaseNames: string[]): Promise<void> {
        for (const database of databaseNames) {
            await this.dropDatabase(database);
        }

        debug('All test databases cleaned up');
    }

    /**
     * Used for cleanup of leftover databases from interrupted tests.
     * This removes all databases matching the pattern 'ghost_%' except base databases.
     */
    async dropAllTestDatabases(): Promise<void> {
        try {
            debug('Finding all test databases to clean up...');

            const query = `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'ghost_%' AND schema_name NOT IN ('ghost_testing', 'ghost_e2e_base', '${DEV_PRIMARY_DATABASE}')`;
            const output = await this.exec(`mysql -uroot -proot -N -e "${query}"`);

            const databaseNames = this.parseDatabaseNames(output);
            if (databaseNames === null) {
                return;
            }

            await this.dropDatabases(databaseNames);
        } catch (error) {
            // Don't throw - we want to continue with setup even if MySQL cleanup fails
            debug('Failed to clean up test databases (MySQL may not be running):', error);
        }
    }

    async createSnapshot(sourceDatabase: string = 'ghost_testing', outputPath: string = '/tmp/dump.sql'): Promise<void> {
        logging.info('Creating database snapshot...');

        await this.exec(`mysqldump -uroot -proot --opt --single-transaction ${sourceDatabase} > ${outputPath}`);

        logging.info('Database snapshot created');
    }

    async deleteSnapshot(snapshotPath: string = '/tmp/dump.sql'): Promise<void> {
        try {
            debug('Deleting MySQL snapshot:', snapshotPath);

            await this.exec(`rm -f ${snapshotPath}`);

            debug('MySQL snapshot deleted');
        } catch (error) {
            // Don't throw - we want to continue with setup even if snapshot deletion fails
            debug('Failed to delete MySQL snapshot (MySQL may not be running):', error);
        }
    }

    async restoreDatabaseFromSnapshot(database: string, snapshotPath: string = '/tmp/dump.sql'): Promise<void> {
        debug('Restoring database from snapshot:', database);

        await this.exec('mysql -uroot -proot ' + database + ' < ' + snapshotPath);

        debug('Database restored from snapshot:', database);
    }

    async recreateBaseDatabase(database: string = 'ghost_testing'): Promise<void> {
        debug('Recreating base database:', database);

        await this.dropDatabase(database);
        await this.createDatabase(database);

        debug('Base database recreated:', database);
    }

    private parseDatabaseNames(text: string) {
        if (!text.trim()) {
            debug('No test databases found to clean up');
            return null;
        }

        const databaseNames = text.trim().split('\n').filter(db => db.trim());

        if (databaseNames.length === 0) {
            debug('No test databases found to clean up');
            return null;
        }

        debug(`Found ${databaseNames.length} test database(s) to clean up:`, databaseNames);

        return databaseNames;
    }

    async updateSiteUuid(database: string, siteUuid: string): Promise<void> {
        debug('Updating site_uuid in database settings:', database, siteUuid);

        const command = 'mysql -uroot -proot -e "UPDATE \\`' +
            database + '\\`.settings SET value=\'' +
            siteUuid + '\' WHERE \\`key\\`=\'site_uuid\';"';

        await this.exec(command);

        debug('site_uuid updated in database settings:', siteUuid);
    }

    private async exec(command: string) {
        const container = this.docker.getContainer(this.containerName);
        return await this.execInContainer(container, command);
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
