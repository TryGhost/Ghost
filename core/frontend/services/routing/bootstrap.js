const debug = require('@tryghost/debug')('routing');
const _ = require('lodash');
const StaticRoutesRouter = require('./StaticRoutesRouter');
const StaticPagesRouter = require('./StaticPagesRouter');
const CollectionRouter = require('./CollectionRouter');
const TaxonomyRouter = require('./TaxonomyRouter');
const PreviewRouter = require('./PreviewRouter');
const ParentRouter = require('./ParentRouter');
const EmailRouter = require('./EmailRouter');
const UnsubscribeRouter = require('./UnsubscribeRouter');

const labs = require('../../../shared/labs');
// This emits its own routing events
const events = require('../../../server/lib/common/events');

const defaultApiVersion = 'v4';

const registry = require('./registry');
let siteRouter;

/**
 * @description The `init` function will return the wrapped parent express router and will start creating all
 *              routers if you pass the option "start: true".
 *
 * CASES:
 *   - if Ghost starts, it will first init the site app with the wrapper router and then call `start`
 *     separately, because it could be that your blog goes into maintenance mode
 *   - if you change your route settings, we will re-initialise routing
 *
 * @param {Object} options
 * @returns {ExpressRouter}
 */
module.exports.init = ({start = false, routerSettings, apiVersion}) => {
    debug('bootstrap init', start, apiVersion, routerSettings);

    registry.resetAllRouters();
    registry.resetAllRoutes();

    events.emit('routers.reset');

    siteRouter = new ParentRouter('SiteRouter');
    registry.setRouter('siteRouter', siteRouter);

    if (start) {
        apiVersion = apiVersion || defaultApiVersion;
        this.start(apiVersion, routerSettings);
    }

    return siteRouter.router();
};

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
 * @param {string} apiVersion
 * @param {object} routerSettings
 */
module.exports.start = (apiVersion, routerSettings) => {
    debug('bootstrap start', apiVersion, routerSettings);
    const RESOURCE_CONFIG = require(`./config/${apiVersion}`);

    const unsubscribeRouter = new UnsubscribeRouter();
    siteRouter.mountRouter(unsubscribeRouter.router());
    registry.setRouter('unsubscribeRouter', unsubscribeRouter);

    if (labs.isSet('emailOnlyPosts')) {
        const emailRouter = new EmailRouter(RESOURCE_CONFIG);
        siteRouter.mountRouter(emailRouter.router());
        registry.setRouter('emailRouter', emailRouter);
    }

    const previewRouter = new PreviewRouter(RESOURCE_CONFIG);
    siteRouter.mountRouter(previewRouter.router());
    registry.setRouter('previewRouter', previewRouter);

    _.each(routerSettings.routes, (value, key) => {
        const staticRoutesRouter = new StaticRoutesRouter(key, value);
        siteRouter.mountRouter(staticRoutesRouter.router());

        registry.setRouter(staticRoutesRouter.identifier, staticRoutesRouter);
    });

    _.each(routerSettings.collections, (value, key) => {
        const collectionRouter = new CollectionRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(collectionRouter.router());
        registry.setRouter(collectionRouter.identifier, collectionRouter);
    });

    const staticPagesRouter = new StaticPagesRouter(RESOURCE_CONFIG);
    siteRouter.mountRouter(staticPagesRouter.router());

    registry.setRouter('staticPagesRouter', staticPagesRouter);

    _.each(routerSettings.taxonomies, (value, key) => {
        const taxonomyRouter = new TaxonomyRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(taxonomyRouter.router());

        registry.setRouter(taxonomyRouter.identifier, taxonomyRouter);
    });

    const appRouter = new ParentRouter('AppsRouter');
    siteRouter.mountRouter(appRouter.router());

    registry.setRouter('appRouter', appRouter);

    debug('Routes:', registry.getAllRoutes());
};
