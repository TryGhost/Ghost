const APIVersionCompatibilityService = require('@tryghost/api-version-compatibility-service');
const VersionNotificationsDataService = require('@tryghost/version-notifications-data-service');
const versionMismatchHandler = require('@tryghost/mw-api-version-mismatch');
const ghostVersion = require('@tryghost/version');
const {GhostMailer} = require('../mail');
const settingsService = require('../../services/settings');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');

let serviceInstance;

const init = () => {
    const ghostMailer = new GhostMailer();
    const versionNotificationsDataService = new VersionNotificationsDataService({
        UserModel: models.User,
        settingsService: settingsService.getSettingsBREADServiceInstance()
    });

    serviceInstance = new APIVersionCompatibilityService({
        sendEmail: (options) => {
            // NOTE: not using bind here because mockMailer is having trouble mocking bound methods
            return ghostMailer.send(options);
        },
        fetchEmailsToNotify: versionNotificationsDataService.getNotificationEmails.bind(versionNotificationsDataService),
        fetchHandled: versionNotificationsDataService.fetchNotification.bind(versionNotificationsDataService),
        saveHandled: versionNotificationsDataService.saveNotification.bind(versionNotificationsDataService),
        getSiteUrl: () => urlUtils.urlFor('home', true),
        getSiteTitle: () => settingsCache.get('title')
    });
};

module.exports.errorHandler = (err, req, res, next) => {
    return versionMismatchHandler(serviceInstance)(err, req, res, next);
};

/**
 * If Accept-Version is set on the request set Content-Version on the response
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.contentVersion = (req, res, next) => {
    if (req.header('accept-version')) {
        res.header('Content-Version', `v${ghostVersion.safe}`);
    }
    next();
};

module.exports.versionRewrites = require('./mw-version-rewrites');

module.exports.init = init;
