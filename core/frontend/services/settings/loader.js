const fs = require('fs-extra'),
    path = require('path'),
    debug = require('ghost-ignition').debug('frontend:services:settings:settings-loader'),
    common = require('../../../server/lib/common'),
    config = require('../../../server/config'),
    yamlParser = require('./yaml-parser'),
    validate = require('./validate');

/**
 * Reads the desired settings YAML file and passes the
 * file to the YAML parser which then returns a JSON object.
 * @param {String} setting the requested settings as defined in setting knownSettings
 * @returns {Object} settingsFile
 */
module.exports = function loadSettings(setting) {
    // we only support the `yaml` file extension. `yml` will be ignored.
    const fileName = `${setting}.yaml`;
    const contentPath = config.getContentPath('settings');
    const filePath = path.join(contentPath, fileName);

    try {
        const file = fs.readFileSync(filePath, 'utf8');
        debug('settings file found for', setting);

        const object = yamlParser(file, fileName);
        return validate(object);
    } catch (err) {
        if (common.errors.utils.isIgnitionError(err)) {
            throw err;
        }

        throw new common.errors.GhostError({
            message: common.i18n.t('errors.services.settings.loader', {setting: setting, path: contentPath}),
            context: filePath,
            err: err
        });
    }
};
