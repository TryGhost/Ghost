const debug = require('@tryghost/debug')('comments');
const errorHandler = require('@tryghost/mw-error-handler');
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
const sentry = require('../../../shared/sentry');
const routes = require('./routes');
const membersService = require('../../../server/services/members');

module.exports = function setupCommentsApp() {
    debug('Comments App setup start');
    const commentsApp = express('comments');

    // Support CORS for requests from the frontend
    const siteUrl = new URL(urlUtils.getSiteUrl());
    commentsApp.use(cors(siteUrl.origin));

    commentsApp.use(bodyParser.json({limit: '50mb'}));

    // Global handling for member session, ensures a member is logged in to the frontend
    commentsApp.use(membersService.middleware.loadMemberSession);

    // Routing
    commentsApp.use('/api/', routes());

    // API error handling
    commentsApp.use('/api', errorHandler.resourceNotFound);
    commentsApp.use('/api', errorHandler.handleJSONResponse(sentry));

    debug('Comments App setup end');

    return commentsApp;
};
