const debug = require('ghost-ignition').debug('web:parent');
const express = require('express');
const config = require('../config');
const compress = require('compression');
const netjet = require('netjet');
const shared = require('./shared');
const urlUtils = require('../services/url/utils');

module.exports = function setupParentApp(options = {}) {
    debug('ParentApp setup start');
    const parentApp = express();

    // ## Global settings

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    parentApp.enable('trust proxy');

    parentApp.use(shared.middlewares.logRequest);

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
    // API
    // @TODO: finish refactoring the API app
    parentApp.use(urlUtils.getApiPath({version: 'v0.1'}), require('./api/v0.1/app')());
    parentApp.use(urlUtils.getApiPath({version: 'v2', type: 'content'}), require('./api/v2/content/app')());
    parentApp.use(urlUtils.getApiPath({version: 'v2', type: 'admin'}), require('./api/v2/admin/app')());

    // ADMIN
    parentApp.use('/ghost', require('./admin')());

    // BLOG
    parentApp.use(require('./site')(options));

    debug('ParentApp setup end');

    return parentApp;
};
