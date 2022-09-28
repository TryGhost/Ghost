const APIVersionCompatibilityService = require('@tryghost/api-version-compatibility-service');
const VersionNotificationsDataService = require('@tryghost/version-notifications-data-service');
const versionMismatchHandler = require('@tryghost/mw-api-version-mismatch');
// const {GhostMailer} = require('../mail');
const settingsService = require('../../services/settings');
const models = require('../../models');
const logging = require('@tryghost/logging');
const ghostVersion = require('@tryghost/version');

let serviceInstance;

const init = () => {
    //const ghostMailer = new GhostMailer();
    const versionNotificationsDataService = new VersionNotificationsDataService({
        UserModel: models.User,
        settingsService: settingsService.getSettingsBREADServiceInstance()
    });

    serviceInstance = new APIVersionCompatibilityService({
        sendEmail: (options) => {
            // NOTE: not using bind here because mockMailer is having trouble mocking bound methods
            //return ghostMailer.send(options);
            // For now log a warning, rather than sending an email
            logging.warn(options.html);
        },
        fetchEmailsToNotify: versionNotificationsDataService.getNotificationEmails.bind(versionNotificationsDataService),
        fetchHandled: versionNotificationsDataService.fetchNotification.bind(versionNotificationsDataService),
        saveHandled: versionNotificationsDataService.saveNotification.bind(versionNotificationsDataService)
    });
};

module.exports.errorHandler = (req, res, next) => {
    return versionMismatchHandler(serviceInstance)(req, res, next);
};

module.exports.contentVersion = (req, res, next) => {
    if (req.header('accept-version')) {
        res.header('Content-Version', `v${ghostVersion.safe}`);
    }

    res.vary('Accept-Version');
    next();
};

module.exports.init = init;
