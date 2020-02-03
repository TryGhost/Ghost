const common = require('../../../server/lib/common');
const settingsCache = require('../../../server/services/settings/cache');
const yamlParser = require('./yaml-parser');
const validate = require('./validate');

/**
 * Reads the desired settings YAML file and passes the
 * file to the YAML parser which then returns a JSON object.
 * @param {String} setting the requested settings as defined in setting knownSettings
 * @returns {Object} settingsFile
 */
module.exports = function loadSettings(setting) {
    const key = `${setting}_yaml`;
    const value = settingsCache.get(key);

    try {
        const object = yamlParser(value, setting);
        return validate(object);
    } catch (err) {
        if (common.errors.utils.isIgnitionError(err)) {
            throw err;
        }

        throw new common.errors.GhostError({
            message: common.i18n.t('errors.services.settings.loader', {setting: setting, key: key}),
            context: key,
            err: err
        });
    }
};
