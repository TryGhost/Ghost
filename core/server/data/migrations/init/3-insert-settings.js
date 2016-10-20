var _ = require('lodash'),
    models = require('../../../models');

module.exports = function insertSettings(options) {
    var localOptions = _.merge({context: {internal: true}}, options);
    return models.Settings.populateDefaults(localOptions);
};
