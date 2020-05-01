const express = require('../../../../../shared/express');
const cors = require('cors');
const apiCanary = require('../../../../api/canary');
const mw = require('./middleware');

module.exports = function apiRoutes() {
    const router = express.Router('canary content');

    router.use(cors());

    const http = apiCanary.http;

    // ## Posts
    router.get('/posts', mw.authenticatePublic, http(apiCanary.postsPublic.browse));
    router.get('/posts/:id', mw.authenticatePublic, http(apiCanary.postsPublic.read));
    router.get('/posts/slug/:slug', mw.authenticatePublic, http(apiCanary.postsPublic.read));

    // ## Pages
    router.get('/pages', mw.authenticatePublic, http(apiCanary.pagesPublic.browse));
    router.get('/pages/:id', mw.authenticatePublic, http(apiCanary.pagesPublic.read));
    router.get('/pages/slug/:slug', mw.authenticatePublic, http(apiCanary.pagesPublic.read));

    // ## Users
    router.get('/authors', mw.authenticatePublic, http(apiCanary.authorsPublic.browse));
    router.get('/authors/:id', mw.authenticatePublic, http(apiCanary.authorsPublic.read));
    router.get('/authors/slug/:slug', mw.authenticatePublic, http(apiCanary.authorsPublic.read));

    // ## Tags
    router.get('/tags', mw.authenticatePublic, http(apiCanary.tagsPublic.browse));
    router.get('/tags/:id', mw.authenticatePublic, http(apiCanary.tagsPublic.read));
    router.get('/tags/slug/:slug', mw.authenticatePublic, http(apiCanary.tagsPublic.read));

    // ## Settings
    router.get('/settings', mw.authenticatePublic, http(apiCanary.publicSettings.browse));

    return router;
};
