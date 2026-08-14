const debug = require('@tryghost/debug')('services:route-settings:service');

class DynamicRoutingService {
    constructor() {
        this.settingsLoader = null;
        this.routerManager = null;
        this.urlService = null;
        this.routeSettings = null;
    }

    /**
     * Wire the storage-layer dependencies so the API surface (get, setFromFilePath,
     * getCurrentHash) works immediately after boot — even when the frontend is
     * disabled and `start()` is never called.
     *
     * @param {object} deps
     * @param {object} deps.settingsLoader - existing SettingsLoader instance
     * @param {object} deps.routeSettings  - legacy RouteSettings class instance
     */
    configure({settingsLoader, routeSettings}) {
        debug('configure');
        this.settingsLoader = settingsLoader;
        this.routeSettings = routeSettings;
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
        return this.settingsLoader.loadSettings();
    }

    getDefaultHash() {
        return this.routeSettings.getDefaultHash();
    }

    async getCurrentHash() {
        return this.routeSettings.getCurrentHash();
    }

    async get() {
        return this.routeSettings.get();
    }

    async setFromFilePath(filePath) {
        return this.routeSettings.setFromFilePath(filePath);
    }
}

module.exports = DynamicRoutingService;
