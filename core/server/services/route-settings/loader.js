const fs = require('fs-extra');
const path = require('path');
const debug = require('@tryghost/debug')('frontend:services:settings:settings-loader');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const yamlParser = require('../../../frontend/services/settings/yaml-parser');
const validate = require('../../../frontend/services/settings/validate');
const tpl = require('@tryghost/tpl');

const messages = {
    settingsLoaderError: `Error trying to load YAML setting for {setting} from '{path}'.`
};

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
 * settings asynchronously. This method is used at new places to read settings
 * to prevent blocking the eventloop
 * @returns {Promise<Object>} settingsFile
 */
const loadSettings = async () => {
    const setting = 'routes';
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
            message: tpl(messages.settingsLoaderError, {
                setting: setting,
                path: contentPath
            }),
            context: filePath,
            err: err
        });
    }
};

/**
 * Reads the routes.yaml settings file and passes the
 * file to the YAML parser which then returns a JSON object.
 *
 * @returns {Object} settingsFile in following format: {routes: {}, collections: {}, resources: {}}
 */
module.exports.loadSettingsSync = function loadSettingsSync() {
    const setting = 'routes';
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
            message: tpl(messages.settingsLoaderError, {
                setting: setting,
                path: contentPath
            }),
            context: filePath,
            err: err
        });
    }
};

module.exports.loadSettings = loadSettings;
