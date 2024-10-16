const express = require('../../../shared/express');
const api = require('../../api').endpoints;
const {http} = require('@tryghost/api-framework');
const shared = require('../shared');

const bodyParser = require('body-parser');

/**
 * @returns {import('express').Router}
 */
module.exports = function apiRoutes() {
    const router = express.Router('webmentions');

    // shouldn't be cached
    router.use(shared.middleware.cacheControl('private'));

    // rate limiter
    router.use(shared.middleware.brute.webmentionsLimiter);

    // Webmentions
    router.post('/receive', bodyParser.urlencoded({extended: true, limit: '5mb'}), http(api.mentions.receive));

    return router;
};
