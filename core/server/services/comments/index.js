class CommentsServiceWrapper {
    init() {
        const CommentsService = require('./service');

        const config = require('../../../shared/config');
        const models = require('../../models');
        const {GhostMailer} = require('../mail');
        const mailer = new GhostMailer();
        const settingsCache = require('../../../shared/settings-cache');
        const urlUtils = require('../../../shared/url-utils');

        this.api = new CommentsService({
            config,
            models,
            mailer,
            settingsCache,
            urlUtils
        });
    }
}

module.exports = new CommentsServiceWrapper();
