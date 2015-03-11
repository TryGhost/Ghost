// # Ghost Script Tags Helpers
// Used in the ghost admin only
//
// We use the name ghost_script_tags to match the helper for consistency:
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

var _               = require('lodash'),
    utils           = require('./utils'),
    config          = require('../config'),
    ghost_script_tags;

ghost_script_tags = function () {
    var scriptList = utils.isProduction ? utils.scriptFiles.production : utils.scriptFiles.development;

    scriptList = _.map(scriptList, function (fileName) {
        return utils.scriptTemplate({
            source: config.paths.subdir + '/ghost/scripts/' + fileName,
            version: config.assetHash
        });
    });

    return scriptList.join('');
};

module.exports = ghost_script_tags;
