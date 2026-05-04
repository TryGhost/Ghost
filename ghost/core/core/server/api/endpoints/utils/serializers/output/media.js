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
    browse(response, apiConfig, frame) {
        frame.response = {
            media: response.data.map(model => model.toJSON(frame.options)),
            meta: response.meta
        };
    },

    read(response, apiConfig, frame) {
        frame.response = {
            media: [response.toJSON(frame.options)]
        };
    },

    edit(response, apiConfig, frame) {
        frame.response = {
            media: [response.toJSON(frame.options)]
        };
    },

    browseFolders(response, apiConfig, frame) {
        frame.response = {
            media_folders: response.data.map(model => model.toJSON(frame.options)),
            meta: response.meta
        };
    },

    addFolder(response, apiConfig, frame) {
        frame.response = {
            media_folders: [response.toJSON(frame.options)]
        };
    },

    editFolder(response, apiConfig, frame) {
        frame.response = {
            media_folders: [response.toJSON(frame.options)]
        };
    },

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
