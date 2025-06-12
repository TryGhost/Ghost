const crypto = require('crypto');
const validator = require('@tryghost/validator');
const config = require('../../../shared/config');
const logging = require('@tryghost/logging');

// The string returned when a setting is set as write-only
const obfuscatedSetting = '••••••••';

/**
 * @description // The function used to decide whether a setting is write-only
 * @param {Object} setting setting record
 * @param {String} setting.key
 * @returns {Boolean}
 */
function isSecretSetting(setting) {
    return /secret/.test(setting.key);
}

/**
 * @description The function that obfuscates a write-only setting
 * @param {Object} setting setting record
 * @param {String} setting.value
 * @param {String} setting.key
 * @returns {Object} settings record with obfuscated value if it's a secret
 */
function hideValueIfSecret(setting) {
    if (setting.value && isSecretSetting(setting)) {
        return {...setting, value: obfuscatedSetting};
    }
    return setting;
}

// Cached site UUID to ensure consistency
let SITE_UUID;
/**
 * @description Get or generate a site UUID, used for seeding the site_uuid setting
 * Uses the configured site_uuid if valid, otherwise generates a new one
 * To get the `site_uuid` setting, use `settingsCache.get('site_uuid')` instead
 * @returns {String} lowercase UUID
 */
function getOrGenerateSiteUuid() {
    if (!SITE_UUID) {
        try {
            let configuredSiteUuid = config.get('site_uuid');
            if (configuredSiteUuid && validator.isUUID(configuredSiteUuid)) {
                SITE_UUID = configuredSiteUuid.toLowerCase();
                logging.info(`Setting site_uuid to configured value: ${SITE_UUID}`);
            } else {
                SITE_UUID = crypto.randomUUID();
                logging.info(`Configured site_uuid was not found or invalid. Setting site_uuid to a new value: ${SITE_UUID}`);
            }
        } catch (error) {
            logging.error('Error getting site UUID from config. Setting site_uuid to a new value', error);
            SITE_UUID = crypto.randomUUID();
        }
    }
    return SITE_UUID.toLowerCase();
}

// Reset function for testing
getOrGenerateSiteUuid._reset = () => {
    SITE_UUID = undefined;
};

module.exports = {
    obfuscatedSetting,
    isSecretSetting,
    hideValueIfSecret,
    getOrGenerateSiteUuid
};
