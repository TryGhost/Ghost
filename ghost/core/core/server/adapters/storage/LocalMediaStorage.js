// # Local File System Media Storage module
// The (default) module for storing media, using the local file system
const config = require('../../../shared/config');
const constants = require('@tryghost/constants');
const LocalStorageBase = require('./LocalStorageBase');

const messages = {
    notFound: 'Media file not found',
    notFoundWithRef: 'Media file not found: {file}',
    cannotRead: 'Could not read media file: {file}'
};

class LocalMediaStore extends LocalStorageBase {
    constructor() {
        super({
            storagePath: config.getContentPath('media'),
            staticFileURLPrefix: constants.STATIC_MEDIA_URL_PREFIX,
            siteUrl: config.getSiteUrl(),
            errorMessages: messages
        });
    }
}

module.exports = LocalMediaStore;
