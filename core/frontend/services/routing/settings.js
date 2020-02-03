const fs = require('fs-extra');
const urlService = require('../url');

const common = require('../../../server/lib/common');
const models = require('../../../server/models');
const settingsCache = require('../../../server/services/settings/cache');

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
    const currentRoutesValue = JSON.stringify(settingsCache.get('routes_yaml'));
    return models.Settings.edit({key: 'routes_yaml_backup', value: currentRoutesValue})
        .then(() => {
            return fs.readFile(filePath, 'utf8');
        })
        .then((newRoutesYaml) => {
            return models.Settings.edit({
                key: 'routes_yaml',
                value: JSON.stringify(newRoutesYaml)
            });
        })
        .then(() => {
            const siteApp = require('../../../server/web/site/app');

            const bringBackValidRoutes = () => {
                urlService.resetGenerators({releaseResourcesOnly: true});

                return models.Settings.findOne({key: 'routes_yaml_backup'})
                    .then((backupRoutes) => {
                        return models.Settings.edit({
                            key: 'routes_yaml',
                            value: backupRoutes.value
                        });
                    })
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
    return settingsCache.get('routes_yaml');
};

module.exports.setFromFilePath = setFromFilePath;
module.exports.get = get;
