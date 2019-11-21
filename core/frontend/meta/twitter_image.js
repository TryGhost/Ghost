const _ = require('lodash');
const urlUtils = require('../../server/lib/url-utils');
const getContextObject = require('./context_object.js');
const settingsCache = require('../../server/services/settings/cache');

function getTwitterImage(data) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context, false);

    if (_.includes(context, 'home')) {
        const imgUrl = settingsCache.get('twitter_image') || settingsCache.get('cover_image');
        return (imgUrl && urlUtils.relativeToAbsolute(imgUrl)) || null;
    }

    if (_.includes(context, 'post') || _.includes(context, 'page') || _.includes(context, 'amp')) {
        if (contextObject.twitter_image) {
            return urlUtils.relativeToAbsolute(contextObject.twitter_image);
        } else if (contextObject.feature_image) {
            return urlUtils.relativeToAbsolute(contextObject.feature_image);
        }
    }

    if (_.includes(context, 'author') && contextObject.cover_image) {
        return urlUtils.relativeToAbsolute(contextObject.cover_image);
    }

    if (_.includes(context, 'tag')) {
        if (contextObject.feature_image) {
            return urlUtils.relativeToAbsolute(contextObject.feature_image);
        } else if (settingsCache.get('cover_image')) {
            return urlUtils.relativeToAbsolute(settingsCache.get('cover_image'));
        }
    }

    return null;
}

module.exports = getTwitterImage;
