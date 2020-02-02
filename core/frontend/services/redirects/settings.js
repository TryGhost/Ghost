const fs = require('fs-extra');
const Promise = require('bluebird');

const validation = require('./validation');

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

module.exports.get = get;
module.exports.setFromFilePath = setFromFilePath;
