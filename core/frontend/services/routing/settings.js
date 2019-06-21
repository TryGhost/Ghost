const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');
const urlService = require('../url');

const common = require('../../../server/lib/common');
const config = require('../../../server/config');

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
const setFromFilePath = (filePath) => {
    const settingsPath = config.getContentPath('settings');
    const backupRoutesPath = path.join(settingsPath, `routes-${moment().format('YYYY-MM-DD-HH-mm-ss')}.yaml`);

    return fs.copy(`${settingsPath}/routes.yaml`, backupRoutesPath)
        .then(() => {
            return fs.copy(filePath, `${settingsPath}/routes.yaml`);
        })
        .then(() => {
            urlService.resetGenerators({releaseResourcesOnly: true});
        })
        .then(() => {
            const siteApp = require('../../../server/web/site/app');

            const bringBackValidRoutes = () => {
                urlService.resetGenerators({releaseResourcesOnly: true});

                return fs.copy(backupRoutesPath, `${settingsPath}/routes.yaml`)
                    .then(() => {
                        return siteApp.reload();
                    });
            };

            try {
                siteApp.reload();
            } catch (err) {
                return bringBackValidRoutes()
                    .finally(() => {
                        throw err;
                    });
            }

            let tries = 0;

            function isBlogRunning() {
                return Promise.delay(1000)
                    .then(() => {
                        if (!urlService.hasFinished()) {
                            if (tries > 5) {
                                throw new common.errors.InternalServerError({
                                    message: 'Could not load routes.yaml file.'
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
        });
};

const get = () => {
    const routesPath = path.join(config.getContentPath('settings'), 'routes.yaml');

    return fs.readFile(routesPath, 'utf-8')
        .catch((err) => {
            if (err.code === 'ENOENT') {
                return Promise.resolve([]);
            }

            if (common.errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new common.errors.NotFoundError({
                err: err
            });
        });
};

module.exports.setFromFilePath = setFromFilePath;
module.exports.get = get;
