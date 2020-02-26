const {URL} = require('url');
const debug = require('ghost-ignition').debug('web:canary:members:app');
const express = require('express');
const cors = require('cors');
const membersService = require('../../../../services/members');
const urlUtils = require('../../../../lib/url-utils');
const labs = require('../../../shared/middlewares/labs');
const shared = require('../../../shared');
const sentry = require('../../../../sentry');

module.exports = function setupMembersApiApp() {
    debug('Members API canary setup start');
    const apiApp = express();
    apiApp.use(sentry.requestHandler);

    // Make sure `req.ip` is correct for proxied requests
    // (X-Forwarded-Proto header will be checked, if present)
    apiApp.enable('trust proxy');

    // Entire app is behind labs flag
    apiApp.use(labs.members);

    // Support CORS for requests from the frontend
    const siteUrl = new URL(urlUtils.getSiteUrl());
    apiApp.use(cors(siteUrl.origin));

    // NOTE: this is wrapped in a function to ensure we always go via the getter
    apiApp.post('/send-magic-link', (req, res, next) => membersService.api.middleware.sendMagicLink(req, res, next));
    apiApp.post('/create-stripe-checkout-session', (req, res, next) => membersService.api.middleware.createCheckoutSession(req, res, next));
    apiApp.post('/create-stripe-setup-session', (req, res, next) => membersService.api.middleware.createCheckoutSetupSession(req, res, next));
    apiApp.put('/subscriptions/:id', (req, res, next) => membersService.api.middleware.updateSubscription(req, res, next));

    // API error handling
    apiApp.use(sentry.errorHandler);
    apiApp.use(shared.middlewares.errorHandler.resourceNotFound);
    apiApp.use(shared.middlewares.errorHandler.handleJSONResponseV2);

    debug('Members API canary setup end');

    return apiApp;
};
