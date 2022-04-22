const APIVersionCompatibilityService = require('@tryghost/api-version-compatibility-service');
const {GhostMailer} = require('../mail');

const {
    getNotificationEmails,
    fetchNotification,
    saveNotification
} = require('./version-notifications-data-service');

const ghostMailer = new GhostMailer();

const init = () => {
    this.APIVersionCompatibilityServiceInstance = new APIVersionCompatibilityService({
        sendEmail: (options) => {
            return ghostMailer.send(options);
        },
        fetchEmailsToNotify: getNotificationEmails,
        fetchHandled: fetchNotification,
        saveHandled: saveNotification
    });
};

module.exports.APIVersionCompatibilityServiceInstance;
module.exports.init = init;
