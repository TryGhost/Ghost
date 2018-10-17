const express = require('express');
const api = require('../../../../api');
const apiv2 = require('../../../../api/v2');
const mw = require('./middleware');

module.exports = function apiRoutes() {
    const router = express.Router();

    // ## Configuration
    router.get('/configuration', api.http(api.configuration.read));

    // ## Posts
    router.get('/posts', mw.authenticatePublic, apiv2.http(apiv2.posts.browse));
    router.get('/posts/:id', mw.authenticatePublic, apiv2.http(apiv2.posts.read));
    router.get('/posts/slug/:slug', mw.authenticatePublic, apiv2.http(apiv2.posts.read));

    // ## Pages
    router.get('/pages', mw.authenticatePublic, apiv2.http(apiv2.pages.browse));
    router.get('/pages/:id', mw.authenticatePublic, apiv2.http(apiv2.pages.read));
    router.get('/pages/slug/:slug', mw.authenticatePublic, apiv2.http(apiv2.pages.read));

    // ## Users
    router.get('/users', mw.authenticatePublic, apiv2.http(apiv2.users.browse));
    router.get('/users/:id', mw.authenticatePublic, apiv2.http(apiv2.users.read));
    router.get('/users/slug/:slug', mw.authenticatePublic, apiv2.http(apiv2.users.read));

    // ## Tags
    router.get('/tags', mw.authenticatePublic, apiv2.http(apiv2.tags.browse));
    router.get('/tags/:id', mw.authenticatePublic, apiv2.http(apiv2.tags.read));
    router.get('/tags/slug/:slug', mw.authenticatePublic, apiv2.http(apiv2.tags.read));

    return router;
};
