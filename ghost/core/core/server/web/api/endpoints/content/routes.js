const express = require('../../../../../shared/express');
const cors = require('cors');
const api = require('../../../../api').endpoints;
const {http} = require('@tryghost/api-framework');
const mw = require('./middleware');
const config = require('../../../../../shared/config');

module.exports = function apiRoutes() {
    const router = express.Router('content api');

    router.use(cors({maxAge: config.get('caching:cors:maxAge')}));

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

    // ## Members
    router.get('/newsletters', mw.authenticatePublic, http(api.newslettersPublic.browse));
    router.get('/tiers', mw.authenticatePublic, http(api.tiersPublic.browse));
    router.get('/offers/:id', mw.authenticatePublic, http(api.offersPublic.read));

    router.get('/collections/:id', mw.authenticatePublic, http(api.collectionsPublic.readById));
    router.get('/collections/slug/:slug', mw.authenticatePublic, http(api.collectionsPublic.readBySlug));

    // ## Recommendations
    router.get('/recommendations', mw.authenticatePublic, http(api.recommendationsPublic.browse));

    return router;
};
