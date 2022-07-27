class CommentsServiceWrapper {
    init() {
        const CommentsService = require('./service');
        const CommentsController = require('./controller');

        const config = require('../../../shared/config');
        const logging = require('@tryghost/logging');
        const models = require('../../models');
        const {GhostMailer} = require('../mail');
        const mailer = new GhostMailer();
        const settingsCache = require('../../../shared/settings-cache');
        const urlService = require('../url');
        const urlUtils = require('../../../shared/url-utils');
        const membersService = require('../members');

        this.api = new CommentsService({
            config,
            logging,
            models,
            mailer,
            settingsCache,
            urlService,
            urlUtils,
            contentGating: membersService.contentGating
        });

        this.controller = new CommentsController(this.api);
    }
}

module.exports = new CommentsServiceWrapper();
