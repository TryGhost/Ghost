var semver = require('semver'),
    common = require('../../../lib/common');

function checkVersionMatch(req, res, next) {
    var clientVersion = req.get('X-Ghost-Version'),
        serverVersion = res.locals.version,
        constraint = '^' + clientVersion + '.0';

    // no error when client is on an earlier minor version than server
    // error when client is on a later minor version than server
    // always error when the major version is different

    if (clientVersion && !semver.satisfies(serverVersion, constraint)) {
        return next(new common.errors.VersionMismatchError({
            message: common.i18n.t('errors.middleware.api.versionMismatch', {
                clientVersion: clientVersion,
                serverVersion: serverVersion
            })
        }));
    }

    next();
}

module.exports = checkVersionMatch;
