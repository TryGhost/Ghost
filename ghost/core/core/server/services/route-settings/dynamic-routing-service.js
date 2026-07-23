const crypto = require('crypto');
const debug = require('@tryghost/debug')('services:route-settings:service');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    loadError: 'Could not load routes.yaml file.'
};

/**
 * md5 of the expanded default route settings — the routes_hash value for a
 * site that has never customised its routes.
 */
const DEFAULT_ROUTES_SETTING_HASH = '3d180d52c663d173a6be791ef411ed01';

function isStoredContentError(err) {
    return err.errorType === 'ValidationError' || err.errorType === 'IncorrectUsageError';
}

/**
 * @typedef {import('@tryghost/adapter-base-route-settings').RouteSettingsStore} RouteSettingsStore
 */

class DynamicRoutingService {
    constructor() {
        /** @type {RouteSettingsStore} */
        this.store = null;
        this.routerManager = null;
        this.urlService = null;
    }

    /**
     * Wire the storage-layer dependency so the API surface (upload, download,
     * getCurrentHash) works immediately after boot — even when the frontend is
     * disabled and `start()` is never called.
     *
     * @param {object} deps
     * @param {RouteSettingsStore} deps.store - adapter-manager provided store
     */
    configure({store}) {
        debug('configure');
        this.store = store;
    }

    /**
     * Wire the routing dependencies and load route settings into the router.
     * Called from initDynamicRouting in boot.js — only when the frontend is enabled.
     *
     * @param {object} deps
     * @param {object} deps.routerManager - frontend RouterManager singleton
     * @param {object} deps.urlService    - UrlServiceFacade
     */
    async start({routerManager, urlService}) {
        debug('start');
        this.routerManager = routerManager;
        this.urlService = urlService;

        const settings = await this.loadRouteSettings();
        this.routerManager.start(settings);
    }

    async loadRouteSettings() {
        const {expandRouteSettings} = require('./activation-bridge');

        try {
            return expandRouteSettings(await this.store.get());
        } catch (err) {
            // A validation failure means the site's routes.yaml is invalid.
            // Log a targeted error so the failure is easy to spot in the logs,
            // then rethrow so the caller (boot, or the routes-hash sync) surfaces
            // the genuine error rather than silently degrading.
            if (err.errorType === 'ValidationError') {
                logging.error(new errors.InternalServerError({
                    message: 'Route settings failed validation and could not be loaded. Please fix the routes.yaml file.',
                    code: 'ROUTE_SETTINGS_VALIDATION_ERROR',
                    err,
                    errorDetails: {reason: err.message}
                }));
            }

            throw err;
        }
    }

    getDefaultHash() {
        return DEFAULT_ROUTES_SETTING_HASH;
    }

    async getCurrentHash() {
        const expanded = await this.loadRouteSettings();

        return crypto.createHash('md5')
            .update(JSON.stringify(expanded), 'binary')
            .digest('hex');
    }

    async download() {
        const settings = await this.store.get();

        return settings.yamlSource;
    }

    async upload(yamlContent) {
        const parseYaml = require('./yaml-parser');
        const {parseRouteSettings} = require('./route-settings-parser');
        const urlService = require('../url');
        const bridge = require('../../../bridge');

        // Parse and validate before anything is persisted — an invalid
        // upload is rejected here and never reaches the store.
        const next = parseRouteSettings(parseYaml(yamlContent), yamlContent);
        let previous = null;
        try {
            previous = await this.store.get();
        } catch (err) {
            if (!isStoredContentError(err)) {
                throw err;
            }
        }

        await this.store.replace(next);

        urlService.resetGenerators({releaseResourcesOnly: true});

        const bringBackValidRoutes = async () => {
            urlService.resetGenerators({releaseResourcesOnly: true});

            if (previous) {
                await this.store.replace(previous);
            }

            return bridge.reloadFrontend(this, urlService);
        };

        await bridge.reloadFrontend(this, urlService);

        let tries = 0;

        function isBlogRunning() {
            debug('waiting for blog running');
            return new Promise((resolve) => {
                setTimeout(resolve, 1000);
            })
                .then(() => {
                    debug('waited for blog running');
                    if (!urlService.hasFinished()) {
                        if (tries > 5) {
                            throw new errors.InternalServerError({
                                message: tpl(messages.loadError)
                            });
                        }

                        tries = tries + 1;
                        return isBlogRunning();
                    }
                });
        }

        return isBlogRunning()
            .catch((err) => {
                return bringBackValidRoutes()
                    .finally(() => {
                        throw err;
                    });
            });
    }
}

module.exports = DynamicRoutingService;
