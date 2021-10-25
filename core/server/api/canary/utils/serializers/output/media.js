const config = require('../../../../../../shared/config');

function getURL(urlPath) {
    const STATIC_VIDEO_URL_PREFIX = 'content/media';
    const imagePathRe = new RegExp('^' + config.getSubdir() + '/' + STATIC_VIDEO_URL_PREFIX);
    const absolute = imagePathRe.test(urlPath) ? true : false;

    if (absolute) {
        // Remove the sub-directory from the URL because ghostConfig will add it back.
        urlPath = urlPath.replace(new RegExp('^' + config.getSubdir()), '');
        const baseUrl = config.getSiteUrl().replace(/\/$/, '');
        urlPath = baseUrl + urlPath;
    }

    return urlPath;
}

module.exports = {
    upload(path, apiConfig, frame) {
        return frame.response = {
            media: [{
                url: getURL(path),
                ref: frame.data.ref || null
            }]
        };
    }
};
