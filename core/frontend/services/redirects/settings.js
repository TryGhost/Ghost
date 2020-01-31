const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');

const validation = require('./validation');

const config = require('../../../server/config');
const common = require('../../../server/lib/common');
const models = require('../../../server/models');
const settingsCache = require('../../../server/services/settings/cache');

const readRedirectsFile = (redirectsPath) => {
    return fs.readFile(redirectsPath, 'utf-8')
        .then((content) => {
            try {
                content = JSON.parse(content);
            } catch (err) {
                throw new common.errors.BadRequestError({
                    message: common.i18n.t('errors.general.jsonParse', {context: err.message})
                });
            }

            return content;
        })
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

const setFromFilePath = (filePath) => {
    return readRedirectsFile(filePath)
        .then((content) => {
            validation.validate(content);
            return models.Settings.edit({
                key: 'redirects',
                value: JSON.stringify(content)
            });
        });
};

const get = () => {
    return settingsCache.get('redirects');
};

const REDIRECTS_DEPRECATION_NOTICE = 
`Editing the redirects.json file directly is no longer supported.
To make redirect.json changes, please download it from the Ghost Admin panel, instead.
Once your changes are done, you will need to upload it to the Admin panel for the changes to take effect.
TODO: link PR/issue here.`;

// redirects used to be stored in a redirects.json file on disc. we migrated it to the 'settings' table.
// if we are coming from an older version of Ghost, we want to read it into that table, and also
// write a notice file to make those rare few that edit the file directly aware that we no longer read it.
// in any case, redirects should probably be done in the NGINX layer. see https://github.com/TryGhost/Ghost/issues/7707
const migrate = () => {
    const redirectsPath = path.join(config.getContentPath('data'), 'redirects.json');
    const warningPath = path.join(config.getContentPath('data'), 'REDIRECTS_DEPRECATION_NOTICE.txt');

    return fs.pathExists(redirectsPath)
        .then((exists) => {
            if (!exists) {
                return null;
            }

            return readRedirectsFile(redirectsPath)
                .then((redirects) => {
                    return models.Settings.edit({
                        key: 'redirects',
                        value: JSON.stringify(redirects)
                    });
                })
                .then(fs.writeFile(warningPath, REDIRECTS_DEPRECATION_NOTICE));
        });
};

module.exports.get = get;
module.exports.migrate = migrate;
module.exports.setFromFilePath = setFromFilePath;
