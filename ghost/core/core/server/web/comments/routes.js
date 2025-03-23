const express = require('../../../shared/express');
const config = require('../../../shared/config');
const api = require('../../api').endpoints;
const {http} = require('@tryghost/api-framework');
const shared = require('../shared');

const bodyParser = require('body-parser');
const membersService = require('../../../server/services/members');

/**
 * @returns {import('express').Router}
 */
module.exports = function apiRoutes() {
    const router = express.Router('comment api');
    router.use(bodyParser.json({limit: '50mb'}));

    const countsCache = shared.middleware.cacheControl(
        'public',
        {maxAge: config.get('caching:commentsCountAPI:maxAge')}
    );
    router.get('/counts', countsCache, http(api.commentsMembers.counts));

    // Authenticated Routes
    router.use(membersService.middleware.loadMemberSession);

    router.get('/', http(api.commentsMembers.browse));
    router.get('/post/:post_id', http(api.commentsMembers.browse));
    router.get('/:id', http(api.commentsMembers.read));
    router.post('/', http(api.commentsMembers.add));
    router.put('/:id', http(api.commentsMembers.edit));
    router.delete('/:id', http(api.commentsMembers.destroy));

    router.post('/:id/like', http(api.commentsMembers.like));
    router.delete('/:id/like', http(api.commentsMembers.unlike));
    router.get('/:id/replies', http(api.commentsMembers.replies));

    router.post('/:id/report', http(api.commentsMembers.report));

    return router;
};
