const debug = require('@tryghost/debug')('members');
const cors = require('cors');
const bodyParser = require('body-parser');
const express = require('../../../shared/express');
const sentry = require('../../../shared/sentry');
const membersService = require('../../services/members');
const stripeService = require('../../services/stripe');
const middleware = membersService.middleware;
const shared = require('../shared');
const labs = require('../../../shared/labs');
const errorHandler = require('@tryghost/mw-error-handler');
const config = require('../../../shared/config');
const {http} = require('@tryghost/api-framework');
const api = require('../../api').endpoints;

const commentRouter = require('../comments');
const announcementRouter = require('../announcement');

module.exports = function setupMembersApp() {
    debug('Members App setup start');
    const membersApp = express('members');

    // Members API shouldn't be cached
    membersApp.use(shared.middleware.cacheControl('private'));

    // Support CORS for requests from the frontend
    membersApp.use(cors({maxAge: config.get('caching:cors:maxAge')}));

    // Currently global handling for signing in with ?token= magiclinks
    membersApp.use(middleware.createSessionFromMagicLink);

    // Routing

    // Webhooks
    membersApp.post('/webhooks/stripe', bodyParser.raw({type: 'application/json'}), stripeService.webhookController.handle.bind(stripeService.webhookController));

    // Initializes members specific routes as well as assigns members specific data to the req/res objects
    // We don't want to add global bodyParser middleware as that interferes with stripe webhook requests on - `/webhooks`.

    // Manage newsletter subscription via unsubscribe link
    membersApp.get('/api/member/newsletters', middleware.getMemberNewsletters);
    membersApp.put('/api/member/newsletters', bodyParser.json({limit: '50mb'}), middleware.updateMemberNewsletters);

    // Get and update member data
    membersApp.get('/api/member', middleware.getMemberData);
    membersApp.put('/api/member', bodyParser.json({limit: '50mb'}), middleware.updateMemberData);
    membersApp.post('/api/member/email', bodyParser.json({limit: '50mb'}), (req, res) => membersService.api.middleware.updateEmailAddress(req, res));

    // Remove email from suppression list
    membersApp.delete('/api/member/suppression', middleware.deleteSuppression);

    // Manage session
    membersApp.get('/api/session', middleware.getIdentityToken);
    membersApp.delete('/api/session', middleware.deleteSession);

    // NOTE: this is wrapped in a function to ensure we always go via the getter
    membersApp.post(
        '/api/send-magic-link',
        bodyParser.json(),
        // Prevent brute forcing email addresses (user enumeration)
        shared.middleware.brute.membersAuthEnumeration,
        // Prevent brute forcing passwords for the same email address
        shared.middleware.brute.membersAuth,
        (req, res, next) => membersService.api.middleware.sendMagicLink(req, res, next)
    );
    membersApp.post('/api/create-stripe-checkout-session', (req, res, next) => membersService.api.middleware.createCheckoutSession(req, res, next));
    membersApp.post('/api/create-stripe-update-session', (req, res, next) => membersService.api.middleware.createCheckoutSetupSession(req, res, next));
    membersApp.put('/api/subscriptions/:id', (req, res, next) => membersService.api.middleware.updateSubscription(req, res, next));

    // Comments
    membersApp.use('/api/comments', commentRouter());

    // Feedback
    membersApp.post(
        '/api/feedback',
        labs.enabledMiddleware('audienceFeedback'),
        bodyParser.json({limit: '50mb'}),
        middleware.loadMemberSession,
        middleware.authMemberByUuid,
        http(api.feedbackMembers.add)
    );

    // Announcement
    membersApp.use(
        '/api/announcement',
        labs.enabledMiddleware('announcementBar'),
        middleware.loadMemberSession,
        announcementRouter()
    );

    // API error handling
    membersApp.use('/api', errorHandler.resourceNotFound);
    membersApp.use('/api', errorHandler.handleJSONResponse(sentry));

    // Webhook error handling
    membersApp.use('/webhooks', errorHandler.resourceNotFound);
    membersApp.use('/webhooks', errorHandler.handleJSONResponse(sentry));

    debug('Members App setup end');

    return membersApp;
};
