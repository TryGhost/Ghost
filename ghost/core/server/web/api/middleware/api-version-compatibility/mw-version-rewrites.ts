import type { RequestHandler } from 'express';
import urlUtils from '../../../../../shared/url-utils';
import { legacyApiPathMatch } from './legacy-api-path-match';

/**
 * If there is a version in the URL, and this is a valid API URL containing admin/content
 * Rewrite the URL and add the accept-version & deprecation headers
 */
export const versionRewrites: RequestHandler = (req, res, next) => {
  const { version: matchedVersion } = legacyApiPathMatch(req.url);

  // If we don't match a valid version, carry on
  if (!matchedVersion) {
    return next();
  }

  const versionlessUrl = req.url.replace(`${matchedVersion}/`, '');

  // Always send the explicit, numeric version in headers
  const version = matchedVersion === 'canary' ? 'v4' : matchedVersion;

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
