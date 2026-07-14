const request = require('../../lib/request-external');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const ImageAltTextService = require('./image-alt-text-service');

let fileTypeFromBuffer;

async function getFileTypeFromBuffer(buffer) {
    if (!fileTypeFromBuffer) {
        ({fileTypeFromBuffer} = await import('file-type'));
    }

    return fileTypeFromBuffer(buffer);
}

module.exports = new ImageAltTextService({
    request,
    settingsCache,
    getFileTypeFromBuffer,
    getSiteUrl: () => urlUtils.urlFor('home', true)
});
