const ghostVersion = require('@tryghost/version');

/**
 * Set Content-Version on the response, and add 'Accept-Version' to VARY as
 * it effects response caching
 * * TODO: move the method to mw once back-compatibility with 4.x is sorted *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports.contentVersion = function apiVersionCompatibilityContentVersion(req, res, next) {
    res.header('Content-Version', `v${ghostVersion.safe}`);
    res.vary('Accept-Version');

    next();
};

module.exports.versionRewrites = require('./mw-version-rewrites');
module.exports.legacyApiPathMatch = require('./legacy-api-path-match');
