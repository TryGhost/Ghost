const debug = require('ghost-ignition').debug('web:members:app');
const express = require('../../../shared/express');

const {middleware} = require('../../services/members');
const shared = require('../shared');

module.exports = function setupMembersApp() {
    debug('Members setup start');

    const membersApp = express();

    // Currently global handling for signing in with ?token= magiclinks
    membersApp.use(middleware.createSessionFromMagicLink);

    // Routing
    // Initializes members specific routes as well as assigns members specific data to the req/res objects
    membersApp.get('/ssr/member', shared.middlewares.labs.members, middleware.getMemberData);
    membersApp.get('/ssr', shared.middlewares.labs.members, middleware.getIdentityToken);
    membersApp.delete('/ssr', shared.middlewares.labs.members, middleware.deleteSession);
    membersApp.post('/webhooks/stripe', shared.middlewares.labs.members, middleware.stripeWebhooks);

    return membersApp;
};
