const fs = require('fs-extra');
const path = require('path');
const debug = require('@tryghost/debug')('frontend:services:settings:settings-loader');
const {i18n} = require('../proxy');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const yamlParser = require('./yaml-parser');
const validate = require('./validate');

const getSettingFilePath = (setting) => {
    // we only support the `yaml` file extension. `yml` will be ignored.
    const fileName = `${setting}.yaml`;
    const contentPath = config.getContentPath('settings');
    const filePath = path.join(contentPath, fileName);

    return {
        fileName,
        contentPath,
        filePath
    };
};

/**
 * Functionally same as loadSettingsSync with exception of loading
 * settigs asyncronously. This method is used at new places to read settings
 * to prevent blocking the eventloop
 *
 * @param {String} setting the requested settings as defined in setting knownSettings
 * @returns {Object} settingsFile
 */
const loadSettings = async (setting) => {
    const {fileName, contentPath, filePath} = getSettingFilePath(setting);

    try {
        const file = await fs.readFile(filePath, 'utf8');
        debug('settings file found for', setting);

        const object = yamlParser(file, fileName);
        return validate(object);
    } catch (err) {
        if (errors.utils.isIgnitionError(err)) {
            throw err;
        }

        throw new errors.GhostError({
            message: i18n.t('errors.services.settings.loader', {
                setting: setting,
                path: contentPath
            }),
            context: filePath,
            err: err
        });
    }
};

/**
 * Reads the desired settings YAML file and passes the
 * file to the YAML parser which then returns a JSON object.
 * NOTE: loading happens syncronously
 *
 * @param {String} setting the requested settings as defined in setting knownSettings
 * @returns {Object} settingsFile
 */
module.exports = function loadSettingsSync(setting) {
    const {fileName, contentPath, filePath} = getSettingFilePath(setting);

    try {
        const file = fs.readFileSync(filePath, 'utf8');
        debug('settings file found for', setting);

        const object = yamlParser(file, fileName);
        return validate(object);
    } catch (err) {
        if (errors.utils.isIgnitionError(err)) {
            throw err;
        }

        throw new errors.GhostError({
            message: i18n.t('errors.services.settings.loader', {
                setting: setting,
                path: contentPath
            }),
            context: filePath,
            err: err
        });
    }
};

module.exports.loadSettings = loadSettings;
