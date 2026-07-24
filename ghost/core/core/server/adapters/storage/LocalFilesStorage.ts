// # Local File System Storage module
// The (default) module for storing media, using the local file system
import config from '../../../shared/config';
import urlUtils from '../../../shared/url-utils';
import LocalStorageBase from './LocalStorageBase';

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
            staticFileURLPrefix: urlUtils.STATIC_FILES_URL_PREFIX,
            errorMessages: messages
        });
    }
}

export default LocalFilesStorage;
