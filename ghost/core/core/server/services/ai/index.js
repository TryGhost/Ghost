const request = require('../../lib/request-external');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');
const providers = require('./providers');
const AIService = require('./ai-service');

let fileTypeFromBuffer;

async function getFileTypeFromBuffer(buffer) {
    if (!fileTypeFromBuffer) {
        ({fileTypeFromBuffer} = await import('file-type'));
    }

    return fileTypeFromBuffer(buffer);
}

module.exports = new AIService({
    request,
    settingsCache,
    getFileTypeFromBuffer,
    getSiteUrl: () => urlUtils.urlFor('home', true),
    getLocale: () => settingsCache.get('locale'),
    providers
});
