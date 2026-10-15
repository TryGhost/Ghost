const urlUtils = require('../../../../../shared/url-utils').default;

// req.url is relative to the API mount, so a legacy versioned URL always starts
// with a /<version>/<api> segment pair. Only that leading pair carries a
// version; a version-like string later in the path or in the query does not.
// Any case matches, as Express routes paths in any case.
const LEGACY_VERSION_PREFIX = /^\/(v2|v3|v4|canary)\/(?=(?:admin|content)(?:[/?]|$))/i;

/**
 * If there is a version in the URL, and this is a valid API URL containing admin/content
 * Rewrite the URL and add the accept-version & deprecation headers
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function mwVersionRewrites(req, res, next) {
  const match = LEGACY_VERSION_PREFIX.exec(req.url);

  // If we don't match a valid version, carry on
  if (!match) {
    return next();
  }

  let version = match[1].toLowerCase();
  const versionlessUrl = req.url.replace(LEGACY_VERSION_PREFIX, '/');

  // Always send the explicit, numeric version in headers
  if (version === 'canary') {
    version = 'v4';
  }

  // Rewrite the url
  req.url = versionlessUrl;

  // Add the accept-version header so our internal systems will act as if it was set on the request
  req.headers['accept-version'] = req.headers['accept-version'] || `${version}.0`;

  res.header('Deprecation', `version="${version}"`);
  res.header(
    'Link',
    `<${urlUtils.urlJoin(urlUtils.urlFor('admin', true), 'api', versionlessUrl)}>; rel="latest-version"`,
  );

  next();
};
