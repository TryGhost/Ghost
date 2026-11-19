const auth = require('../../auth');
const membersService = require('../../services/members');

// Chosen once at load, as in auth/authenticate.ts
const isBetterAuth = auth.isBetterAuth;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'members_stripe_connect',
  auth: {
    headers: {
      cacheInvalidate: false,
    },
    permissions: true,
    options: ['mode'],
    validation: {
      options: {
        mode: {
          values: ['live', 'test'],
        },
      },
    },
    query(frame) {
      // This is something you have to do if you want to use the "framework" with access to the raw req/res
      frame.response = async function (req, res) {
        function setSessionProp(prop, val) {
          // Better Auth has no req.session
          if (isBetterAuth) {
            return auth.stripeConnectState.set(frame.options.context.user, val);
          }
          req.session[prop] = val;
        }
        const mode = frame.options.mode || 'live';
        const stripeConnectAuthURL = await membersService.stripeConnect.getStripeConnectOAuthUrl(
          setSessionProp,
          mode,
        );
        return res.redirect(stripeConnectAuthURL);
      };
    },
  },
};

module.exports = controller;
