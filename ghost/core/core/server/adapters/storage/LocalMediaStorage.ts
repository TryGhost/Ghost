// # Local File System Media Storage module
// The (default) module for storing media, using the local file system
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import LocalStorageBase from './LocalStorageBase';

const messages = {
    notFound: 'Media file not found',
    notFoundWithRef: 'Media file not found: {file}',
    cannotRead: 'Could not read media file: {file}'
};

class LocalMediaStorage extends LocalStorageBase {
    constructor() {
        super({
            storagePath: config.getContentPath('media'),
            staticFileURLPrefix: urlUtils.STATIC_MEDIA_URL_PREFIX,
            siteUrl: config.getSiteUrl(),
            errorMessages: messages
        });
    }
}

export default LocalMediaStorage;
