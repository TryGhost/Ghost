import * as fs from 'fs';
import path from 'path';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import {DockerCompose} from './DockerCompose';

const debug = baseDebug('e2e:TinybirdManager');

export interface TinybirdState {
    workspaceId: string;
    adminToken: string;
    trackerToken: string;
}

/**
 * Handles Tinybird token fetching and local state persistence for e2e runs.
 */
export class TinybirdManager {
    private readonly stateDir = path.resolve(__dirname, '../../data/state');
    private readonly tinybirdStateFile = path.join(this.stateDir, 'tinybird.json');
    private dockerCompose: DockerCompose;

    constructor(dockerCompose: DockerCompose) {
        this.dockerCompose = dockerCompose;
    }

    /** Ensure the state directory exists. */
    private ensureDataDir(): void {
        try {
            if (!fs.existsSync(this.stateDir)) {
                fs.mkdirSync(this.stateDir, {recursive: true});
                debug('created state directory:', this.stateDir);
            }
        } catch (error) {
            if (!fs.existsSync(this.stateDir)) {
                logging.error('failed to ensure state directory exists:', error);
                throw new Error(`failed to ensure state directory exists: ${error}`);
            }
        }
    }

    /** Persist Tinybird state to disk. */
    saveState(state: TinybirdState): void {
        try {
            this.ensureDataDir();
            fs.writeFileSync(this.tinybirdStateFile, JSON.stringify(state, null, 2));
            debug('Tinybird state saved:', state);
        } catch (error) {
            logging.error('Failed to save Tinybird state:', error);
            throw new Error(`Failed to save Tinybird state: ${error}`);
        }
    }

    /** Load Tinybird state from disk. */
    loadState(): TinybirdState {
        try {
            if (!fs.existsSync(this.tinybirdStateFile)) {
                throw new Error('Tinybird state file does not exist');
            }
            const data = fs.readFileSync(this.tinybirdStateFile, 'utf8');
            const state = JSON.parse(data) as TinybirdState;
            debug('Tinybird state loaded:', state);
            return state;
        } catch (error) {
            logging.error('Failed to load Tinybird state:', error);
            throw new Error(`Failed to load Tinybird state: ${error}`);
        }
    }

    /**
    * Fetch tokens from the tb-cli container and persist them locally.
    */
    fetchTokens(): void {
        logging.info('Fetching Tinybird tokens...');
        const rawTinybirdEnv = this.dockerCompose.readFileFromService('tb-cli', '/mnt/shared-config/.env.tinybird');
        const envLines = rawTinybirdEnv.split('\n');
        const envVars: Record<string, string> = {};
        for (const line of envLines) {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        }
        const state: TinybirdState = {
            workspaceId: envVars.TINYBIRD_WORKSPACE_ID,
            adminToken: envVars.TINYBIRD_ADMIN_TOKEN,
            trackerToken: envVars.TINYBIRD_TRACKER_TOKEN
        };
        this.saveState(state);
        logging.info('Tinybird tokens fetched');
    }
}

