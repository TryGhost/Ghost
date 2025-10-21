const config = require('../../../../../../shared/config');
const urlUtils = require('../../../../../../shared/url-utils');

function getURL(urlPath) {
    const media = new RegExp('^' + config.getSubdir() + '/' + urlUtils.STATIC_MEDIA_URL_PREFIX);
    const absolute = media.test(urlPath) ? true : false;

    if (absolute) {
        // Remove the sub-directory from the URL because ghostConfig will add it back.
        urlPath = urlPath.replace(new RegExp('^' + config.getSubdir()), '');
        const baseUrl = config.getSiteUrl().replace(/\/$/, '');
        urlPath = baseUrl + urlPath;
    }

    return urlPath;
}

module.exports = {
    upload({filePath, thumbnailPath}, apiConfig, frame) {
        return frame.response = {
            media: [{
                url: getURL(filePath),
                thumbnail_url: getURL(thumbnailPath),
                ref: frame.data.ref || null
            }]
        };
    },

    uploadThumbnail(path, apiConfig, frame) {
        return frame.response = {
            media: [{
                url: getURL(path),
                ref: frame.data.ref || null
            }]
        };
    }
};
