const legacyApiPathMatch = require('./legacy-api-path-match');
const urlUtils = require('../../../shared/url-utils');

/**
 * If there is a version in the URL, and this is a valid API URL containing admin/content
 * Rewrite the URL and add the accept-version & deprecation headers
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = (req, res, next) => {
    let {version} = legacyApiPathMatch(req.url);

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
