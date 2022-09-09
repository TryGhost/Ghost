const DomainEvents = require('@tryghost/domain-events');
class StaffServiceWrapper {
    init() {
        if (this.api) {
            // Prevent creating duplicate DomainEvents subscribers
            return;
        }

        const StaffService = require('@tryghost/staff-service');

        const logging = require('@tryghost/logging');
        const models = require('../../models');
        const {GhostMailer} = require('../mail');
        const mailer = new GhostMailer();
        const settingsCache = require('../../../shared/settings-cache');
        const urlUtils = require('../../../shared/url-utils');
        const settingsHelpers = require('../settings-helpers');

        this.api = new StaffService({
            logging,
            models,
            mailer,
            settingsHelpers,
            settingsCache,
            urlUtils,
            DomainEvents
        });

        this.api.subscribeEvents();
    }
}

module.exports = new StaffServiceWrapper();
