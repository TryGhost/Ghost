const fs = require('fs-extra');
const debug = require('@tryghost/debug')('frontend:services:settings:settings-loader');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const validate = require('./validate');

const messages = {
    settingsLoaderError: `Error trying to load YAML setting for {setting} from '{path}'.`
};

class SettingsLoader {
    /**
     * @param {Object} options
     * @param {Function} options.parseYaml yaml parser
     * @param {String} options.settingFilePath routes settings file path
     */
    constructor({parseYaml, settingFilePath}) {
        this.parseYaml = parseYaml;

        this.settingFilePath = settingFilePath;
    }

    /**
     * Functionally same as loadSettingsSync with exception of loading
     * settings asynchronously. This method is used at new places to read settings
     * to prevent blocking the eventloop
     * @returns {Promise<Object>} settingsFile
     */
    async loadSettings() {
        try {
            const file = await fs.readFile(this.settingFilePath, 'utf8');
            debug('routes settings file found for:', this.settingFilePath);

            const object = this.parseYaml(file);
            debug('YAML settings file parsed:', this.settingFilePath);

            return validate(object);
        } catch (err) {
            if (errors.utils.isGhostError(err)) {
                throw err;
            }

            throw new errors.InternalServerError({
                message: tpl(messages.settingsLoaderError, {
                    setting: 'routes',
                    path: this.settingFilePath
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
        try {
            const file = fs.readFileSync(this.settingFilePath, 'utf8');
            debug('routes settings file found for:', this.settingFilePath);

            const object = this.parseYaml(file);
            debug('YAML settings file parsed:', this.settingFilePath);

            return validate(object);
        } catch (err) {
            if (errors.utils.isGhostError(err)) {
                throw err;
            }

            throw new errors.InternalServerError({
                message: tpl(messages.settingsLoaderError, {
                    setting: 'routes',
                    path: this.settingFilePath
                }),
                err: err
            });
        }
    }
}

module.exports = SettingsLoader;
