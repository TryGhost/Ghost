const APIVersionCompatibilityService = require('@tryghost/api-version-compatibility-service');
const VersionNotificationsDataService = require('@tryghost/version-notifications-data-service');
const {GhostMailer} = require('../mail');
const settingsService = require('../../services/settings');
const models = require('../../models');

const init = () => {
    const ghostMailer = new GhostMailer();
    const versionNotificationsDataService = new VersionNotificationsDataService({
        UserModel: models.User,
        settingsService: settingsService.getSettingsBREADServiceInstance()
    });

    this.APIVersionCompatibilityServiceInstance = new APIVersionCompatibilityService({
        sendEmail: (options) => {
            // NOTE: not using bind here because mockMailer is having trouble mocking bound methods
            return ghostMailer.send(options);
        },
        fetchEmailsToNotify: versionNotificationsDataService.getNotificationEmails.bind(versionNotificationsDataService),
        fetchHandled: versionNotificationsDataService.fetchNotification.bind(versionNotificationsDataService),
        saveHandled: versionNotificationsDataService.saveNotification.bind(versionNotificationsDataService)
    });
};

module.exports.APIVersionCompatibilityServiceInstance;
module.exports.init = init;
