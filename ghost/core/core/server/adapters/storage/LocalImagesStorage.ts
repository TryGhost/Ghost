// # Local File System Image Storage module
// The (default) module for storing images, using the local file system
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import LocalStorageBase from './LocalStorageBase';

const messages = {
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

export default LocalImagesStorage;
