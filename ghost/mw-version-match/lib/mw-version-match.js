const semver = require('semver');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');

const messages = {
    invalidClientVersionRange: 'Client request for {clientVersion} is invalid.',
    versionMismatch: 'Client request for {clientVersion} does not match server version {serverVersion}.'
};

function checkVersionMatch(req, res, next) {
    const clientVersion = req.get('X-Ghost-Version');
    // can contain pre-release suffix, you should be able to use e.g. 1.19.0-pre [server] with 1.18.0 [client]
    const serverVersion = res.locals.version.match(/^(\d+\.)?(\d+\.)?(\d+)/)[0];

    if (clientVersion) {
        const constraint = '^' + clientVersion + '.0';

        // Protect against invalid client ranges
        if (!semver.validRange(constraint)) {
            return next(new errors.BadRequestError({
                message: tpl(messages.invalidClientVersionRange, {
                    clientVersion
                })
            }));
        }

        // no error when client is on an earlier minor version than server
        // error when client is on a later minor version than server
        // always error when the major version is different
        if (!semver.satisfies(serverVersion, constraint)) {
            return next(new errors.VersionMismatchError({
                message: tpl(messages.versionMismatch, {
                    clientVersion,
                    serverVersion
                })
            }));
        }
    }

    next();
}

module.exports = checkVersionMatch;
