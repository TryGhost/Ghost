const fs = require('fs-extra');
const Promise = require('bluebird');
const path = require('path');
const debug = require('@tryghost/debug')('frontend:services:settings:ensure-settings');
const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');

const messages = {
    ensureSettings: 'Error trying to access settings files in {path}.'
};

class DefaultSettingsManager {
    /**
     *
     * @param {Object} options
     * @param {String} options.type - name of the setting file
     * @param {String} options.extension - settings file extension
     * @param {String} options.destinationFolderPath - path to store the default setting config
     * @param {String} options.sourceFolderPath - path where the default config can be seeded from
     */
    constructor({type, extension, destinationFolderPath, sourceFolderPath}) {
        this.type = type;
        this.extension = extension;
        this.destinationFolderPath = destinationFolderPath;
        this.sourceFolderPath = sourceFolderPath;
    }

    /**
     *
     * Makes sure the destination folder either contains a file or copies over a default file.
     * @returns {Promise<any>}
     */
    async ensureSettingsFileExists() {
        const fileName = this.type + this.extension;
        const defaultFileName = `default-${fileName}`;

        const destinationFilePath = path.join(this.destinationFolderPath, fileName);
        const defaultFilePath = path.join(this.sourceFolderPath, defaultFileName);

        return Promise.resolve(fs.readFile(destinationFilePath, 'utf8'))
            .catch({code: 'ENOENT'}, () => {
                // CASE: file doesn't exist, copy it from our defaults
                return fs.copy(
                    defaultFilePath,
                    destinationFilePath
                ).then(() => {
                    debug(`'${defaultFileName}' copied to ${this.destinationFolderPath}.`);
                });
            }).catch((error) => {
                // CASE: we might have a permission error, as we can't access the directory
                throw new errors.InternalServerError({
                    message: tpl(messages.ensureSettings, {
                        path: this.destinationFolderPath
                    }),
                    err: error,
                    context: error.path
                });
            });
    }
}

module.exports = DefaultSettingsManager;
