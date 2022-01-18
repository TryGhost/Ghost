const debug = require('@tryghost/debug')('members');
const {URL} = require('url');
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('../../../shared/express');
const urlUtils = require('../../../shared/url-utils');
const sentry = require('../../../shared/sentry');
const membersService = require('../../services/members');
const stripeService = require('../../services/stripe');
const middleware = membersService.middleware;
const shared = require('../shared');
const labs = require('../../../shared/labs');
const errorHandler = require('@tryghost/mw-error-handler');

module.exports = function setupMembersApp() {
    debug('Members App setup start');
    const membersApp = express('members');

    // Members API shouldn't be cached
    membersApp.use(shared.middleware.cacheControl('private'));

    // Support CORS for requests from the frontend
    const siteUrl = new URL(urlUtils.getSiteUrl());
    membersApp.use(cors(siteUrl.origin));

    // Currently global handling for signing in with ?token= magiclinks
    membersApp.use(middleware.createSessionFromMagicLink);

    // Routing

    // Webhooks
    membersApp.post('/webhooks/stripe', bodyParser.raw({type: 'application/json'}), stripeService.webhookController.handle.bind(stripeService.webhookController));

    // Initializes members specific routes as well as assigns members specific data to the req/res objects
    // We don't want to add global bodyParser middleware as that interfers with stripe webhook requests on - `/webhooks`.
    membersApp.get('/api/member', middleware.getMemberData);
    membersApp.put('/api/member', bodyParser.json({limit: '1mb'}), middleware.updateMemberData);
    membersApp.post('/api/member/email', bodyParser.json({limit: '1mb'}), (req, res) => membersService.api.middleware.updateEmailAddress(req, res));
    membersApp.get('/api/session', middleware.getIdentityToken);
    membersApp.get('/api/offers/:id', middleware.getOfferData);
    membersApp.delete('/api/session', middleware.deleteSession);
    membersApp.get('/api/site', shared.middleware.cacheControl('public', {maxAge: 30}), middleware.getMemberSiteData);

    // NOTE: this is wrapped in a function to ensure we always go via the getter
    membersApp.post('/api/send-magic-link', bodyParser.json(), shared.middleware.brute.membersAuth, (req, res, next) => membersService.api.middleware.sendMagicLink(req, res, next));
    membersApp.post('/api/create-stripe-checkout-session', (req, res, next) => membersService.api.middleware.createCheckoutSession(req, res, next));
    membersApp.post('/api/create-stripe-update-session', (req, res, next) => membersService.api.middleware.createCheckoutSetupSession(req, res, next));
    membersApp.put('/api/subscriptions/:id', (req, res, next) => membersService.api.middleware.updateSubscription(req, res, next));
    membersApp.post('/api/events', labs.enabledMiddleware('membersActivity'), middleware.loadMemberSession, (req, res, next) => membersService.api.middleware.createEvents(req, res, next));

    // API error handling
    membersApp.use('/api', errorHandler.resourceNotFound);
    membersApp.use('/api', errorHandler.handleJSONResponseV2(sentry));

    // Webhook error handling
    membersApp.use('/webhooks', errorHandler.resourceNotFound);
    membersApp.use('/webhooks', errorHandler.handleJSONResponseV2(sentry));

    debug('Members App setup end');

    return membersApp;
};
