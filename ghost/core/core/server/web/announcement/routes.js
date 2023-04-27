const express = require('../../../shared/express');
const api = require('../../api').endpoints;
const {http} = require('@tryghost/api-framework');
const shared = require('../shared');

module.exports = function apiRoutes() {
    const router = express.Router('announcements');

    // shouldn't be cached as it depends on member's context
    router.use(shared.middleware.cacheControl('private'));

    router.get('/', http(api.announcements.browse));

    return router;
};
