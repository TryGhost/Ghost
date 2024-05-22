const path = require('path');
const moment = require('moment-timezone');

/**
 * @param {string} filePath
 * @returns {string}
 */
const getBackupRedirectsFilePath = (filePath) => {
    const {dir, name, ext} = path.parse(filePath);

    return path.join(dir, `${name}-${moment().format('YYYY-MM-DD-HH-mm-ss')}${ext}`);
};

module.exports.getBackupRedirectsFilePath = getBackupRedirectsFilePath;
