const urlUtils = require('../../shared/url-utils');
const getContextObject = require('./context_object.js');
const _ = require('lodash');

function getCoverImage(data) {
    const context = data.context ? data.context : null;
    const contextObject = getContextObject(data, context);

    if (_.includes(context, 'home')) {
        if (contextObject.cover_image) {
            return urlUtils.urlFor('image', {image: contextObject.cover_image}, true);
        }
    } else if (_.includes(context, 'author')) {
        if (contextObject.profile_image) {
            return urlUtils.urlFor('image', {image: contextObject.profile_image}, true);
        }
    } else {
        if (contextObject.feature_image) {
            return urlUtils.urlFor('image', {image: contextObject.feature_image}, true);
        }
    }
    return null;
}

module.exports = getCoverImage;
