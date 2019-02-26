const debug = require('ghost-ignition').debug('web:parent');
const express = require('express');
const config = require('../config');
const compress = require('compression');
const netjet = require('netjet');
const shared = require('./shared');
const labs = require('./shared/middlewares/labs');
const membersService = require('../services/members');

module.exports = function setupParentApp(options = {}) {
    debug('ParentApp setup start');
    const parentApp = express();

    // ## Global settings

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    parentApp.enable('trust proxy');

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

    // API
    // @TODO: finish refactoring the API app
    parentApp.use('/ghost/api', require('./api')());

    // ADMIN
    parentApp.use('/ghost', require('./admin')());

    // MEMBERS
    parentApp.use('/members', labs.members, membersService.api.staticRouter);

    // BLOG
    parentApp.use(require('./site')(options));

    debug('ParentApp setup end');

    return parentApp;
};
