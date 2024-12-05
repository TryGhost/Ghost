// # Local File System Storage module
// The (default) module for storing media, using the local file system
const fs = require('fs-extra');
const path = require('path');
const config = require('../../../shared/config');

const constants = require('@tryghost/constants');
const urlUtils = require('../../../shared/url-utils');
const LocalStorageBase = require('./LocalStorageBase');

const messages = {
    notFound: 'File not found',
    notFoundWithRef: 'File not found: {file}',
    cannotRead: 'Could not read File: {file}'
};

class LocalFilesStorage extends LocalStorageBase {
    constructor() {
        super({
            storagePath: config.getContentPath('files'),
            siteUrl: config.getSiteUrl(),
            staticFileURLPrefix: constants.STATIC_FILES_URL_PREFIX,
            errorMessages: messages
        });
    }

    /**
     * Saves a buffer in the targetPath
     * @param {Buffer} buffer is an instance of Buffer
     * @param {String} targetPath relative path NOT including storage path to which the buffer should be written
     * @returns {Promise<String>} a URL to retrieve the data
     */
    async saveRaw(buffer, targetPath) {
        const storagePath = path.join(this.storagePath, targetPath);
        const targetDir = path.dirname(storagePath);

        await fs.mkdirs(targetDir);
        await fs.writeFile(storagePath, buffer);

        // For local file system storage can use relative path so add a slash
        const fullUrl = (
            urlUtils.urlJoin('/', urlUtils.getSubdir(),
                this.staticFileURLPrefix,
                targetPath)
        ).replace(new RegExp(`\\${path.sep}`, 'g'), '/');

        return fullUrl;
    }
}

module.exports = LocalFilesStorage;
