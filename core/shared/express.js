const express = require('express');
const sentry = require('./sentry');

module.exports = () => {
    const app = express();

    // Make sure 'req.secure' is valid for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    // NB: required here because it's not passed down via vhost
    app.enable('trust proxy');

    // Sentry must be our first error handler. Mounting it here means all custom error handlers will come after
    app.use(sentry.errorHandler);

    return app;
};
