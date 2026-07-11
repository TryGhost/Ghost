import logging from '@tryghost/logging';
import {RemoteFlagsService} from './remote-flags-service';
import * as flagOverrides from '../../../shared/labs-flag-overrides';

// @tryghost/request ships no types; require() avoids an implicit-any under the strict tsconfig.
const request = require('@tryghost/request');
// Every site seeds a site_uuid setting, so it's a universal ramp key.
const settingsCache = require('../../../shared/settings-cache');

// Config slice this module needs; injected so init() stays testable.
interface ConfigLike {
    get(key: string): unknown;
}

interface RemoteFlagsConfig {
    enabled?: boolean;
    url?: string | null;
    pollInterval?: unknown;
}

// Floor for the poll interval: many instances can share one manifest host, so a
// too-small or units-confused (seconds-as-ms) value is rejected, not honored.
const MIN_POLL_INTERVAL_MS = 60 * 1000;

let instance: RemoteFlagsService | null = null;

/**
 * Start the poller if enabled for this instance. Config-gated and opt-in: inert
 * unless `remoteFlags` is enabled with a `url` (self-hosted/dev leave it unset).
 * The site's UUID is the ramp bucket key; it's absent only in edge cases, where
 * ramps are skipped but full overrides still apply. Polling is fire-and-forget so
 * boot is never blocked on the first fetch.
 *
 * @returns the running service, or null when inert
 */
export function init(config: ConfigLike): RemoteFlagsService | null {
    if (instance) {
        return instance;
    }

    const remoteFlags = (config.get('remoteFlags') as RemoteFlagsConfig) || {};

    if (remoteFlags.enabled !== true || !remoteFlags.url) {
        return null;
    }

    const siteUuid = settingsCache.get('site_uuid') as string | undefined;

    let url: URL;
    try {
        // Validate the url once at start (not on every poll); hand the service a ready URL.
        url = new URL(remoteFlags.url);
    } catch {
        logging.warn({
            system: {event: 'remote_flags.invalid_url'}
        }, `Remote feature flags url is not a valid URL, not starting: ${remoteFlags.url}`);
        return null;
    }

    // Optional poll interval (ms): honor a finite value >= the floor, else warn and
    // use the service default.
    let pollInterval: number | undefined;
    const configuredInterval = remoteFlags.pollInterval;
    if (configuredInterval !== undefined && configuredInterval !== null) {
        if (typeof configuredInterval === 'number' && Number.isFinite(configuredInterval) && configuredInterval >= MIN_POLL_INTERVAL_MS) {
            pollInterval = configuredInterval;
        } else {
            logging.warn({
                system: {event: 'remote_flags.invalid_poll_interval'}
            }, `Remote feature flags pollInterval must be a number >= ${MIN_POLL_INTERVAL_MS}ms, using the default: ${configuredInterval}`);
        }
    }

    instance = new RemoteFlagsService({
        url,
        siteUuid,
        applyOverrides: overrides => flagOverrides.replace(overrides),
        request,
        pollInterval
    });

    // Fire-and-forget: start() never rejects, so this won't block boot or throw unhandled.
    instance.start();

    return instance;
}

/**
 * Stop the poller. Halts polling; intentionally leaves the last-applied overrides
 * in place rather than clearing them.
 */
export function stop(): void {
    if (instance) {
        instance.stop();
        instance = null;
    }
}

export function getInstance(): RemoteFlagsService | null {
    return instance;
}
