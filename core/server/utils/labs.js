var settingsCache = require('../api/settings').cache,
    flagIsSet;

flagIsSet = function flagIsSet(flag) {
    var labsConfig = settingsCache.get('labs');
    return labsConfig && labsConfig[flag] && labsConfig[flag] === true;
};

module.exports.isSet = flagIsSet;
