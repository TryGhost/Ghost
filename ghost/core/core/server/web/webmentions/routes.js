const express = require('../../../shared/express');
const api = require('../../api').endpoints;
const {http} = require('@tryghost/api-framework');
const shared = require('../shared');
const errorHandler = require('@tryghost/mw-error-handler');

const bodyParser = require('body-parser');

module.exports = function apiRoutes() {
    const router = express.Router('webmentions');

    // shouldn't be cached
    router.use(shared.middleware.cacheControl('private'));

    // rate limiter
    router.use(shared.middleware.mentionsLimiter.globalLimits);

    // Webmentions
    router.post('/receive', bodyParser.urlencoded({extended: true, limit: '5mb'}), http(api.mentions.receive));

    router.use(errorHandler.resourceNotFound);

    return router;
};
