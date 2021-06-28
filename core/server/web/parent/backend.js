const debug = require('@tryghost/debug')('web:backend');
const express = require('../../../shared/express');

/**
 *
 * @returns {import('express').RequestHandler}
 */
module.exports = () => {
    debug('BackendApp setup start');
    // BACKEND
    // Wrap the admin and API apps into a single express app for use with vhost
    const backendApp = express('backend');
    backendApp.use('/ghost/api', require('../api')());
    backendApp.use('/ghost/oauth', require('../oauth')());
    backendApp.use('/ghost/.well-known', require('../well-known')());
    backendApp.use('/ghost', require('../../services/auth/session').createSessionFromToken, require('../admin')());

    return backendApp;
};
