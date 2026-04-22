const express = require('../../../shared/express');
const errorHandler = require('@tryghost/mw-error-handler');
const sentry = require('../../../shared/sentry');
const controller = require('./controller');

module.exports = function giftPreviewApp() {
    const app = express('gift-preview');

    app.get('/:token/image', controller.giftPreviewImage);
    app.get('/:token', controller.giftPreview);

    app.use(errorHandler.pageNotFound);
    app.use(errorHandler.handleHTMLResponse(sentry));

    return app;
};
