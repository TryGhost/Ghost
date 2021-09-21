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

module.exports = {
    obfuscatedSetting,
    isSecretSetting,
    hideValueIfSecret
};
