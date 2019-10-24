const debug = require('ghost-ignition').debug('web:parent');
const express = require('express');
const vhost = require('@tryghost/vhost-middleware');
const config = require('../config');
const compress = require('compression');
const netjet = require('netjet');
const shared = require('./shared');
const escapeRegExp = require('lodash.escaperegexp');
const {URL} = require('url');
const urlUtils = require('../lib/url-utils');
const storage = require('../adapters/storage');

const STATIC_IMAGE_URL_PREFIX = `/${urlUtils.STATIC_IMAGE_URL_PREFIX}`;

module.exports = function setupParentApp(options = {}) {
    debug('ParentApp setup start');
    const parentApp = express();

    // ## Global settings

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    parentApp.enable('trust proxy');

    parentApp.use(shared.middlewares.requestId);
    parentApp.use(shared.middlewares.logRequest);

    // Register event emmiter on req/res to trigger cache invalidation webhook event
    parentApp.use(shared.middlewares.emitEvents);

    // enabled gzip compression by default
    if (config.get('compress') !== false) {
        parentApp.use(compress());
    }

    // Preload link headers
    if (config.get('preloadHeaders')) {
        parentApp.use(netjet({
            cache: {
                max: config.get('preloadHeaders')
            }
        }));
    }

    // This sets global res.locals which are needed everywhere
    parentApp.use(shared.middlewares.ghostLocals);

    // Mount the  apps on the parentApp

    const adminHost = config.get('admin:url') ? (new URL(config.get('admin:url')).hostname) : '';
    const frontendHost = new URL(config.get('url')).hostname;
    const hasSeparateAdmin = adminHost && adminHost !== frontendHost;

    // Wrap the admin and API apps into a single express app for use with vhost
    const adminApp = express();
    adminApp.enable('trust proxy'); // required to respect x-forwarded-proto in admin requests
    adminApp.use('/ghost/api', require('./api')());
    adminApp.use('/ghost', require('./admin')());

    // TODO: remove {admin url}/content/* once we're sure the API is not returning relative asset URLs anywhere
    // only register this route if the admin is separate so we're not overriding the {site}/content/* route
    if (hasSeparateAdmin) {
        adminApp.use(
            STATIC_IMAGE_URL_PREFIX,
            [
                shared.middlewares.image.handleImageSizes,
                storage.getStorage().serve(),
                shared.middlewares.errorHandler.handleThemeResponse
            ]
        );
    }

    // ADMIN + API
    // with a separate admin url only serve on that host, otherwise serve on all hosts
    const adminVhostArg = hasSeparateAdmin && adminHost ? adminHost : /.*/;
    parentApp.use(vhost(adminVhostArg, adminApp));

    // BLOG
    // with a separate admin url we adjust the frontend vhost to exclude requests to that host, otherwise serve on all hosts
    const frontendVhostArg = (hasSeparateAdmin && adminHost) ?
        new RegExp(`^(?!${escapeRegExp(adminHost)}).*`) : /.*/;

    parentApp.use(vhost(frontendVhostArg, require('./site')(options)));

    debug('ParentApp setup end');

    return parentApp;
};
