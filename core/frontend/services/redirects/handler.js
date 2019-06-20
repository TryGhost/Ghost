const fs = require('fs-extra');
const path = require('path');
const Promise = require('bluebird');

const common = require('../../../server/lib/common');
const config = require('../../../server/config');

const readRedirectsFile = (customRedirectsPath) => {
    const redirectsPath = customRedirectsPath || path.join(config.getContentPath('data'), 'redirects.json');

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

module.exports.readRedirectsFile = readRedirectsFile;
