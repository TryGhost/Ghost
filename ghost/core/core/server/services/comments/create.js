const logging = require('@tryghost/logging');
const CommentsService = require('./comments-service');
const CommentsController = require('./comments-controller');
const CommentsStats = require('./comments-stats-service');
const {GhostMailer} = require('../mail');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.settingsCache
 * @param {object} deps.urlUtils
 * @param {import('knex').Knex} deps.knex
 * @param {object} deps.urlService
 * @param {object} deps.members
 * @param {object} deps.settingsHelpers
 * @param {object} deps.labs
 */
module.exports = function createCommentsService({models, settingsCache, urlUtils, knex, urlService, members, settingsHelpers, labs}) {
    // config was threaded through to the emails service but never read
    const api = new CommentsService({
        logging,
        models,
        mailer: new GhostMailer(),
        settingsCache,
        settingsHelpers,
        urlService,
        urlUtils,
        contentGating: members.contentGating,
        labs
    });

    const stats = new CommentsStats({db: {knex}});

    return {
        api,
        controller: new CommentsController(api, stats),
        init() {}
    };
};
