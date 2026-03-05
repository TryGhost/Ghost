const urlUtils = require('../../shared/url-utils');
const logging = require('@tryghost/logging');
const getContextObject = require('./context-object.js');
const _ = require('lodash');

function getAuthorImage(data, absolute) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    let result = null;
    if ((_.includes(context, 'post') || _.includes(context, 'page')) && contextObject.primary_author && contextObject.primary_author.profile_image) {
        result = urlUtils.urlFor('image', {image: contextObject.primary_author.profile_image}, absolute);
    }
    console.log('[IMAGE-CDN-TEST] getAuthorImage', {context, profileImage: contextObject?.primary_author?.profile_image, result});
    logging.info('[IMAGE-CDN-TEST] getAuthorImage', {context, profileImage: contextObject?.primary_author?.profile_image, result});
    return result;
}

module.exports = getAuthorImage;
