const debug = require('@tryghost/debug')('frontend:routing');
const _ = require('lodash');
const StaticRoutesRouter = require('./StaticRoutesRouter');
const StaticPagesRouter = require('./StaticPagesRouter');
const CollectionRouter = require('./CollectionRouter');
const TaxonomyRouter = require('./TaxonomyRouter');
const PreviewRouter = require('./PreviewRouter');
const ParentRouter = require('./ParentRouter');
const EmailRouter = require('./EmailRouter');
const UnsubscribeRouter = require('./UnsubscribeRouter');

// This emits its own routing events
const events = require('../../../server/lib/common/events');

class RouterManager {
    constructor({registry}) {
        this.registry = registry;
        this.siteRouter = null;
        /**
         * @type {URLService}
         */
        this.urlService = null;
    }

    owns(routerId, id) {
        return this.urlService.owns(routerId, id);
    }

    getUrlByResourceId(id, options) {
        return this.urlService.getUrlByResourceId(id, options);
    }

    getResourceById(resourceId) {
        return this.urlService.getResourceById(resourceId);
    }

    routerCreated(router) {
        // NOTE: this event should be become an "internal frontend even"
        //       and should not be consumed by the modules outside the frontend
        events.emit('router.created', router);

        // CASE: there are router types which do not generate resource urls
        //       e.g. static route router, in this case we don't want ot notify the URL service
        if (!router || !router.getPermalinks()) {
            return;
        }

        this.urlService.onRouterAddedType(
            router.identifier,
            router.filter,
            router.getResourceType(),
            router.getPermalinks().getValue()
        );
    }

    /**
     * The `init` function will return the wrapped parent express router and will start creating all
     * routers if you pass the option "start: true".
     *
     * CASES:
     *   - if Ghost starts, it will first init the site app with the wrapper router and then call `start`
     *     separately, because it could be that your blog goes into maintenance mode
     *   - if you change your route settings, we will re-initialize routing
     *
     * @param {RouterConfig} options
     * @returns {import('express').Router}
     */
    init({routeSettings, urlService}) {
        this.urlService = urlService;
        debug('routing init', routeSettings);

        this.registry.resetAllRouters();
        this.registry.resetAllRoutes();

        // NOTE: this event could become an "internal frontend" in the future, it's used has been kept to prevent
        //       from tying up this module with sitemaps
        events.emit('routers.reset');

        this.siteRouter = new ParentRouter('SiteRouter');
        this.registry.setRouter('siteRouter', this.siteRouter);

        if (routeSettings) {
            this.start(routeSettings);
        }

        return this.siteRouter.router();
    }

    /**
     * @description This function will create the routers based on the route settings
     *
     * The routers are created in a specific order. This order defines who can get a resource first or
     * who can dominant other routers.
     *
     * 1. Preview + Unsubscribe Routers: Strongest inbuilt features, which you can never override.
     * 2. Static Routes: Very strong, because you can override any urls and redirect to a static route.
     * 3. Taxonomies: Stronger than collections, because it's an inbuilt feature.
     * 4. Collections
     * 5. Static Pages: Weaker than collections, because we first try to find a post slug and fallback to lookup a static page.
     * 6. Internal Apps: Weakest
     *
     * @param {object} routerSettings
     */
    start(routerSettings) {
        debug('routing start', routerSettings);
        const RESOURCE_CONFIG = require(`./config`);

        const unsubscribeRouter = new UnsubscribeRouter();
        this.siteRouter.mountRouter(unsubscribeRouter.router());
        this.registry.setRouter('unsubscribeRouter', unsubscribeRouter);

        if (RESOURCE_CONFIG.QUERY.email) {
            const emailRouter = new EmailRouter(RESOURCE_CONFIG);
            this.siteRouter.mountRouter(emailRouter.router());
            this.registry.setRouter('emailRouter', emailRouter);
        }

        const previewRouter = new PreviewRouter(RESOURCE_CONFIG);
        this.siteRouter.mountRouter(previewRouter.router());
        this.registry.setRouter('previewRouter', previewRouter);

        _.each(routerSettings.routes, (value, key) => {
            const staticRoutesRouter = new StaticRoutesRouter(key, value, this.routerCreated.bind(this));
            this.siteRouter.mountRouter(staticRoutesRouter.router());

            this.registry.setRouter(staticRoutesRouter.identifier, staticRoutesRouter);
        });

        _.each(routerSettings.collections, (value, key) => {
            const collectionRouter = new CollectionRouter(key, value, RESOURCE_CONFIG, this.routerCreated.bind(this));
            this.siteRouter.mountRouter(collectionRouter.router());
            this.registry.setRouter(collectionRouter.identifier, collectionRouter);
        });

        const staticPagesRouter = new StaticPagesRouter(RESOURCE_CONFIG, this.routerCreated.bind(this));
        this.siteRouter.mountRouter(staticPagesRouter.router());

        this.registry.setRouter('staticPagesRouter', staticPagesRouter);

        _.each(routerSettings.taxonomies, (value, key) => {
            const taxonomyRouter = new TaxonomyRouter(key, value, RESOURCE_CONFIG, this.routerCreated.bind(this));
            this.siteRouter.mountRouter(taxonomyRouter.router());

            this.registry.setRouter(taxonomyRouter.identifier, taxonomyRouter);
        });

        const appRouter = new ParentRouter('AppsRouter');
        this.siteRouter.mountRouter(appRouter.router());

        this.registry.setRouter('appRouter', appRouter);

        debug('Routes:', this.registry.getAllRoutes());
    }

    /**
     * This is a glue code to keep the implementation of routers away from
     * this sort of logic. Ideally this method should not be ever called
     * and handled completely on the URL Service layer without touching the frontend
     * @param {Object} settingModel instance of the settings model
     * @returns {void}
     */
    handleTimezoneEdit(settingModel) {
        const newTimezone = settingModel.attributes.value;
        const previousTimezone = settingModel._previousAttributes.value;

        if (newTimezone === previousTimezone) {
            return;
        }

        /**
         * CASE: timezone changes
         *
         * If your permalink contains a date reference, we have to regenerate the urls.
         *
         * e.g. /:year/:month/:day/:slug/ or /:day/:slug/
         */

        // NOTE: timezone change only affects the collection router with dated permalinks
        const collectionRouter = this.registry.getRouterByName('CollectionRouter');
        if (collectionRouter && collectionRouter.getPermalinks().getValue().match(/:year|:month|:day/)) {
            debug('handleTimezoneEdit: trigger regeneration');

            this.urlService.onRouterUpdated(collectionRouter.identifier);
        }
    }
}

module.exports = RouterManager;

/**
 * @typedef {Object} RouterConfig
 * @property {RouteSettings} [routeSettings] - JSON config representing routes
 * @property {URLService} urlService - service providing resource URL utility functions such as owns, getUrlByResourceId, and getResourceById
 */

/**
 * @typedef {Object} RouteSettings
 * @property {Object} routes
 * @property {Object} collections
 * @property {Object} taxonomies
 */

/**
 * @typedef {Object} URLService
 * @property {Function} owns
 * @property {Function} getUrlByResourceId
 * @property {Function} getResourceById
 * @property {Function} onRouterAddedType
 * @property {Function} onRouterUpdated
 */
