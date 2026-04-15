const express = require('../../../shared/express');
const controller = require('./controller');

module.exports = function giftPreviewApp() {
    const app = express('gift-preview');

    app.get('/:token/image', controller.giftImage);
    app.get('/:token', controller.giftPreview);

    return app;
};
