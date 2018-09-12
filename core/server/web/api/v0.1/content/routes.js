const express = require('express'),
    // This essentially provides the controllers for the routes
    api = require('../../api'),

    // Middleware
    mw = require('./middleware'),

    // API specific
    auth = require('../../services/auth'),
    cors = require('../middleware/api/cors'),
    brute = require('../middleware/brute'),

    // Handling uploads & imports
    tmpdir = require('os').tmpdir,
    upload = require('multer')({dest: tmpdir()}),
    validation = require('../middleware/validation'),

    // Temporary
    // @TODO find a more appy way to do this!
    labs = require('../middleware/labs');

module.exports = function apiRoutes() {
    const router = express.Router();

    // alias delete with del
    router.del = router.delete;

    // ## CORS pre-flight check
    router.options('*', cors);

    // ## Configuration
    router.get('/configuration', api.http(api.configuration.read));

    // ## Posts
    router.get('/posts', mw.authenticatePublic, api.http(api.posts.browse));

    router.get('/posts/:id', mw.authenticatePublic, api.http(api.posts.read));
    router.get('/posts/slug/:slug', mw.authenticatePublic, api.http(api.posts.read));

    // ## Schedules
    router.put('/schedules/posts/:id', [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser
    ], api.http(api.schedules.publishPost));

    // ## Users
    router.get('/users', mw.authenticatePublic, api.http(api.users.browse));
    router.get('/users/:id', mw.authenticatePublic, api.http(api.users.read));
    router.get('/users/slug/:slug', mw.authenticatePublic, api.http(api.users.read));

    // ## Tags
    router.get('/tags', mw.authenticatePublic, api.http(api.tags.browse));
    router.get('/tags/:id', mw.authenticatePublic, api.http(api.tags.read));
    router.get('/tags/slug/:slug', mw.authenticatePublic, api.http(api.tags.read));

    // ## Subscribers
    router.post('/subscribers/csv',
        labs.subscribers,
        upload.single('subscribersfile'),
        validation.upload({type: 'subscribers'}),
        api.http(api.subscribers.importCSV)
    );
    router.post('/subscribers', labs.subscribers, mw.authenticatePublic, api.http(api.subscribers.add));

    // ## Clients
    router.get('/clients/slug/:slug', api.http(api.clients.read));

    // ## Authentication
    router.post('/authentication/passwordreset',
        brute.globalReset,
        brute.userReset,
        api.http(api.authentication.generateResetToken)
    );
    router.put('/authentication/passwordreset', brute.globalBlock, api.http(api.authentication.resetPassword));
    router.post('/authentication/invitation', api.http(api.authentication.acceptInvitation));
    router.get('/authentication/invitation', api.http(api.authentication.isInvitation));
    router.post('/authentication/setup', api.http(api.authentication.setup));
    router.get('/authentication/setup', api.http(api.authentication.isSetup));

    router.post('/authentication/token',
        mw.authenticateClient(),
        brute.globalBlock,
        brute.userLogin,
        auth.oauth.generateAccessToken
    );

    router.post('/db/backup', mw.authenticateClient('Ghost Backup'), api.http(api.db.backupContent));

    return router;
};
