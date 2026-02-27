const debug = require('@tryghost/debug')('web:backend');
const express = require('../../../shared/express');
const bodyParser = require('body-parser');
const {BASE_API_PATH} = require('../../../shared/url-utils');

/**
 *
 * @returns {import('express').Application}
 */
module.exports = () => {
    debug('BackendApp setup start');
    // BACKEND
    // Wrap the admin and API apps into a single express app for use with vhost
    const backendApp = express('backend');

    backendApp.lazyUse(BASE_API_PATH, require('../api'));
    backendApp.lazyUse('/ghost/.well-known', require('../well-known'));

    // AT Proto OAuth endpoints for staff (must be before admin auth)
    const atprotoStaffMiddleware = require('../../services/atproto-oauth/staff-middleware');
    backendApp.post('/ghost/api/admin/atproto/authorize', bodyParser.json(), atprotoStaffMiddleware.authorize);
    backendApp.get('/ghost/api/admin/atproto/callback', atprotoStaffMiddleware.callback);

    backendApp.use('/ghost', require('../../services/auth/session').createSessionFromToken(), require('../admin')());

    return backendApp;
};
