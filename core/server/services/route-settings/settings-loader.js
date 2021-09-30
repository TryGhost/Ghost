const fs = require('fs-extra');
const path = require('path');
const debug = require('@tryghost/debug')('frontend:services:settings:settings-loader');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const validate = require('./validate');

const messages = {
    settingsLoaderError: `Error trying to load YAML setting for {setting} from '{path}'.`
};

class SettingsLoader {
    /**
     * @param {Object} options
     * @param {Function} options.parseYaml yaml parser
     */
    constructor({parseYaml}) {
        this.parseYaml = parseYaml;
    }

    /**
     * NOTE: this method will have to go to an external module to reuse in redirects settings
     * @param {String} setting type of the settings to load, e.g:'routes' or 'redirects'
     * @returns {String} setting file path
     */
    getSettingFilePath(setting) {
        // we only support the `yaml` file extension. `yml` will be ignored.
        const fileName = `${setting}.yaml`;
        const contentPath = config.getContentPath('settings');
        const filePath = path.join(contentPath, fileName);

        return filePath;
    }

    /**
     * Functionally same as loadSettingsSync with exception of loading
     * settings asynchronously. This method is used at new places to read settings
     * to prevent blocking the eventloop
     * @returns {Promise<Object>} settingsFile
     */
    async loadSettings() {
        const setting = 'routes';
        const filePath = this.getSettingFilePath(setting);

        try {
            const file = await fs.readFile(filePath, 'utf8');
            debug('settings file found for', setting);

            const object = this.parseYaml(file);

            debug('YAML settings file parsed:', filePath);

            return validate(object);
        } catch (err) {
            if (errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new errors.GhostError({
                message: tpl(messages.settingsLoaderError, {
                    setting: setting,
                    path: filePath
                }),
                err: err
            });
        }
    }

    /**
     * Reads the routes.yaml settings file and passes the
     * file to the YAML parser which then returns a JSON object.
     *
     * @returns {Object} settingsFile in following format: {routes: {}, collections: {}, resources: {}}
     */
    loadSettingsSync() {
        const setting = 'routes';
        const filePath = this.getSettingFilePath(setting);

        try {
            const file = fs.readFileSync(filePath, 'utf8');
            debug('settings file found for', setting);

            const object = this.parseYaml(file);
            return validate(object);
        } catch (err) {
            if (errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new errors.GhostError({
                message: tpl(messages.settingsLoaderError, {
                    setting: setting,
                    path: filePath
                }),
                err: err
            });
        }
    }
}

module.exports = SettingsLoader;
