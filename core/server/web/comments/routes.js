const express = require('../../../shared/express');
const api = require('../../api').endpoints;
const http = require('../../api').shared.http;

const bodyParser = require('body-parser');
const membersService = require('../../../server/services/members');

module.exports = function apiRoutes() {
    const router = express.Router('comment api');

    router.use(bodyParser.json({limit: '50mb'}));

    // Global handling for member session, ensures a member is logged in to the frontend
    router.use(membersService.middleware.loadMemberSession);

    router.get('/', http(api.commentsComments.browse));
    router.get('/:id', http(api.commentsComments.read));
    router.post('/', http(api.commentsComments.add));
    router.put('/:id', http(api.commentsComments.edit));
    router.delete('/:id', http(api.commentsComments.destroy));

    return router;
};
