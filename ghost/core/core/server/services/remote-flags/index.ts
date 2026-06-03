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

/**
 * The slice of the labs service this module needs: the source of the overridable
 * flag allowlist.
 */
interface LabsLike {
    getAllFlags(): string[];
}

interface RemoteFlagsConfig {
    enabled?: boolean;
    url?: string | null;
}

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
export function init(config: ConfigLike, labs: LabsLike): RemoteFlagsService | null {
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

    instance = new RemoteFlagsService({
        url,
        siteId,
        getKnownFlags: () => labs.getAllFlags(),
        applyOverrides: overrides => flagOverrides.replace(overrides),
        request
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
