const debug = require('ghost-ignition').debug('services:routing:bootstrap');
const _ = require('lodash');
const {events} = require('../../../server/lib/common');
const settingsService = require('../settings');
const StaticRoutesRouter = require('./StaticRoutesRouter');
const StaticPagesRouter = require('./StaticPagesRouter');
const CollectionRouter = require('./CollectionRouter');
const TaxonomyRouter = require('./TaxonomyRouter');
const PreviewRouter = require('./PreviewRouter');
const ParentRouter = require('./ParentRouter');
const UnsubscribeRouter = require('./UnsubscribeRouter');

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
 *   - if you upload your routes.yaml in the admin client, we will re-initialise routing
 *   -
 *
 * @param {Object} options
 * @returns {ExpressRouter}
 */
module.exports.init = (options = {start: false}) => {
    debug('bootstrap');

    registry.resetAllRouters();
    registry.resetAllRoutes();

    events.emit('routers.reset');

    siteRouter = new ParentRouter('SiteRouter');
    registry.setRouter('siteRouter', siteRouter);

    if (options.start) {
        let apiVersion = _.isBoolean(options.start) ? defaultApiVersion : options.start;
        this.start(apiVersion);
    }

    return siteRouter.router();
};

/**
 * @description This function will create the routers based on the routes.yaml config.
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
 */
module.exports.start = (apiVersion) => {
    const RESOURCE_CONFIG = require(`./config/${apiVersion}`);

    const unsubscribeRouter = new UnsubscribeRouter();
    siteRouter.mountRouter(unsubscribeRouter.router());
    registry.setRouter('unsubscribeRouter', unsubscribeRouter);

    const previewRouter = new PreviewRouter(RESOURCE_CONFIG);
    siteRouter.mountRouter(previewRouter.router());
    registry.setRouter('previewRouter', previewRouter);

    // NOTE: Get the routes.yaml config
    const dynamicRoutes = settingsService.get('routes');

    _.each(dynamicRoutes.routes, (value, key) => {
        const staticRoutesRouter = new StaticRoutesRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(staticRoutesRouter.router());

        registry.setRouter(staticRoutesRouter.identifier, staticRoutesRouter);
    });

    _.each(dynamicRoutes.collections, (value, key) => {
        const collectionRouter = new CollectionRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(collectionRouter.router());
        registry.setRouter(collectionRouter.identifier, collectionRouter);
    });

    const staticPagesRouter = new StaticPagesRouter(RESOURCE_CONFIG);
    siteRouter.mountRouter(staticPagesRouter.router());

    registry.setRouter('staticPagesRouter', staticPagesRouter);

    _.each(dynamicRoutes.taxonomies, (value, key) => {
        const taxonomyRouter = new TaxonomyRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(taxonomyRouter.router());

        registry.setRouter(taxonomyRouter.identifier, taxonomyRouter);
    });

    const appRouter = new ParentRouter('AppsRouter');
    siteRouter.mountRouter(appRouter.router());

    registry.setRouter('appRouter', appRouter);

    debug('Routes:', registry.getAllRoutes());
};
