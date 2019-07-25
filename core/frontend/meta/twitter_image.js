const _ = require('lodash');
const urlUtils = require('../../server/lib/url-utils');
const getContextObject = require('./context_object.js');
const settingsCache = require('../../server/services/settings/cache');

function getTwitterImage(data) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);
    const siteTwitterImage = settingsCache.get('twitter_image');

    if (_.includes(context, 'post') || _.includes(context, 'page') || _.includes(context, 'amp')) {
        if (contextObject.twitter_image) {
            return urlUtils.urlFor('image', {image: contextObject.twitter_image}, true);
        } else if (contextObject.feature_image) {
            return urlUtils.urlFor('image', {image: contextObject.feature_image}, true);
        }
    }

    if (_.includes(context, 'home') && siteTwitterImage) {
        return urlUtils.urlFor('image', {image: siteTwitterImage}, true);
    }

    return null;
}

module.exports = getTwitterImage;
