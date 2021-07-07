const express = require('../../../../../shared/express');
const cors = require('cors');
const api = require('../../../../api').canary;
const mw = require('./middleware');

module.exports = function apiRoutes() {
    const router = express.Router('canary content');

    router.use(cors());

    const http = api.http;

    // ## Posts
    router.get('/posts', mw.authenticatePublic, http(api.postsPublic.browse));
    router.get('/posts/:id', mw.authenticatePublic, http(api.postsPublic.read));
    router.get('/posts/slug/:slug', mw.authenticatePublic, http(api.postsPublic.read));

    // ## Pages
    router.get('/pages', mw.authenticatePublic, http(api.pagesPublic.browse));
    router.get('/pages/:id', mw.authenticatePublic, http(api.pagesPublic.read));
    router.get('/pages/slug/:slug', mw.authenticatePublic, http(api.pagesPublic.read));

    // ## Users
    router.get('/authors', mw.authenticatePublic, http(api.authorsPublic.browse));
    router.get('/authors/:id', mw.authenticatePublic, http(api.authorsPublic.read));
    router.get('/authors/slug/:slug', mw.authenticatePublic, http(api.authorsPublic.read));

    // ## Tags
    router.get('/tags', mw.authenticatePublic, http(api.tagsPublic.browse));
    router.get('/tags/:id', mw.authenticatePublic, http(api.tagsPublic.read));
    router.get('/tags/slug/:slug', mw.authenticatePublic, http(api.tagsPublic.read));

    // ## Settings
    router.get('/settings', mw.authenticatePublic, http(api.publicSettings.browse));

    router.get('/products', mw.authenticatePublic, http(api.productsPublic.browse));

    return router;
};
