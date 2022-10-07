const Promise = require('bluebird');
const fs = require('fs-extra');
const crypto = require('crypto');
const urlService = require('../url');

const debug = require('@tryghost/debug')('services:route-settings');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const bridge = require('../../../bridge');

const messages = {
    loadError: 'Could not load routes.yaml file.'
};

/**
 * The `routes.yaml` file offers a way to configure your Ghost blog. It's currently a setting feature
 * we have added. That's why the `routes.yaml` file is treated as a "setting" right now.
 * If we want to add single permissions for this file (e.g. upload/download routes.yaml), we can add later.
 *
 * How does it work?
 *
 * - we first reset all url generators (each url generator belongs to one express router)
 *   - we don't destroy the resources, we only release them (this avoids reloading all resources from the db again)
 * - then we reload the whole site app, which will reset all routers and re-create the url generators
 */

class RouteSettings {
    /**
     *
     * @param {Object} options
     * @param {Object} options.settingsLoader
     * @param {String} options.settingsPath
     * @param {String} options.backupPath
     */
    constructor({settingsLoader, settingsPath, backupPath}) {
        /**
         * md5 hashes of default routes settings
         * @private
         */
        this.defaultRoutesSettingHash = '3d180d52c663d173a6be791ef411ed01';

        this.settingsLoader = settingsLoader;
        this.settingsPath = settingsPath;
        this.backupPath = backupPath;
    }

    /**
     * @private
     * @param {String} settingsPath
     * @param {String} backupPath
     */
    async createBackupFile(settingsPath, backupPath) {
        return await fs.copy(settingsPath, backupPath);
    }

    /**
     * @private
     * @param {String} settingsPath
     * @param {String} backupPath
     */
    async restoreBackupFile(settingsPath, backupPath) {
        return await fs.copy(backupPath, settingsPath);
    }

    /**
     * @private
     * @param {String} filePath
     * @param {String} settingsPath
     */
    async saveFile(filePath, settingsPath) {
        return await fs.copy(filePath, settingsPath);
    }

    /**
     * @private
     * @param {String} settingsFilePath
     */
    async readFile(settingsFilePath) {
        return fs.readFile(settingsFilePath, 'utf-8')
            .catch((err) => {
                if (err.code === 'ENOENT') {
                    return Promise.resolve([]);
                }

                if (errors.utils.isGhostError(err)) {
                    throw err;
                }

                throw new errors.NotFoundError({
                    err: err
                });
            });
    }

    async setFromFilePath(filePath) {
        await this.createBackupFile(this.settingsPath, this.backupPath);
        await this.saveFile(filePath, this.settingsPath);

        urlService.resetGenerators({releaseResourcesOnly: true});

        const bringBackValidRoutes = async () => {
            urlService.resetGenerators({releaseResourcesOnly: true});

            await this.restoreBackupFile(this.settingsPath, this.backupPath);

            return bridge.reloadFrontend();
        };

        try {
            await bridge.reloadFrontend();
        } catch (err) {
            return bringBackValidRoutes()
                .finally(() => {
                    throw err;
                });
        }

        // @TODO: how can we get rid of this from here?
        let tries = 0;

        function isBlogRunning() {
            debug('waiting for blog running');
            return Promise.delay(1000)
                .then(() => {
                    debug('waited for blog running');
                    if (!urlService.hasFinished()) {
                        if (tries > 5) {
                            throw new errors.InternalServerError({
                                message: tpl(messages.loadError)
                            });
                        }

                        tries = tries + 1;
                        return isBlogRunning();
                    }
                });
        }

        return isBlogRunning()
            .catch((err) => {
                return bringBackValidRoutes()
                    .finally(() => {
                        throw err;
                    });
            });
    }

    async get() {
        return this.readFile(this.settingsPath);
    }

    calculateHash(data) {
        return crypto.createHash('md5')
            .update(data, 'binary')
            .digest('hex');
    }

    getDefaultHash() {
        return this.defaultRoutesSettingHash;
    }

    async getCurrentHash() {
        const data = await this.settingsLoader.loadSettings();

        return this.calculateHash(JSON.stringify(data));
    }
}

module.exports = RouteSettings;
