const debug = require('ghost-ignition').debug('web:members:app');
const {URL} = require('url');
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
const membersService = require('../../services/members');
const middleware = membersService.middleware;
const shared = require('../shared');

module.exports = function setupMembersApp() {
    debug('Members App setup start');
    const membersApp = express('members');

    // send 503 json response in case of maintenance
    membersApp.use(shared.middlewares.maintenance);

    // Entire app is behind labs flag
    membersApp.use(shared.middlewares.labs.members);

    // Support CORS for requests from the frontend
    const siteUrl = new URL(urlUtils.getSiteUrl());
    membersApp.use(cors(siteUrl.origin));

    // Currently global handling for signing in with ?token= magiclinks
    membersApp.use(middleware.createSessionFromMagicLink);

    // Routing

    // Webhooks
    membersApp.post('/webhooks/stripe', middleware.stripeWebhooks);

    // Initializes members specific routes as well as assigns members specific data to the req/res objects
    // We don't want to add global bodyParser middleware as that interfers with stripe webhook requests on - `/webhooks`.
    membersApp.get('/api/member', middleware.getMemberData);
    membersApp.put('/api/member', bodyParser.json({limit: '1mb'}), middleware.updateMemberData);
    membersApp.get('/api/session', middleware.getIdentityToken);
    membersApp.delete('/api/session', middleware.deleteSession);
    membersApp.get('/api/site', middleware.getMemberSiteData);

    // NOTE: this is wrapped in a function to ensure we always go via the getter
    membersApp.post('/api/send-magic-link', (req, res, next) => membersService.api.middleware.sendMagicLink(req, res, next));
    membersApp.post('/api/create-stripe-checkout-session', (req, res, next) => membersService.api.middleware.createCheckoutSession(req, res, next));
    membersApp.post('/api/create-stripe-update-session', (req, res, next) => membersService.api.middleware.createCheckoutSetupSession(req, res, next));
    membersApp.put('/api/subscriptions/:id', (req, res, next) => membersService.api.middleware.updateSubscription(req, res, next));

    // API error handling
    membersApp.use('/api', shared.middlewares.errorHandler.resourceNotFound);
    membersApp.use('/api', shared.middlewares.errorHandler.handleJSONResponseV2);

    // Webhook error handling
    membersApp.use('/webhooks', shared.middlewares.errorHandler.resourceNotFound);
    membersApp.use('/webhooks', shared.middlewares.errorHandler.handleJSONResponseV2);

    debug('Members App setup end');

    return membersApp;
};
