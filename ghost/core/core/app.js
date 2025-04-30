const sentry = require('./shared/sentry');
const express = require('./shared/express');
const config = require('./shared/config');
const logging = require('@tryghost/logging');
const urlService = require('./server/services/url');

const fs = require('fs');
const path = require('path');

const isMaintenanceModeEnabled = (req) => {
    if (req.app.get('maintenance') || config.get('maintenance').enabled || !urlService.hasFinished()) {
        return true;
    }

    return false;
};

// We never want middleware functions to be anonymous
const maintenanceMiddleware = function maintenanceMiddleware(req, res, next) {
    if (!isMaintenanceModeEnabled(req)) {
        return next();
    }

    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });
    res.writeHead(503, {'content-type': 'text/html'});
    fs.createReadStream(path.resolve(__dirname, './server/views/maintenance.html')).pipe(res);
};

// Used by Ghost (Pro) to ensure that requests cannot be served by the wrong site
const siteIdMiddleware = function siteIdMiddleware(req, res, next) {
    const configSiteId = config.get('hostSettings:siteId');
    const headerSiteId = req.headers['x-site-id'];

    if (`${configSiteId}` === `${headerSiteId}`) {
        return next();
    }

    logging.warn(`Mismatched site id (expected ${configSiteId}, got ${headerSiteId})`);

    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });
    res.writeHead(500);
    res.end();
};

const rootApp = () => {
    const app = express('root');
    app.use(sentry.requestHandler);
    if (config.get('sentry')?.tracing?.enabled === true) {
        app.use(sentry.tracingHandler);
    }
    if (config.get('hostSettings:siteId')) {
        app.use(siteIdMiddleware);
    }
    app.enable('maintenance');
    app.use(maintenanceMiddleware);

    return app;
};

module.exports = rootApp;
