var config = require('../config'),
    flagIsSet;

flagIsSet = function flagIsSet(flag) {
    var labsConfig = config.labs;

    return !!labsConfig[flag] && labsConfig[flag] === true;
};

module.exports.isSet = flagIsSet;
