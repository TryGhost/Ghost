import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';

const debug = baseDebug('e2e:ContainerState');

export interface GhostInstanceState {
    containerId: string;
    workerId: number;
    testId: string;
    database: string;
    port: number;
    baseUrl: string;
}

export interface TinybirdState {
    workspaceId: string;
    adminToken: string;
    trackerToken: string;
}

export class ContainerState {
    private static readonly STATE_DIR = path.join(process.cwd(), 'playwright');
    private static readonly TINYBIRD_FILE = path.join(ContainerState.STATE_DIR, 'tinybird.json');

    constructor() {
        this.ensureStateDirectory();
    }

    private ensureStateDirectory(): void {
        try {
            if (!fs.existsSync(ContainerState.STATE_DIR)) {
                fs.mkdirSync(ContainerState.STATE_DIR, {recursive: true});
                debug('Created state directory:', ContainerState.STATE_DIR);
            }
        } catch (error) {
            // Handle race condition where directory might be created between existsSync and mkdirSync
            if (!fs.existsSync(ContainerState.STATE_DIR)) {
                logging.error('Failed to ensure state directory exists:', error);
                throw new Error(`Failed to ensure state directory exists: ${error}`);
            }
        }
    }

    // Tinybird state management
    saveTinybirdState(state: TinybirdState): void {
        try {
            this.ensureStateDirectory();
            fs.writeFileSync(ContainerState.TINYBIRD_FILE, JSON.stringify(state, null, 2));
            debug('Tinybird state saved:', state);
        } catch (error) {
            logging.error('Failed to save Tinybird state:', error);
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
            debug('Tinybird state loaded:', state);
            return state;
        } catch (error) {
            logging.error('Failed to load Tinybird state:', error);
            throw new Error(`Failed to load Tinybird state: ${error}`);
        }
    }

    hasTinybirdState(): boolean {
        return fs.existsSync(ContainerState.TINYBIRD_FILE);
    }

    // Cleanup
    cleanupAll(): void {
        try {
            if (fs.existsSync(ContainerState.STATE_DIR)) {
                fs.rmSync(ContainerState.STATE_DIR, {recursive: true, force: true});
                debug('All state files cleaned up');
            }
        } catch (error) {
            logging.error('Failed to cleanup state files:', error);
            throw new Error(`Failed to cleanup state files: ${error}`);
        }
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
