// # Local File System Image Storage module
// The (default) module for storing images, using the local file system
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const LocalStorageBase = require('./LocalStorageBase');

let messages = {
    notFound: 'Image not found',
    notFoundWithRef: 'Image not found: {file}',
    cannotRead: 'Could not read image: {file}'
};

class LocalImagesStorage extends LocalStorageBase {
    constructor() {
        super({
            storagePath: config.getContentPath('images'),
            staticFileURLPrefix: urlUtils.STATIC_IMAGE_URL_PREFIX,
            siteUrl: config.getSiteUrl(),
            errorMessages: messages
        });
    }
}

module.exports = LocalImagesStorage;
