const express = require('../../../shared/express');
const api = require('../../api').endpoints;
const http = require('../../api').shared.http;

module.exports = function apiRoutes() {
    const router = express.Router('content api');

    router.get('/comments', http(api.commentsComments.browse));
    router.get('/comments/:id', http(api.commentsComments.read));
    router.post('/comments', http(api.commentsComments.add));
    router.put('/comments/:id', http(api.commentsComments.edit));
    router.delete('/comments/:id', http(api.commentsComments.destroy));

    return router;
};
