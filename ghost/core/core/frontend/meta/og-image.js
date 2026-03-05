const _ = require('lodash');
const logging = require('@tryghost/logging');
const getContextObject = require('./context-object.js');
const urlUtils = require('../../shared/url-utils');
const settingsCache = require('../../shared/settings-cache');

function getOgImage(data) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    let result = null;
    let source = 'none';

    if (_.includes(context, 'home')) {
        const imgUrl = settingsCache.get('og_image') || settingsCache.get('cover_image');
        result = (imgUrl && urlUtils.relativeToAbsolute(imgUrl)) || null;
        source = settingsCache.get('og_image') ? 'site_og_image' : 'site_cover_image';
    } else if (_.includes(context, 'post') || _.includes(context, 'page')) {
        if (contextObject.og_image) {
            result = urlUtils.relativeToAbsolute(contextObject.og_image);
            source = 'post_og_image';
        } else if (contextObject.feature_image) {
            result = urlUtils.relativeToAbsolute(contextObject.feature_image);
            source = 'post_feature_image';
        } else if (settingsCache.get('og_image')) {
            result = urlUtils.relativeToAbsolute(settingsCache.get('og_image'));
            source = 'site_og_image_fallback';
        } else if (settingsCache.get('cover_image')) {
            result = urlUtils.relativeToAbsolute(settingsCache.get('cover_image'));
            source = 'site_cover_image_fallback';
        }
    } else if (_.includes(context, 'author') && contextObject.cover_image) {
        result = urlUtils.relativeToAbsolute(contextObject.cover_image);
        source = 'author_cover_image';
    } else if (_.includes(context, 'tag')) {
        if (contextObject.og_image) {
            result = urlUtils.relativeToAbsolute(contextObject.og_image);
            source = 'tag_og_image';
        } else if (contextObject.feature_image) {
            result = urlUtils.relativeToAbsolute(contextObject.feature_image);
            source = 'tag_feature_image';
        } else if (settingsCache.get('cover_image')) {
            result = urlUtils.relativeToAbsolute(settingsCache.get('cover_image'));
            source = 'site_cover_image_fallback';
        }
    }

    console.log('[IMAGE-CDN-TEST] getOgImage', {context, source, result});
    logging.info('[IMAGE-CDN-TEST] getOgImage ' + JSON.stringify({context, source, result}));
    return result;
}

module.exports = getOgImage;
