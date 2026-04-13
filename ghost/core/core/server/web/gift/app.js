const express = require('../../../shared/express');
const controller = require('./controller');

module.exports = function giftApp() {
    const app = express('gift');

    app.get('/:token/og-image', controller.giftImage);
    app.get('/:token', controller.giftPreview);

    return app;
};
