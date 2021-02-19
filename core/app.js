const sentry = require('./shared/sentry');
const express = require('./shared/express');

const fs = require('fs');
const path = require('path');

// We never want middleware functions to be anonymous
const maintenanceMiddleware = (req, res, next) => {
    if (!req.app.get('maintenance')) {
        return next();
    }
    res.set({
        'Cache-Control': 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0'
    });
    res.writeHead(503, {'content-type': 'text/html'});
    fs.createReadStream(path.resolve(__dirname, './server/views/maintenance.html')).pipe(res);
};

const rootApp = express('root');
rootApp.use(sentry.requestHandler);

rootApp.enable('maintenance');
rootApp.use(maintenanceMiddleware);

module.exports = rootApp;
