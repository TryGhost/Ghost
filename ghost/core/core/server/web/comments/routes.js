const express = require('../../../shared/express');
const config = require('../../../shared/config');
const api = require('../../api').endpoints;
const { http } = require('@tryghost/api-framework');
const shared = require('../shared');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const bodyParser = require('body-parser');
const membersService = require('../../../server/services/members');
const privateSiteAccess = require('../../../shared/private-site-access');

const messages = {
  memberCommentingDisabled: 'Your commenting ability has been disabled.',
  privateSiteAccessRequired: 'Comment browsing is not available',
};

/**
 * Middleware to check if the member's commenting ability is disabled.
 * Uses can_comment property already computed from the session data.
 */
function checkMemberCommenting(req, res, next) {
  if (req.member && req.member.can_comment === false) {
    return next(
      new errors.NoPermissionError({
        message: tpl(messages.memberCommentingDisabled),
        context: req.member.commenting?.disabled_reason,
      }),
    );
  }
  next();
}

/**
 * Middleware to reject comment read requests without a valid private-site
 * session when the site is in private mode.
 */
function checkCanReadComments(req, res, next) {
  if (res.isPrivateBlog && !privateSiteAccess.hasAccess(req)) {
    return next(
      new errors.NoPermissionError({
        message: tpl(messages.privateSiteAccessRequired),
      }),
    );
  }
  next();
}

/**
 * @returns {import('express').Router}
 */
module.exports = function apiRoutes() {
  const router = express.Router('comment api');
  router.use(bodyParser.json({ limit: '50mb' }));
  router.use(privateSiteAccess.loadSession);

  const publicCountsCache = shared.middleware.cacheControl('public', {
    maxAge: config.get('caching:commentsCountAPI:maxAge'),
  });
  const privateCountsCache = shared.middleware.cacheControl('private');
  const countsCache = (req, res, next) => {
    if (res.isPrivateBlog) {
      return privateCountsCache(req, res, next);
    }
    return publicCountsCache(req, res, next);
  };
  router.get('/counts', checkCanReadComments, countsCache, http(api.commentsMembers.counts));

  // Load the optional member session for member-specific comment state
  router.use(membersService.middleware.loadMemberSession);

  // Enforce capped limit parameter
  router.use(shared.middleware.maxLimitCap);

  router.get('/', checkCanReadComments, http(api.commentsMembers.browse));
  router.get('/post/:post_id', checkCanReadComments, http(api.commentsMembers.browse));
  router.get('/:id', checkCanReadComments, http(api.commentsMembers.read));
  router.get('/:id/replies', checkCanReadComments, http(api.commentsMembers.replies));

  // Write operations require member to have commenting ability enabled
  router.post('/', checkMemberCommenting, http(api.commentsMembers.add));
  router.put('/:id', checkMemberCommenting, http(api.commentsMembers.edit));
  router.delete('/:id', checkMemberCommenting, http(api.commentsMembers.destroy));
  router.post('/:id/like', checkMemberCommenting, http(api.commentsMembers.like));
  router.delete('/:id/like', checkMemberCommenting, http(api.commentsMembers.unlike));
  router.post('/:id/dislike', checkMemberCommenting, http(api.commentsMembers.dislike));
  router.delete('/:id/dislike', checkMemberCommenting, http(api.commentsMembers.undislike));

  // Report is allowed even for members with commenting disabled (moderation action)
  router.post('/:id/report', http(api.commentsMembers.report));

  return router;
};
