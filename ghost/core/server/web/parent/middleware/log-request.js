const logging = require('@tryghost/logging');
const config = require('../../../../shared/config');
const themePreviewToken = require('../../../../shared/theme-preview-token');

/**
 * The request as it is logged: theme preview tokens (in a preview asset's path,
 * or a preview's header) are replaced, as they grant access while they last
 *
 * @param {import('express').Request} req
 */
function loggedRequest(req) {
  const previewHeader = req.headers?.['x-ghost-preview'];
  if (!String(req.originalUrl).includes('/_preview/') && !previewHeader) {
    return req;
  }

  return Object.create(req, {
    url: { value: themePreviewToken.redact(req.url) },
    originalUrl: { value: themePreviewToken.redact(req.originalUrl) },
    headers: {
      value: previewHeader
        ? { ...req.headers, 'x-ghost-preview': themePreviewToken.redact(previewHeader) }
        : req.headers,
    },
  });
}

/**
 * @TODO: move this middleware to Framework monorepo?
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
module.exports = function logRequest(req, res, next) {
  const startTime = Date.now();

  function logResponse() {
    // 'close' before 'finish' means the client went away before we responded
    if (!res.writableFinished) {
      res.statusCode = 499;
    }

    res.responseTime = Date.now() - startTime + 'ms';
    req.userId = req.user ? (req.user.id ? req.user.id : req.user) : null;

    if (req.err && req.err.statusCode !== 404) {
      // 4xx are client errors (validation, auth, rate limit), not server
      // faults. Production keeps them at error (they're monitored); the test
      // env sets logging:logClientErrorsAsError=false to demote them to warn,
      // where every deliberate error-response assertion (expectStatus(4xx))
      // would otherwise log a redundant line.
      const isClientError = req.err.statusCode >= 400 && req.err.statusCode < 500;
      if (isClientError && config.get('logging:logClientErrorsAsError') === false) {
        logging.warn({ req: loggedRequest(req), res: res, err: req.err });
      } else {
        logging.error({ req: loggedRequest(req), res: res, err: req.err });
      }
    } else {
      logging.info({ req: loggedRequest(req), res: res });
    }

    res.removeListener('finish', logResponse);
    res.removeListener('close', logResponse);
  }

  res.on('finish', logResponse);
  res.on('close', logResponse);
  next();
};
