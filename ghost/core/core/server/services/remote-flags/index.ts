/* eslint-disable @typescript-eslint/no-require-imports */
import logging from '@tryghost/logging';
import {RemoteFlagsService} from './remote-flags-service';
import * as flagOverrides from '../../../shared/labs-flag-overrides';

// @tryghost/request ships no type declarations, so it is required rather than
// imported to avoid an implicit-any error under the strict tsconfig.
const request = require('@tryghost/request');

/**
 * The slice of the config service this module needs. Injected rather than imported
 * so the gating logic stays a pure function of its inputs and is trivial to test.
 */
interface ConfigLike {
    get(key: string): unknown;
}

interface RemoteFlagsConfig {
    enabled?: boolean;
    url?: string | null;
    pollInterval?: unknown;
}

// Floor for the configured poll interval. A fleet of ~30k containers polling a
// shared CDN must never be allowed to poll faster than this, so a too-small (or
// units-confused, e.g. seconds-as-ms) value is rejected rather than honored.
const MIN_POLL_INTERVAL_MS = 60 * 1000;

let instance: RemoteFlagsService | null = null;

/**
 * Start the remote feature-flag poller, if it is enabled for this instance.
 *
 * Pro-only and opt-in: the service stays completely inert unless the `remoteFlags`
 * config block is explicitly enabled with a manifest `url`, on a container that has
 * a `hostSettings:siteId`. Self-hosted and dev installs have neither by default, so
 * this is a no-op there and labs behaves exactly as before.
 *
 * Polling is started fire-and-forget so boot is never blocked on (or failed by) the
 * first manifest fetch; the service is fail-open and applies overrides once the
 * fetch completes.
 *
 * @returns the running service, or null when inert
 */
export function init(config: ConfigLike): RemoteFlagsService | null {
    if (instance) {
        return instance;
    }

    const remoteFlags = (config.get('remoteFlags') as RemoteFlagsConfig) || {};
    const siteId = config.get('hostSettings:siteId') as number | string | undefined | null;

    if (remoteFlags.enabled !== true || !remoteFlags.url || siteId === undefined || siteId === null) {
        return null;
    }

    let url: URL;
    try {
        // Validate and normalise the manifest url once here so a misconfigured value
        // fails loudly at start rather than silently warning on every poll, and so the
        // service is handed a ready URL object instead of constructing one itself.
        url = new URL(remoteFlags.url);
    } catch {
        logging.warn({
            system: {event: 'remote_flags.invalid_url', siteId}
        }, `Remote feature flags url is not a valid URL, not starting: ${remoteFlags.url}`);
        return null;
    }

    // Optional poll interval (ms). Fall back to the service default when unset; a
    // value that is not a finite number at or above the floor is rejected with a
    // warning so a typo (or seconds mistaken for ms) can neither stop polling nor
    // hammer the CDN across the fleet.
    let pollInterval: number | undefined;
    const configuredInterval = remoteFlags.pollInterval;
    if (configuredInterval !== undefined && configuredInterval !== null) {
        if (typeof configuredInterval === 'number' && Number.isFinite(configuredInterval) && configuredInterval >= MIN_POLL_INTERVAL_MS) {
            pollInterval = configuredInterval;
        } else {
            logging.warn({
                system: {event: 'remote_flags.invalid_poll_interval', siteId}
            }, `Remote feature flags pollInterval must be a number >= ${MIN_POLL_INTERVAL_MS}ms, using the default: ${configuredInterval}`);
        }
    }

    instance = new RemoteFlagsService({
        url,
        siteId,
        applyOverrides: overrides => flagOverrides.replace(overrides),
        request,
        pollInterval
    });

    // Fire-and-forget: start() is fail-open and never rejects, so this neither
    // blocks boot nor produces an unhandled rejection.
    instance.start();

    return instance;
}

/**
 * Stop the poller. This only halts polling; it intentionally leaves the
 * last-applied overrides in place rather than clearing them.
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
