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
    const apiRouter = express.Router();

    // alias delete with del
    apiRouter.del = apiRouter.delete;

    // ## CORS pre-flight check
    apiRouter.options('*', cors);

    // ## Configuration
    apiRouter.get('/configuration', api.http(api.configuration.read));

    // ## Posts
    apiRouter.get('/posts', mw.authenticatePublic, api.http(api.posts.browse));

    apiRouter.get('/posts/:id', mw.authenticatePublic, api.http(api.posts.read));
    apiRouter.get('/posts/slug/:slug', mw.authenticatePublic, api.http(api.posts.read));

    // ## Schedules
    apiRouter.put('/schedules/posts/:id', [
        auth.authenticate.authenticateClient,
        auth.authenticate.authenticateUser
    ], api.http(api.schedules.publishPost));

    // ## Users
    apiRouter.get('/users', mw.authenticatePublic, api.http(api.users.browse));
    apiRouter.get('/users/:id', mw.authenticatePublic, api.http(api.users.read));
    apiRouter.get('/users/slug/:slug', mw.authenticatePublic, api.http(api.users.read));

    // ## Tags
    apiRouter.get('/tags', mw.authenticatePublic, api.http(api.tags.browse));
    apiRouter.get('/tags/:id', mw.authenticatePublic, api.http(api.tags.read));
    apiRouter.get('/tags/slug/:slug', mw.authenticatePublic, api.http(api.tags.read));

    // ## Subscribers
    apiRouter.post('/subscribers/csv',
        labs.subscribers,
        upload.single('subscribersfile'),
        validation.upload({type: 'subscribers'}),
        api.http(api.subscribers.importCSV)
    );
    apiRouter.post('/subscribers', labs.subscribers, mw.authenticatePublic, api.http(api.subscribers.add));

    // ## Clients
    apiRouter.get('/clients/slug/:slug', api.http(api.clients.read));

    // ## Authentication
    apiRouter.post('/authentication/passwordreset',
        brute.globalReset,
        brute.userReset,
        api.http(api.authentication.generateResetToken)
    );
    apiRouter.put('/authentication/passwordreset', brute.globalBlock, api.http(api.authentication.resetPassword));
    apiRouter.post('/authentication/invitation', api.http(api.authentication.acceptInvitation));
    apiRouter.get('/authentication/invitation', api.http(api.authentication.isInvitation));
    apiRouter.post('/authentication/setup', api.http(api.authentication.setup));
    apiRouter.get('/authentication/setup', api.http(api.authentication.isSetup));

    apiRouter.post('/authentication/token',
        mw.authenticateClient(),
        brute.globalBlock,
        brute.userLogin,
        auth.oauth.generateAccessToken
    );

    apiRouter.post('/db/backup', mw.authenticateClient('Ghost Backup'), api.http(api.db.backupContent));

    return apiRouter;
};
