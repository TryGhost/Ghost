const config = require('../../../shared/config');
const labs = require('../../../shared/labs');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const RemoteFlagsService = require('./remote-flags-service');

let instance = null;

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
 * @returns {RemoteFlagsService|null} the running service, or null when inert
 */
module.exports.init = function init() {
    if (instance) {
        return instance;
    }

    const remoteFlags = config.get('remoteFlags') || {};
    const siteId = config.get('hostSettings:siteId');

    if (remoteFlags.enabled !== true || !remoteFlags.url || siteId === undefined || siteId === null) {
        return null;
    }

    try {
        // Validate the URL once here so a misconfigured manifest url fails loudly at
        // start rather than silently warning on every poll for the life of the process.
        // eslint-disable-next-line no-new
        new URL(remoteFlags.url);
    } catch (err) {
        logging.warn({
            system: {event: 'remote_flags.invalid_url', siteId}
        }, `Remote feature flags url is not a valid URL, not starting: ${remoteFlags.url}`);
        return null;
    }

    instance = new RemoteFlagsService({
        url: remoteFlags.url,
        siteId,
        getKnownFlags: () => labs.getAllFlags(),
        applyOverrides: overrides => labs.setRemoteOverrides(overrides),
        request
    });

    // Fire-and-forget: start() is fail-open and never rejects, so this neither
    // blocks boot nor produces an unhandled rejection.
    instance.start();

    return instance;
};

/**
 * Stop the poller. This only halts polling; it intentionally leaves the
 * last-applied overrides in place rather than clearing them.
 */
module.exports.stop = function stop() {
    if (instance) {
        instance.stop();
        instance = null;
    }
};

/**
 * @returns {RemoteFlagsService|null}
 */
module.exports.getInstance = function getInstance() {
    return instance;
};
