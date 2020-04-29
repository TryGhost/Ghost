const semver = require('semver');
const packageInfo = require('../../../package.json');
const version = packageInfo.version;
const plainVersion = version.match(/^(\d+\.)?(\d+\.)?(\d+)/)[0];

let _private = {};

_private.compose = function compose(type) {
    switch (type) {
    case 'pre':
        return plainVersion + '-' + semver.prerelease(version)[0] + (semver.prerelease(version)[1] ? '.' + semver.prerelease(version)[1] : '');
    default:
        return version;
    }
};

// major.minor
module.exports.safe = version.match(/^(\d+\.)?(\d+)/)[0];

// major.minor.patch-{prerelease}
module.exports.full = semver.prerelease(version) ? _private.compose('pre') : plainVersion;

// original string in package.json (can contain pre-release and build suffix)
module.exports.original = version;

