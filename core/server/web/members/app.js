const debug = require('ghost-ignition').debug('web:members:app');
const {URL} = require('url');
const cors = require('cors');
const express = require('../../../shared/express');
const urlUtils = require('../../lib/url-utils');
const membersService = require('../../services/members');
const middleware = membersService.middleware;
const shared = require('../shared');

module.exports = function setupMembersApp() {
    debug('Members App setup start');
    const membersApp = express();

    // Entire app is behind labs flag
    membersApp.use(shared.middlewares.labs.members);

    // Support CORS for requests from the frontend
    const siteUrl = new URL(urlUtils.getSiteUrl());
    membersApp.use(cors(siteUrl.origin));

    // Currently global handling for signing in with ?token= magiclinks
    membersApp.use(middleware.createSessionFromMagicLink);

    // Routing
    // Initializes members specific routes as well as assigns members specific data to the req/res objects
    membersApp.get('/ssr/member', shared.middlewares.labs.members, middleware.getMemberData);
    membersApp.get('/ssr', shared.middlewares.labs.members, middleware.getIdentityToken);
    membersApp.delete('/ssr', shared.middlewares.labs.members, middleware.deleteSession);
    membersApp.post('/webhooks/stripe', shared.middlewares.labs.members, middleware.stripeWebhooks);

    // NOTE: this is wrapped in a function to ensure we always go via the getter
    membersApp.post('/api/send-magic-link', (req, res, next) => membersService.api.middleware.sendMagicLink(req, res, next));
    membersApp.post('/api/create-stripe-checkout-session', (req, res, next) => membersService.api.middleware.createCheckoutSession(req, res, next));
    membersApp.post('/api/create-stripe-setup-session', (req, res, next) => membersService.api.middleware.createCheckoutSetupSession(req, res, next));
    membersApp.put('/api/subscriptions/:id', (req, res, next) => membersService.api.middleware.updateSubscription(req, res, next));

    // API error handling
    membersApp.use(shared.middlewares.errorHandler.resourceNotFound);
    membersApp.use(shared.middlewares.errorHandler.handleJSONResponseV2);

    debug('Members App setup end');

    return membersApp;
};
