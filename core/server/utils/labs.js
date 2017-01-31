var settingsCache = require('../api/settings').cache,
    flagIsSet;

// @TODO: what is this lib doing?
flagIsSet = function flagIsSet(flag) {
    var labsConfig = settingsCache.get('labs');
    return labsConfig && labsConfig[flag] && labsConfig[flag] === true;
};

module.exports.isSet = flagIsSet;
