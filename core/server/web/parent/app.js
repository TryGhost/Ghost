const debug = require('@tryghost/debug')('web:parent');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const compress = require('compression');
const mw = require('./middleware');

module.exports = function setupParentApp() {
    debug('ParentApp setup start');
    const parentApp = express('parent');

    parentApp.use(mw.requestId);
    parentApp.use(mw.logRequest);

    // Register event emitter on req/res to trigger cache invalidation webhook event
    parentApp.use(mw.emitEvents);

    // enabled gzip compression by default
    if (config.get('compress') !== false) {
        parentApp.use(compress());
    }

    // This sets global res.locals which are needed everywhere
    // @TODO: figure out if this is really needed everywhere? Is it not frontend only...
    parentApp.use(mw.ghostLocals);

    debug('ParentApp setup end');

    return parentApp;
};
