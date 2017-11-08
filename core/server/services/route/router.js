var siteRouter = require('./site-router'),
    appRouter = require('./app-router'),
    channelService = require('../channels'),

    // Controllers
    controllers = require('../../controllers'),

    // Utils for creating paths
    // @TODO: refactor these away
    config = require('../../config'),
    utils = require('../../utils'),

    _private = {};

_private.mountDefaultRoutes = function mountDefaultRoutes() {
    // @TODO move this path out of this file!
    // Note this also exists in api/index.js
    var previewRoute = utils.url.urlJoin('/', config.get('routeKeywords').preview, ':uuid', ':options?');

    // Preview - register controller as route
    // Ideal version, as we don't want these paths all over the place
    // previewRoute = new Route('GET /:t_preview/:uuid/:options?', previewController);
    // siteRouter.mountRoute(previewRoute);
    // Orrrrr maybe preview should be an internal App??!
    siteRouter.mountRoute(previewRoute, controllers.preview);

    // Channels - register sub-router
    // The purpose of having a parentRouter for channels, is it can get reloaded if channels change.
    siteRouter.mountRouter(channelService.router());

    // Apps - register sub-router
    // The purpose of having a parentRouter for apps, is it can get reloaded if apps change.
    siteRouter.mountRouter(appRouter.router());

    // Default - register entry controller as route
    siteRouter.mountRoute('*', controllers.entry);
};

module.exports = function router() {
    _private.mountDefaultRoutes();

    return siteRouter.router();
};
