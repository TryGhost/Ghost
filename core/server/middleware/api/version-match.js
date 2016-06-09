var errors = require('../../errors'),
    i18n = require('../../i18n');

function checkVersionMatch(req, res, next) {
    var requestVersion = req.get('X-Ghost-Version'),
        currentVersion = res.locals.safeVersion;

    if (requestVersion && requestVersion !== currentVersion) {
        return next(new errors.VersionMismatchError(
            i18n.t(
                'errors.middleware.api.versionMismatch',
                {requestVersion: requestVersion, currentVersion: currentVersion}
            )
        ));
    }

    next();
}

module.exports = checkVersionMatch;
