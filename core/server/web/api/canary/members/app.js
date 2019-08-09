const debug = require('ghost-ignition').debug('web:canary:members:app');
const express = require('express');
const membersService = require('../../../../services/members');
const labs = require('../../../shared/middlewares/labs');
const shared = require('../../../shared');

module.exports = function setupMembersApiApp() {
    debug('Members API canary setup start');
    const apiApp = express();

    // Entire app is behind labs flag
    apiApp.use(labs.members);

    // Set up the auth pages
    apiApp.use('/static/auth', membersService.authPages);

    // Set up the api endpoints and the gateway
    // NOTE: this is wrapped in a function to ensure we always go via the getter
    apiApp.use((req, res, next) => membersService.api(req, res, next));

    // API error handling
    apiApp.use(shared.middlewares.errorHandler.resourceNotFound);
    apiApp.use(shared.middlewares.errorHandler.handleJSONResponseV2);

    debug('Members API canary setup end');

    return apiApp;
};
