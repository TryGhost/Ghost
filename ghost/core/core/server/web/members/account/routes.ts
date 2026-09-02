const express = require('../../../../shared/express');
const bodyParser = require('body-parser');
const config = require('../../../../shared/config');
const { http } = require('@tryghost/api-framework');
const api = require('../../../api').endpoints;
const middleware = require('../../../services/members/middleware');

/**
 * A member's own account, over HTTP.
 *
 * Everything reached by a signed-in member acting on their own record lives here,
 * so how these routes authenticate is a property of the module rather than a line
 * each one repeats. Establishing who is asking happens once; each route then says
 * what it wants done when there is nobody.
 *
 * Endpoints reached by someone who is not signed in stay outside this: the
 * unsubscribe links identify a member by a signed link, and changing an email
 * address by a token in the body, because in both cases the person following them
 * has no session.
 */
module.exports = function accountRoutes() {
  const router = express.Router('member-account');

  router.use(middleware.loadMemberIdentity);

  // Reading who you are. Answering with nothing when there is no member is the
  // right answer rather than a failure: a themed page asks this on every view.
  if (config.get('cacheMembersContent:enabled')) {
    router.get(
      '/',
      // Not for this route's benefit. This configuration stamps a cookie saying
      // what the reader is entitled to, so a cache can vary on it, and that needs
      // the member's subscriptions rather than only their identity. It rides here
      // because Portal asks this endpoint on every page load.
      middleware.loadMemberSession,
      middleware.accessInfoSession,
      middleware.emptyWhenAnonymous,
      http(api.membersAccount.read),
    );
  } else {
    router.get('/', middleware.emptyWhenAnonymous, http(api.membersAccount.read));
  }

  router.put(
    '/',
    bodyParser.json({ limit: '50mb' }),
    middleware.rejectWhenAnonymous,
    http(api.membersAccount.update),
  );

  // The fields a publisher has defined, which a member's client renders inputs
  // from. Under the account because a member reads them to fill in their own, and
  // refused to an unknown caller because what a publisher collects is their
  // configuration rather than something the site announces.
  router.get(
    '/metafields/:namespace',
    middleware.rejectWhenAnonymous,
    http(api.memberMetafieldsMembers.browse),
  );

  // Letting Ghost email this member again after it stopped.
  router.delete(
    '/suppression',
    middleware.rejectWhenAnonymous,
    http(api.membersAccount.destroySuppression),
  );

  return router;
};
