const APIVersionCompatibilityService = require('@tryghost/api-version-compatibility-service');
const versionMismatchHandler = require('@tryghost/mw-api-version-mismatch');
const ghostVersion = require('@tryghost/version');
const {GhostMailer} = require('../mail');
const settingsService = require('../settings/settings-service');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils');
const settingsCache = require('../../../shared/settings-cache');

let serviceInstance;

const init = () => {
    const ghostMailer = new GhostMailer();

    serviceInstance = new APIVersionCompatibilityService({
        UserModel: models.User,
        ApiKeyModel: models.ApiKey,
        settingsService: settingsService.getSettingsBREADServiceInstance(),
        sendEmail: (options) => {
            // NOTE: not using bind here because mockMailer is having trouble mocking bound methods
            return ghostMailer.send(options);
        },
        getSiteUrl: () => urlUtils.urlFor('home', true),
        getSiteTitle: () => settingsCache.get('title')
    });
};

module.exports.errorHandler = (err, req, res, next) => {
    return versionMismatchHandler(serviceInstance)(err, req, res, next);
};

/**
 * Set Content-Version on the response, and add 'Accept-Version' to VARY as
 * it effects response caching
 * TODO: move the method to mw once back-compatibility with 4.x is sorted
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.contentVersion = (req, res, next) => {
    res.header('Content-Version', `v${ghostVersion.safe}`);
    res.vary('Accept-Version');

    next();
};

module.exports.versionRewrites = require('./mw-version-rewrites');
module.exports.legacyApiPathMatch = require('./legacy-api-path-match');

module.exports.init = init;
