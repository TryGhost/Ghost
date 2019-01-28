const debug = require('ghost-ignition').debug('services:routing:bootstrap');
const _ = require('lodash');
const common = require('../../lib/common');
const settingsService = require('../settings');
const themeService = require('../themes');
const StaticRoutesRouter = require('./StaticRoutesRouter');
const StaticPagesRouter = require('./StaticPagesRouter');
const CollectionRouter = require('./CollectionRouter');
const TaxonomyRouter = require('./TaxonomyRouter');
const PreviewRouter = require('./PreviewRouter');
const ParentRouter = require('./ParentRouter');

const registry = require('./registry');
let siteRouter;

module.exports.init = (options = {start: false}) => {
    debug('bootstrap');

    registry.resetAllRouters();
    registry.resetAllRoutes();

    common.events.emit('routers.reset');

    siteRouter = new ParentRouter('SiteRouter');
    registry.setRouter('siteRouter', siteRouter);

    if (options.start) {
        this.start();
    }

    return siteRouter.router();
};

/**
 * Create a set of default and dynamic routers defined in the routing yaml.
 *
 * @TODO:
 *   - is the PreviewRouter an app?
 */
module.exports.start = () => {
    const apiVersion = themeService.getApiVersion();
    const RESOURCE_CONFIG = require(`../../services/routing/config/${apiVersion}`);

    const previewRouter = new PreviewRouter(RESOURCE_CONFIG);

    siteRouter.mountRouter(previewRouter.router());
    registry.setRouter('previewRouter', previewRouter);

    const dynamicRoutes = settingsService.get('routes');

    _.each(dynamicRoutes.routes, (value, key) => {
        const staticRoutesRouter = new StaticRoutesRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(staticRoutesRouter.router());

        registry.setRouter(staticRoutesRouter.identifier, staticRoutesRouter);
    });

    _.each(dynamicRoutes.taxonomies, (value, key) => {
        const taxonomyRouter = new TaxonomyRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(taxonomyRouter.router());

        registry.setRouter(taxonomyRouter.identifier, taxonomyRouter);
    });

    _.each(dynamicRoutes.collections, (value, key) => {
        const collectionRouter = new CollectionRouter(key, value, RESOURCE_CONFIG);
        siteRouter.mountRouter(collectionRouter.router());
        registry.setRouter(collectionRouter.identifier, collectionRouter);
    });

    const staticPagesRouter = new StaticPagesRouter(RESOURCE_CONFIG);
    siteRouter.mountRouter(staticPagesRouter.router());

    registry.setRouter('staticPagesRouter', staticPagesRouter);

    const appRouter = new ParentRouter('AppsRouter');
    siteRouter.mountRouter(appRouter.router());

    registry.setRouter('appRouter', appRouter);

    debug('Routes:', registry.getAllRoutes());
};
