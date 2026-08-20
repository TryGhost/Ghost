const sentry = require('./shared/sentry');
const express = require('./shared/express');
const config = require('./shared/config');
const urlService = require('./server/services/url');
const {siteId: siteIdMiddleware} = require('./server/web/shared/middleware');
const fs = require('fs');
const path = require('path');
/** @import {Application as ExpressApplication, Request, RequestHandler} from 'express' */

/**
 * @param {Request} req
 * @returns {boolean}
 */
const isMaintenanceModeEnabled = (req) => {
    if (req.app.get('maintenance') || config.get('maintenance').enabled || !urlService.hasFinished()) {
        return true;
    }

    return false;
};

/** @type {RequestHandler} */
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

/** @returns {ExpressApplication} */
const rootApp = () => {
    const app = express('root');
    app.use(sentry.requestHandler);
    if (config.get('sentry')?.tracing?.enabled === true) {
        app.use(sentry.tracingHandler);
    }

    const siteId = config.get('hostSettings:siteId');
    if (siteId) {
        app.use(siteIdMiddleware(siteId));
    }

    app.enable('maintenance');
    app.use(maintenanceMiddleware);

    return app;
};

module.exports = rootApp;
