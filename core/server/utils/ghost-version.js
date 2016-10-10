var packageInfo = require('../../../package.json'),
    version = packageInfo.version;

module.exports = {
    full: version,
    safe: version.match(/^(\d+\.)?(\d+)/)[0]
};

