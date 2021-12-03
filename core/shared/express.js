const debug = require('@tryghost/debug')('shared:express');
const express = require('express');
const {createLazyRouter} = require('express-lazy-router');
const sentry = require('./sentry');

const lazyLoad = createLazyRouter();

module.exports = (name) => {
    debug('new app start', name);
    const app = express();
    app.set('name', name);

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    app.enable('trust proxy');

    // Sentry must be our first error handler. Mounting it here means all custom error handlers will come after
    app.use(sentry.errorHandler);

    app.lazyUse = function lazyUse(mountPath, requireFn) {
        app.use(mountPath, lazyLoad(() => {
            debug(`lazy-loading on ${mountPath}`);
            return Promise.resolve(requireFn());
        }));
    };

    debug('new app end', name);
    return app;
};

// Wrap the main express router call
// This is mostly an experiment, and can likely be removed soon
module.exports.Router = (name, options) => {
    debug('new Router start', name);
    const router = express.Router(options);

    router.use(sentry.errorHandler);

    debug('new Router end', name);
    return router;
};

module.exports.static = express.static;

// Export the OG module for testing based on the internals
module.exports._express = express;
