// # Local File System Storage module
// The (default) module for storing media, using the local file system
const config = require('../../../shared/config');
const constants = require('@tryghost/constants');
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
}

module.exports = LocalFilesStorage;
