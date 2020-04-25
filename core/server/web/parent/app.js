const debug = require('ghost-ignition').debug('web:parent');
const express = require('../../../shared/express');
const vhost = require('@tryghost/vhost-middleware');
const config = require('../../config');
const compress = require('compression');
const netjet = require('netjet');
const mw = require('./middleware');
const escapeRegExp = require('lodash.escaperegexp');
const {URL} = require('url');

module.exports = function setupParentApp(options = {}) {
    debug('ParentApp setup start');
    const parentApp = express();

    parentApp.use(mw.requestId);
    parentApp.use(mw.logRequest);

    // Register event emmiter on req/res to trigger cache invalidation webhook event
    parentApp.use(mw.emitEvents);

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
    // @TODO: figure out if this is really needed everywhere? Is it not frontend only...
    parentApp.use(mw.ghostLocals);

    // Mount the express apps on the parentApp

    const backendHost = config.get('admin:url') ? (new URL(config.get('admin:url')).hostname) : '';
    const frontendHost = new URL(config.get('url')).hostname;
    const hasSeparateBackendHost = backendHost && backendHost !== frontendHost;

    // Wrap the admin and API apps into a single express app for use with vhost
    const backendApp = express();
    backendApp.use('/ghost/api', require('../api')());
    backendApp.use('/ghost/.well-known', require('../well-known')());
    backendApp.use('/ghost', require('../../services/auth/session').createSessionFromToken, require('../admin')());

    // ADMIN + API
    // with a separate admin url only serve on that host, otherwise serve on all hosts
    const backendVhostArg = hasSeparateBackendHost && backendHost ? backendHost : /.*/;
    parentApp.use(vhost(backendVhostArg, backendApp));

    // BLOG
    // with a separate admin url we adjust the frontend vhost to exclude requests to that host, otherwise serve on all hosts
    const frontendVhostArg = (hasSeparateBackendHost && backendHost) ?
        new RegExp(`^(?!${escapeRegExp(backendHost)}).*`) : /.*/;

    parentApp.use(vhost(frontendVhostArg, require('../site')(options)));

    debug('ParentApp setup end');

    return parentApp;
};
