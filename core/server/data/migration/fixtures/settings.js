var models = require('../../../models'),
    ensureDefaultSettings;

ensureDefaultSettings = function ensureDefaultSettings(logInfo) {
    // Initialise the default settings
    logInfo('Populating default settings');
    return models.Settings.populateDefaults().then(function () {
        logInfo('Complete');
    });
};

module.exports = ensureDefaultSettings;
