const moment = require('moment-timezone');
const fs = require('fs-extra');
const path = require('path');
const urlService = require('../url');

const common = require('../../../server/lib/common');
const config = require('../../../server/config');

const activate = (filePath) => {
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

module.exports.activate = activate;
// module.exports.serve = serve;
