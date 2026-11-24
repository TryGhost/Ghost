const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const auth = require('../../auth');
const membersService = require('../../services/members');
const urlUtils = require('../../../shared/url-utils').default;

/** Whether a request came from Ghost Admin's own pages. */
function isFromAdmin(req) {
  const fetchSite = req.get('sec-fetch-site');
  if (fetchSite) {
    // The Connect button is a link. A script or image on the site's public
    // pages is often same-origin too, but its request isn't a navigation.
    return (
      (fetchSite === 'same-origin' || fetchSite === 'none') &&
      req.get('sec-fetch-mode') === 'navigate'
    );
  }
  // Browsers without Fetch Metadata still say where a link was clicked.
  const adminOrigin = new URL(urlUtils.getAdminUrl() || urlUtils.getSiteUrl()).origin;
  return [req.get('origin'), req.get('referer')].some((value) => {
    try {
      return new URL(value).origin === adminOrigin;
    } catch {
      return false;
    }
  });
}

// Chosen once at load, as in auth/authenticate.ts
const isBetterAuth = auth.isBetterAuth;

const messages = {
  notFromAdmin: 'Start connecting Stripe from Ghost Admin.',
  sessionRequired: 'Connecting Stripe requires a signed-in staff session, not an API token.',
};

/**
 * Where the OAuth state goes: per user under Better Auth, else on the legacy
 * session, which a keyed request skips.
 */
function stateSetter(frame, req) {
  // Only Ghost Admin's own link may start a connection: another site
  // could otherwise reset the admin's connection in progress.
  if (!isFromAdmin(req)) {
    throw new errors.NoPermissionError({ message: tpl(messages.notFromAdmin) });
  }
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
