const _ = require('lodash');
const getContextObject = require('./context_object.js');
const urlUtils = require('../../server/lib/url-utils');
const settingsCache = require('../../server/services/settings/cache');

function getOgImage(data) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);
    const siteOgImage = settingsCache.get('og_image');

    if (_.includes(context, 'post') || _.includes(context, 'page') || _.includes(context, 'amp')) {
        if (contextObject.og_image) {
            return urlUtils.urlFor('image', {image: contextObject.og_image}, true);
        } else if (contextObject.feature_image) {
            return urlUtils.urlFor('image', {image: contextObject.feature_image}, true);
        }
    }

    if (_.includes(context, 'home') && siteOgImage) {
        return urlUtils.urlFor('image', {image: siteOgImage}, true);
    }

    return null;
}

module.exports = getOgImage;
