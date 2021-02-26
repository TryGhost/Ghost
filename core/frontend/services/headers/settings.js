const fs = require('fs-extra');
const path = require('path');
const moment = require('moment-timezone');
const yaml = require('js-yaml');
const Promise = require('bluebird');
// const validation = require('./validation');  // Does not exist yet

const config = require('../../../shared/config');
const {i18n} = require('../../../server/lib/common');
const errors = require('@tryghost/errors');

// Currently does nothing but update file, no validation
const setFromFilePath = (filePath) => {
    const settingsPath = config.getContentPath('settings');
    const backupRoutesPath = path.join(settingsPath, `headers-${moment().format('YYYY-MM-DD-HH-mm-ss')}.yaml`);

    return fs.copy(`${settingsPath}/headers.yaml`, backupRoutesPath)
        .then(() => {
            return fs.copy(filePath, `${settingsPath}/headers.yaml`);
        })
        /*.then(() => {
			// TODO: Validation and whatever should be done once the file is updated
        });*/
};

// The default .yaml content is an empty string
const defaultHeadersContent = '';

const get = () => {
	
	const headersPath = path.join(config.getContentPath('settings'), 'headers.yaml');
	
    return fs.readFile(headersPath, 'utf-8')
        .catch((err) => {
			
            if (err.code === 'ENOENT') {
                return Promise.resolve(defaultHeadersContent);
            }

            if (errors.utils.isIgnitionError(err)) {
                throw err;
            }

            throw new errors.NotFoundError({
                err: err
            });
        });
};

module.exports.setFromFilePath = setFromFilePath;
module.exports.get = get;
