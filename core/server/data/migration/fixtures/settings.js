var models = require('../../../models'),
    ensureDefaultSettings;

/**
 * ## Ensure Default Settings
 * Wrapper around model.Settings.populateDefault, with logger
 * @param {{info: logger.info, warn: logger.warn}} logger
 * @returns {*}
 */
ensureDefaultSettings = function ensureDefaultSettings(logger) {
    // Initialise the default settings
    logger.info('Ensuring default settings');
    return models.Settings.populateDefaults();
};

module.exports = ensureDefaultSettings;
