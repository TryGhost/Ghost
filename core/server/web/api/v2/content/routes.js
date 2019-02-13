const express = require('express');
const cors = require('cors');
const apiv2 = require('../../../../api/v2');
const mw = require('./middleware');

module.exports = function apiRoutes() {
    const router = express.Router();

    router.options('*', cors());

    const http = apiImpl => apiv2.http(apiImpl, 'content');

    // ## Posts
    router.get('/posts', mw.authenticatePublic, http(apiv2.posts.browse));
    router.get('/posts/:id', mw.authenticatePublic, http(apiv2.posts.read));
    router.get('/posts/slug/:slug', mw.authenticatePublic, http(apiv2.posts.read));

    // ## Pages
    router.get('/pages', mw.authenticatePublic, http(apiv2.pages.browse));
    router.get('/pages/:id', mw.authenticatePublic, http(apiv2.pages.read));
    router.get('/pages/slug/:slug', mw.authenticatePublic, http(apiv2.pages.read));

    // ## Users
    router.get('/authors', mw.authenticatePublic, http(apiv2.authors.browse));
    router.get('/authors/:id', mw.authenticatePublic, http(apiv2.authors.read));
    router.get('/authors/slug/:slug', mw.authenticatePublic, http(apiv2.authors.read));

    // ## Tags
    router.get('/tags', mw.authenticatePublic, http(apiv2.tagsPublic.browse));
    router.get('/tags/:id', mw.authenticatePublic, http(apiv2.tagsPublic.read));
    router.get('/tags/slug/:slug', mw.authenticatePublic, http(apiv2.tagsPublic.read));

    // ## Settings
    router.get('/settings', mw.authenticatePublic, http(apiv2.publicSettings.browse));

    return router;
};
