const debug = require('@tryghost/debug')('web:parent');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const compress = require('compression');
const mw = require('./middleware');
const vhost = require('@tryghost/vhost-middleware');
const vhostUtils = require('./vhost-utils');

module.exports = function setupParentApp(options = {}) {
    debug('ParentApp setup start');
    const parentApp = express('parent');

    parentApp.use(mw.requestId);
    parentApp.use(mw.logRequest);

    // Register event emmiter on req/res to trigger cache invalidation webhook event
    parentApp.use(mw.emitEvents);

    // enabled gzip compression by default
    if (config.get('compress') !== false) {
        parentApp.use(compress());
    }

    // This sets global res.locals which are needed everywhere
    // @TODO: figure out if this is really needed everywhere? Is it not frontend only...
    parentApp.use(mw.ghostLocals);

    // Mount the express apps on the parentApp

    // ADMIN + API
    const backendApp = require('./backend')();
    parentApp.use(vhost(vhostUtils.getBackendHostArg(), backendApp));

    // SITE + MEMBERS
    const frontendApp = require('./frontend')(options);
    parentApp.use(vhost(vhostUtils.getFrontendHostArg(), frontendApp));

    debug('ParentApp setup end');

    return parentApp;
};
