const debug = require('@tryghost/debug')('services:route-settings:service');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');

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
   * Wire the storage-layer dependency so the API surface (upload, download)
   * works from early boot, well before `start()` wires up routing.
   *
   * @param {object} deps
   * @param {RouteSettingsStore} deps.store - adapter-manager provided store
   */
  configure({ store }) {
    debug('configure');
    this.store = store;
  }

  /**
   * Wire the routing dependencies and load route settings into the router.
   * Called from initDynamicRouting in boot.js on every boot: the URL service
   * has to learn the routes even where no page is served, so that the APIs and
   * background services can build URLs.
   *
   * @param {object} deps
   * @param {object} deps.routerManager - frontend RouterManager singleton
   * @param {object} deps.urlService    - the URL service singleton
   */
  async start({ routerManager, urlService }) {
    debug('start');
    this.routerManager = routerManager;
    this.urlService = urlService;

    const settings = await this.loadRouteSettings();
    this.routerManager.start(settings);
  }

  async loadRouteSettings() {
    try {
      return await this.store.get();
    } catch (err) {
      // A stored-content error means the site's routes.yaml is invalid —
      // either it fails validation or it isn't parseable YAML. Log a
      // targeted error so the failure is easy to spot in the logs, then
      // rethrow so the caller surfaces the genuine error rather than
      // silently degrading.
      if (isStoredContentError(err)) {
        logging.error(
          new errors.InternalServerError({
            message:
              'Route settings could not be loaded because the routes.yaml file is invalid. Please fix the file.',
            code: 'ROUTE_SETTINGS_VALIDATION_ERROR',
            err,
            errorDetails: { reason: err.message },
          }),
        );
      }

      throw err;
    }
  }

  async download() {
    const settings = await this.store.get();

    return settings.yamlSource;
  }

  async upload(yamlContent) {
    const parseYaml = require('./yaml-parser');
    const { parseRouteSettings } = require('./route-settings-parser');
    const urlService = require('../url');
    // Deferred: bridge reaches back here via api/endpoints/settings.js,
    // so hoisting this would resolve to a half-initialised export.
    const bridge = require('../../../bridge');

    // Parse and validate before anything is persisted — an invalid
    // upload is rejected here and never reaches the store.
    const next = parseRouteSettings(parseYaml(yamlContent), yamlContent);

    await this.store.replace(next);

    // Registration is synchronous inside the reload: RouterManager.start()
    // always mounts the static pages router, which has permalinks, so the
    // URL service has routers again — and reports ready — by the time this
    // resolves. Nothing left to wait for.
    await bridge.reloadFrontend(this, urlService);
  }
}

module.exports = DynamicRoutingService;
