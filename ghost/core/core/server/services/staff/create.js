const logging = require('@tryghost/logging');
const StaffService = require('./staff-service');
const {GhostMailer} = require('../mail');
const {blogIcon} = require('../../lib/image');

/**
 * @param {object} deps
 * @param {object} deps.models
 * @param {object} deps.domainEvents
 * @param {object} deps.settingsCache
 * @param {object} deps.urlUtils
 * @param {object} deps.memberAttribution
 * @param {object} deps.settingsHelpers
 * @param {object} deps.labs
 */
module.exports = function createStaffService({models, domainEvents, settingsCache, urlUtils, memberAttribution, settingsHelpers, labs}) {
    const api = new StaffService({
        logging,
        models,
        mailer: new GhostMailer(),
        settingsHelpers,
        settingsCache,
        urlUtils,
        blogIcon,
        DomainEvents: domainEvents,
        memberAttributionService: memberAttribution.service,
        labs
    });

    let initialized = false;

    return {
        api,
        init() {
            if (initialized) {
                // Prevent creating duplicate DomainEvents subscribers
                return;
            }
            initialized = true;
            api.subscribeEvents();
        }
    };
};
