const _ = require('lodash');
const logging = require('@tryghost/logging');
const urlUtils = require('../../shared/url-utils');
const getContextObject = require('./context-object.js');
const settingsCache = require('../../shared/settings-cache');

function getTwitterImage(data) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    let result = null;
    let source = 'none';

    if (_.includes(context, 'home')) {
        const imgUrl = settingsCache.get('twitter_image') || settingsCache.get('cover_image');
        result = (imgUrl && urlUtils.relativeToAbsolute(imgUrl)) || null;
        source = settingsCache.get('twitter_image') ? 'site_twitter_image' : 'site_cover_image';
    } else if (_.includes(context, 'post') || _.includes(context, 'page')) {
        if (contextObject.twitter_image) {
            result = urlUtils.relativeToAbsolute(contextObject.twitter_image);
            source = 'post_twitter_image';
        } else if (contextObject.feature_image) {
            result = urlUtils.relativeToAbsolute(contextObject.feature_image);
            source = 'post_feature_image';
        } else if (settingsCache.get('twitter_image')) {
            result = urlUtils.relativeToAbsolute(settingsCache.get('twitter_image'));
            source = 'site_twitter_image_fallback';
        } else if (settingsCache.get('cover_image')) {
            result = urlUtils.relativeToAbsolute(settingsCache.get('cover_image'));
            source = 'site_cover_image_fallback';
        }
    } else if (_.includes(context, 'author') && contextObject.cover_image) {
        result = urlUtils.relativeToAbsolute(contextObject.cover_image);
        source = 'author_cover_image';
    } else if (_.includes(context, 'tag')) {
        if (contextObject.twitter_image) {
            result = urlUtils.relativeToAbsolute(contextObject.twitter_image);
            source = 'tag_twitter_image';
        } else if (contextObject.feature_image) {
            result = urlUtils.relativeToAbsolute(contextObject.feature_image);
            source = 'tag_feature_image';
        } else if (settingsCache.get('cover_image')) {
            result = urlUtils.relativeToAbsolute(settingsCache.get('cover_image'));
            source = 'site_cover_image_fallback';
        }
    }

    console.log('[IMAGE-CDN-TEST] getTwitterImage', {context, source, result});
    logging.info('[IMAGE-CDN-TEST] getTwitterImage ' + JSON.stringify({context, source, result}));
    return result;
}

module.exports = getTwitterImage;
