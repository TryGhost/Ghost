class CommentsServiceWrapper {
    init() {
        const CommentsService = require('./CommentsService');
        const CommentsController = require('./CommentsController');
        const CommentsStats = require('./CommentsStatsService');

        const config = require('../../../shared/config');
        const logging = require('@tryghost/logging');
        const models = require('../../models');
        const {GhostMailer} = require('../mail');
        const mailer = new GhostMailer();
        const settingsCache = require('../../../shared/settings-cache');
        const urlService = require('../url');
        const urlUtils = require('../../../shared/url-utils');
        const membersService = require('../members');
        const db = require('../../data/db');
        const settingsHelpers = require('../settings-helpers');

        this.api = new CommentsService({
            config,
            logging,
            models,
            mailer,
            settingsCache,
            settingsHelpers,
            urlService,
            urlUtils,
            contentGating: membersService.contentGating
        });

        const stats = new CommentsStats({db});

        this.controller = new CommentsController(this.api, stats);
    }
}

module.exports = new CommentsServiceWrapper();
