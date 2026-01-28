const express = require('../../../shared/express');
const config = require('../../../shared/config');
const api = require('../../api').endpoints;
const {http} = require('@tryghost/api-framework');
const shared = require('../shared');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const bodyParser = require('body-parser');
const membersService = require('../../../server/services/members');

const messages = {
    memberCommentingDisabled: 'Your commenting ability has been disabled.'
};

/**
 * Middleware to check if the member's commenting ability is disabled.
 * Uses can_comment property already computed from the session data.
 */
function checkMemberCommenting(req, res, next) {
    if (req.member && req.member.can_comment === false) {
        return next(new errors.NoPermissionError({
            message: tpl(messages.memberCommentingDisabled),
            context: req.member.commenting?.disabled_reason
        }));
    }
    next();
}

/**
 * @returns {import('express').Router}
 */
module.exports = function apiRoutes() {
    const router = express.Router('comment api');
    router.use(bodyParser.json({limit: '50mb'}));

    const countsCache = shared.middleware.cacheControl(
        'public',
        {maxAge: config.get('caching:commentsCountAPI:maxAge')}
    );
    router.get('/counts', countsCache, http(api.commentsMembers.counts));

    // Authenticated Routes
    router.use(membersService.middleware.loadMemberSession);

    // Enforce capped limit parameter
    router.use(shared.middleware.maxLimitCap);

    router.get('/', http(api.commentsMembers.browse));
    router.get('/post/:post_id', http(api.commentsMembers.browse));
    router.get('/:id', http(api.commentsMembers.read));
    router.get('/:id/replies', http(api.commentsMembers.replies));

    // Write operations require member to have commenting ability enabled
    router.post('/', checkMemberCommenting, http(api.commentsMembers.add));
    router.put('/:id', checkMemberCommenting, http(api.commentsMembers.edit));
    router.delete('/:id', checkMemberCommenting, http(api.commentsMembers.destroy));
    router.post('/:id/like', checkMemberCommenting, http(api.commentsMembers.like));
    router.delete('/:id/like', checkMemberCommenting, http(api.commentsMembers.unlike));

    // Report is allowed even for members with commenting disabled (moderation action)
    router.post('/:id/report', http(api.commentsMembers.report));

    return router;
};
