const Promise = require('bluebird');
const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');
const urlService = require('../../../frontend/services/url');

const debug = require('@tryghost/debug')('services:route-settings');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const config = require('../../../shared/config');
const bridge = require('../../../bridge');

const messages = {
    loadError: 'Could not load {filename} file.'
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

const filename = 'routes';
const ext = 'yaml';

const getSettingsFolder = async () => {
    return config.getContentPath('settings');
};

const getSettingsFilePath = async () => {
    const settingsFolder = await getSettingsFolder();
    return path.join(settingsFolder, `${filename}.${ext}`);
};

const getBackupFilePath = async () => {
    const settingsFolder = await getSettingsFolder();
    return path.join(settingsFolder, `${filename}-${moment().format('YYYY-MM-DD-HH-mm-ss')}.${ext}`);
};

const createBackupFile = async (settingsPath, backupPath) => {
    return await fs.copy(settingsPath, backupPath);
};

const restoreBackupFile = async (settingsPath, backupPath) => {
    return await fs.copy(backupPath, settingsPath);
};

const saveFile = async (filePath, settingsPath) => {
    return await fs.copy(filePath, settingsPath);
};

const readFile = (settingsFilePath) => {
    return fs.readFile(settingsFilePath, 'utf-8')
        .catch((err) => {
            if (err.code === 'ENOENT') {
                return Promise.resolve([]);
            }

            if (errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new errors.NotFoundError({
                err: err
            });
        });
};

const setFromFilePath = async (filePath) => {
    const settingsPath = await getSettingsFilePath();
    const backupPath = await getBackupFilePath();

    await createBackupFile(settingsPath, backupPath);
    await saveFile(filePath, settingsPath);

    urlService.resetGenerators({releaseResourcesOnly: true});

    const bringBackValidRoutes = async () => {
        urlService.resetGenerators({releaseResourcesOnly: true});

        await restoreBackupFile(settingsPath, backupPath);

        return bridge.reloadFrontend();
    };

    try {
        bridge.reloadFrontend();
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
                            message: tpl(messages.loadError, {filename: `${filename}.${ext}`})
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
};

const get = async () => {
    const settingsFilePath = await getSettingsFilePath();

    return readFile(settingsFilePath);
};

module.exports.setFromFilePath = setFromFilePath;
module.exports.get = get;
