const DomainEvents = require('@tryghost/domain-events');
const labs = require('../../../shared/labs');

class StaffServiceWrapper {
    init() {
        if (this.api) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        const StaffService = require('./staff-service');

        const logging = require('@tryghost/logging');
        const models = require('../../models');
        const memberAttribution = require('../member-attribution');
        const {GhostMailer} = require('../mail');
        const mailer = new GhostMailer();
        const settingsCache = require('../../../shared/settings-cache');
        const urlUtils = require('../../../shared/url-utils');
        const {blogIcon} = require('../../../server/lib/image');
        const settingsHelpers = require('../settings-helpers');

        this.api = new StaffService({
            logging,
            models,
            mailer,
            settingsHelpers,
            settingsCache,
            urlUtils,
            blogIcon,
            DomainEvents,
            memberAttributionService: memberAttribution.service,
            labs
        });

        this.api.subscribeEvents();
    }
}

module.exports = new StaffServiceWrapper();
