import * as fs from 'fs';
import path from 'path';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import {DockerCompose} from './DockerCompose';
import {STATE_DIR, TB} from './constants';
import {ensureDir} from '../utils';

const debug = baseDebug('e2e:TinybirdManager');

export interface TinyBirdConfig {
    workspaceId: string;
    adminToken: string;
    trackerToken: string;
}

/**
 * Handles Tinybird token fetching and local config persistence
 */
export class TinybirdManager {
    private readonly tinybirdStateFile;
    private dockerCompose: DockerCompose;

    constructor(dockerCompose: DockerCompose, private readonly configDir: string = STATE_DIR) {
        this.dockerCompose = dockerCompose;
        this.tinybirdStateFile = path.join(this.configDir, 'tinybird.json');
    }

    saveConfig(config: TinyBirdConfig): void {
        try {
            ensureDir(this.configDir);
            fs.writeFileSync(this.tinybirdStateFile, JSON.stringify(config, null, 2));

            debug('Tinybird config saved to file:', config);
        } catch (error) {
            logging.error('Failed to save Tinybird config to file:', error);
            throw new Error(`Failed to save Tinybird config to file: ${error}`);
        }
    }

    loadConfig(): TinyBirdConfig {
        try {
            if (!fs.existsSync(this.tinybirdStateFile)) {
                throw new Error('Tinybird config file does not exist');
            }
            const data = fs.readFileSync(this.tinybirdStateFile, 'utf8');
            const state = JSON.parse(data) as TinyBirdConfig;
            debug('Tinybird config loaded:', state);
            return state;
        } catch (error) {
            logging.error('Failed to load Tinybird config:', error);
            throw new Error(`Failed to load Tinybird config: ${error}`);
        }
    }

    fetchAndSaveConfig(): void {
        const state = this.fetchConfig();
        this.saveConfig(state);
    }

    fetchConfig() {
        logging.info('Fetching Tinybird tokens...');

        const rawTinybirdEnv = this.dockerCompose.readFileFromService('tb-cli', TB.CLI_ENV_PATH);
        const envLines = rawTinybirdEnv.split('\n');
        const envVars: Record<string, string> = {};

        for (const line of envLines) {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        }

        const config: TinyBirdConfig = {
            workspaceId: envVars.TINYBIRD_WORKSPACE_ID,
            adminToken: envVars.TINYBIRD_ADMIN_TOKEN,
            trackerToken: envVars.TINYBIRD_TRACKER_TOKEN
        };

        logging.info('Tinybird tokens fetched');
        return config;
    }

    truncateAnalyticsEvents(): void {
        try {
            debug('Truncating analytics_events datasource...');
            this.dockerCompose.execInService('tb-cli', ['tb', 'datasource', 'truncate', 'analytics_events', '--yes', '--cascade']);

            debug('analytics_events datasource truncated');
        } catch (error) {
            // Don't throw - we want to continue with setup even if truncate fails
            debug('Failed to truncate analytics_events (Tinybird may not be running):', error);
        }
    }
}
