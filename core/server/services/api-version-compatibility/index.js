const APIVersionCompatibilityService = require('@tryghost/api-version-compatibility-service');
const VersionNotificationsDataService = require('@tryghost/version-notifications-data-service');
const versionMismatchHandler = require('@tryghost/mw-api-version-mismatch');
const ghostVersion = require('@tryghost/version');
const {GhostMailer} = require('../mail');
const settingsService = require('../../services/settings');
const urlUtils = require('../../../shared/url-utils');
const models = require('../../models');
const routeMatch = require('path-match')();

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
        saveHandled: versionNotificationsDataService.saveNotification.bind(versionNotificationsDataService)
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

/**
 * If there is a version in the URL, and this is a valid API URL containing admin/content
 * Rewrite the URL and add the accept-version & deprecation headers
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.versionRewrites = (req, res, next) => {
    let {version} = routeMatch('/:version(v2|v3|v4|canary)/:api(admin|content)/*')(req.url);

    // If we don't match a valid version, carry on
    if (!version) {
        return next();
    }

    const versionlessUrl = req.url.replace(`${version}/`, '');

    // Always send the explicit, numeric version in headers
    if (version === 'canary') {
        version = 'v4';
    }

    // Rewrite the url
    req.url = versionlessUrl;

    // Add the accept-version header so our internal systems will act as if it was set on the request
    req.headers['accept-version'] = req.headers['accept-version'] || `${version}.0`;

    res.header('Deprecation', `version="${version}"`);
    res.header('Link', `<${urlUtils.urlJoin(urlUtils.urlFor('admin', true), 'api', versionlessUrl)}>; rel="latest-version"`);

    next();
};

module.exports.init = init;
