const debug = require('@tryghost/debug')('web:backend');
const express = require('../../../shared/express');
const {BASE_API_PATH} = require('../../../shared/url-utils');

/**
 *
 * @returns {import('express').RequestHandler}
 */
module.exports = () => {
    debug('BackendApp setup start');
    // BACKEND
    // Wrap the admin and API apps into a single express app for use with vhost
    const backendApp = express('backend');

    backendApp.lazyUse(BASE_API_PATH, require('../api'));
    backendApp.lazyUse('/ghost/.well-known', require('../well-known'));

    backendApp.use('/ghost', require('../../services/auth/session').createSessionFromToken, require('../admin')());

    return backendApp;
};
