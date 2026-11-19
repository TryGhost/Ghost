const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const auth = require('../../auth');
const membersService = require('../../services/members');

// Chosen once at load, as in auth/authenticate.ts
const isBetterAuth = auth.isBetterAuth;

const messages = {
  sessionRequired: 'Connecting Stripe requires a signed-in staff session, not an API token.',
};

/**
 * Where the OAuth state goes: per user under Better Auth, else on the legacy
 * session, which a keyed request skips.
 */
function stateSetter(frame, req) {
  if (isBetterAuth) {
    return (_prop, val) => auth.stripeConnectState.set(frame.options.context.user, val);
  }
  if (!req.session) {
    throw new errors.NoPermissionError({ message: tpl(messages.sessionRequired) });
  }
  return (prop, val) => {
    req.session[prop] = val;
  };
}

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
      frame.response = async function (req, res, next) {
        try {
          const stripeConnectAuthURL = await membersService.stripeConnect.getStripeConnectOAuthUrl(
            stateSetter(frame, req),
            frame.options.mode || 'live',
          );
          return res.redirect(stripeConnectAuthURL);
        } catch (err) {
          return next(err);
        }
      };
    },
  },
};

module.exports = controller;
