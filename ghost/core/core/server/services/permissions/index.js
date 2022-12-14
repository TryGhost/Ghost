// canThis(someUser).edit.posts([id]|[[ids]])
// canThis(someUser).edit.post(somePost|somePostId)

const models = require('../../models');

const actionsMap = require('./actions-map-cache');

const init = function init(options) {
    options = options || {};

    // Load all the permissions
    return models.Permission.findAll(options)
        .then(function (permissionsCollection) {
            return actionsMap.init(permissionsCollection);
        });
};

module.exports = {
    init: init,
    canThis: require('./can-this'),
    // @TODO: Make it so that we don't need to export these
    parseContext: require('./parse-context')
};
