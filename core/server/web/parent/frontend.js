const debug = require('@tryghost/debug')('frontend');
const express = require('../../../shared/express');

const shared = require('../shared');

/**
 *
 * @param {object} options
 * @returns {import('express').RequestHandler}
 */
module.exports = (options) => {
    debug('FrontendApp setup start', options);

    // FRONTEND
    const frontendApp = express('frontend');

    // Force SSL if blog url is set to https. The redirects handling must happen before asset and page routing,
    // otherwise we serve assets/pages with http. This can cause mixed content warnings in the admin client.
    frontendApp.use(shared.middleware.urlRedirects.frontendSSLRedirect);

    frontendApp.lazyUse('/members', require('../members'));
    frontendApp.use('/', require('../../../frontend/web')(options));

    return frontendApp;
};
