import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import debug from 'debug';

const log = debug('e2e:ContainerState');

export interface NetworkState {
    networkId: string;
    networkName: string;
}

export interface MySQLState {
    containerId: string;
    rootPassword: string;
    mappedPort: number;
    database: string;
    host: string;
}

export interface GhostInstanceState {
    containerId: string;
    workerId: number;
    testId: string;
    database: string;
    port: number;
    baseUrl: string;
}

export interface TinybirdState {
    containerId: string;
    workspaceId: string;
    adminToken: string;
    trackerToken: string;
    mappedPort: number;
    host: string;
}

export class ContainerState {
    private static readonly STATE_DIR = path.join(process.cwd(), '.playwright-containers');
    private static readonly NETWORK_FILE = path.join(ContainerState.STATE_DIR, 'network.json');
    private static readonly MYSQL_FILE = path.join(ContainerState.STATE_DIR, 'mysql.json');
    private static readonly TINYBIRD_FILE = path.join(ContainerState.STATE_DIR, 'tinybird.json');
    private static readonly DUMP_FILE = path.join(ContainerState.STATE_DIR, 'dump.sql');

    constructor() {
        this.ensureStateDirectory();
    }

    private ensureStateDirectory(): void {
        try {
            if (!fs.existsSync(ContainerState.STATE_DIR)) {
                fs.mkdirSync(ContainerState.STATE_DIR, { recursive: true });
                log('Created state directory:', ContainerState.STATE_DIR);
            }
        } catch (error) {
            // Handle race condition where directory might be created between existsSync and mkdirSync
            if (!fs.existsSync(ContainerState.STATE_DIR)) {
                log('Failed to ensure state directory exists:', error);
                throw new Error(`Failed to ensure state directory exists: ${error}`);
            }
        }
    }

    // Network state management
    saveNetworkState(state: NetworkState): void {
        try {
            this.ensureStateDirectory(); // Ensure directory exists before writing
            fs.writeFileSync(ContainerState.NETWORK_FILE, JSON.stringify(state, null, 2));
            log('Network state saved:', state);
        } catch (error) {
            log('Failed to save network state:', error);
            throw new Error(`Failed to save network state: ${error}`);
        }
    }

    loadNetworkState(): NetworkState {
        try {
            if (!fs.existsSync(ContainerState.NETWORK_FILE)) {
                throw new Error('Network state file does not exist');
            }
            const data = fs.readFileSync(ContainerState.NETWORK_FILE, 'utf8');
            const state = JSON.parse(data) as NetworkState;
            log('Network state loaded:', state);
            return state;
        } catch (error) {
            log('Failed to load network state:', error);
            throw new Error(`Failed to load network state: ${error}`);
        }
    }

    // MySQL state management
    saveMySQLState(state: MySQLState): void {
        try {
            fs.writeFileSync(ContainerState.MYSQL_FILE, JSON.stringify(state, null, 2));
            log('MySQL state saved:', state);
        } catch (error) {
            log('Failed to save MySQL state:', error);
            throw new Error(`Failed to save MySQL state: ${error}`);
        }
    }

    loadMySQLState(): MySQLState {
        try {
            if (!fs.existsSync(ContainerState.MYSQL_FILE)) {
                throw new Error('MySQL state file does not exist');
            }
            const data = fs.readFileSync(ContainerState.MYSQL_FILE, 'utf8');
            const state = JSON.parse(data) as MySQLState;
            log('MySQL state loaded:', state);
            return state;
        } catch (error) {
            log('Failed to load MySQL state:', error);
            throw new Error(`Failed to load MySQL state: ${error}`);
        }
    }

    // Tinybird state management
    saveTinybirdState(state: TinybirdState): void {
        try {
            this.ensureStateDirectory();
            fs.writeFileSync(ContainerState.TINYBIRD_FILE, JSON.stringify(state, null, 2));
            log('Tinybird state saved:', state);
        } catch (error) {
            log('Failed to save Tinybird state:', error);
            throw new Error(`Failed to save Tinybird state: ${error}`);
        }
    }

    loadTinybirdState(): TinybirdState {
        try {
            if (!fs.existsSync(ContainerState.TINYBIRD_FILE)) {
                throw new Error('Tinybird state file does not exist');
            }
            const data = fs.readFileSync(ContainerState.TINYBIRD_FILE, 'utf8');
            const state = JSON.parse(data) as TinybirdState;
            log('Tinybird state loaded:', state);
            return state;
        } catch (error) {
            log('Failed to load Tinybird state:', error);
            throw new Error(`Failed to load Tinybird state: ${error}`);
        }
    }

    // Database dump management
    saveDatabaseDump(dumpContent: string): void {
        try {
            fs.writeFileSync(ContainerState.DUMP_FILE, dumpContent);
            log('Database dump saved to:', ContainerState.DUMP_FILE);
        } catch (error) {
            log('Failed to save database dump:', error);
            throw new Error(`Failed to save database dump: ${error}`);
        }
    }

    loadDatabaseDump(): string {
        try {
            if (!fs.existsSync(ContainerState.DUMP_FILE)) {
                throw new Error('Database dump file does not exist');
            }
            const dump = fs.readFileSync(ContainerState.DUMP_FILE, 'utf8');
            log('Database dump loaded, size:', dump.length);
            return dump;
        } catch (error) {
            log('Failed to load database dump:', error);
            throw new Error(`Failed to load database dump: ${error}`);
        }
    }

    getDumpFilePath(): string {
        return ContainerState.DUMP_FILE;
    }

    // State validation
    hasNetworkState(): boolean {
        return fs.existsSync(ContainerState.NETWORK_FILE);
    }

    hasMySQLState(): boolean {
        return fs.existsSync(ContainerState.MYSQL_FILE);
    }

    hasDatabaseDump(): boolean {
        return fs.existsSync(ContainerState.DUMP_FILE);
    }

    hasTinybirdState(): boolean {
        return fs.existsSync(ContainerState.TINYBIRD_FILE);
    }

    // Cleanup
    cleanupAll(): void {
        try {
            if (fs.existsSync(ContainerState.STATE_DIR)) {
                fs.rmSync(ContainerState.STATE_DIR, { recursive: true, force: true });
                log('All state files cleaned up');
            }
        } catch (error) {
            log('Failed to cleanup state files:', error);
            throw new Error(`Failed to cleanup state files: ${error}`);
        }
    }

    // Utility methods for generating unique identifiers
    static generateDatabaseName(workerId: number, testId: string): string {
        // Clean test ID to be MySQL-safe
        const cleanTestId = testId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
        return `ghost_test_w${workerId}_${cleanTestId}`;
    }

    static generateNetworkAlias(workerId: number, testId: string): string {
        const cleanTestId = testId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
        return `ghost-w${workerId}-${cleanTestId}`;
    }

    static generateUniquePort(workerId: number, basePort: number = 2368): number {
        return basePort + workerId;
    }

    static generateSiteUuid(): string {
        // Generate a UUID v4 for the site_uuid
        return crypto.randomUUID();
    }
}