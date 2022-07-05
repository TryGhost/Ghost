const debug = require('@tryghost/debug')('comments');
const errorHandler = require('@tryghost/mw-error-handler');
const cors = require('cors');
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
const sentry = require('../../../shared/sentry');

module.exports = function setupCommentsApp() {
    debug('Comments App setup start');
    const commentsApp = express('comments');

    // Support CORS for requests from the frontend
    const siteUrl = new URL(urlUtils.getSiteUrl());
    commentsApp.use(cors(siteUrl.origin));

    // Routing
    commentsApp.get('/api/comments');

    // API error handling
    commentsApp.use('/api', errorHandler.resourceNotFound);
    commentsApp.use('/api', errorHandler.handleJSONResponse(sentry));

    debug('Comments App setup end');

    return commentsApp;
};
