import * as fs from 'fs';
import path from 'path';
import logging from '@tryghost/logging';
import baseDebug from '@tryghost/debug';
import {DockerCompose} from './DockerCompose';
import {TB} from './constants';
import {ensureDir} from '../utils';

const debug = baseDebug('e2e:TinybirdManager');

export interface TinybirdConfig {
    workspaceId: string;
    adminToken: string;
    trackerToken: string;
}

/**
 * Encapsulates TinyBird and Tinybird CLI operations within the docker-compose environment.
 * Handles Tinybird token fetching and local config persistence.
 */
export class TinybirdManager {
    private readonly tinyBirdConfigFile;
    private readonly dockerCompose: DockerCompose;

    constructor(dockerCompose: DockerCompose, private readonly configDir: string) {
        this.dockerCompose = dockerCompose;
        this.tinyBirdConfigFile = path.join(this.configDir, 'tinybird.json');
    }

    loadConfig(): TinybirdConfig {
        try {
            if (!fs.existsSync(this.tinyBirdConfigFile)) {
                throw new Error('Tinybird config file does not exist');
            }
            const data = fs.readFileSync(this.tinyBirdConfigFile, 'utf8');
            const config = JSON.parse(data) as TinybirdConfig;

            debug('Tinybird config loaded:', config);
            return config;
        } catch (error) {
            logging.error('Failed to load Tinybird config:', error);
            throw new Error(`Failed to load Tinybird config: ${error}`);
        }
    }

    private saveConfig(config: TinybirdConfig): void {
        try {
            ensureDir(this.configDir);
            fs.writeFileSync(this.tinyBirdConfigFile, JSON.stringify(config, null, 2));

            debug('Tinybird config saved to file:', config);
        } catch (error) {
            logging.error('Failed to save Tinybird config to file:', error);
            throw new Error(`Failed to save Tinybird config to file: ${error}`);
        }
    }

    /**
     * Fetch Tinybird tokens and other details from the tinybird-local service and store them in a local file like
     * data/state/tinybird.json
     */
    fetchAndSaveConfig(): void {
        const config = this.fetchConfigFromCLI();
        this.saveConfig(config);
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

    private fetchConfigFromCLI() {
        logging.info('Fetching Tinybird tokens...');

        const rawTinybirdEnv = this.dockerCompose.execShellInService('tb-cli', `cat ${TB.CLI_ENV_PATH}`);
        const envLines = rawTinybirdEnv.split('\n');
        const envVars: Record<string, string> = {};

        for (const line of envLines) {
            const [key, value] = line.split('=');
            if (key && value) {
                envVars[key.trim()] = value.trim();
            }
        }

        const config: TinybirdConfig = {
            workspaceId: envVars.TINYBIRD_WORKSPACE_ID,
            adminToken: envVars.TINYBIRD_ADMIN_TOKEN,
            trackerToken: envVars.TINYBIRD_TRACKER_TOKEN
        };

        logging.info('Tinybird tokens fetched');
        return config;
    }
}
